package systemd

import (
	"fmt"
	"sort"
	"strings"

	"github.com/godbus/dbus/v5"
)

const (
	busName       = "org.freedesktop.systemd1"
	managerPath   = "/org/freedesktop/systemd1"
	managerIface  = "org.freedesktop.systemd1.Manager"
	unitIface     = "org.freedesktop.systemd1.Unit"
	propsGetAll   = "org.freedesktop.DBus.Properties.GetAll"
	listUnitsCall = managerIface + ".ListUnits"
)

// forwardDeps are the dependency properties we treat as directed edges
// out of a unit. We deliberately omit the reverse duals (RequiredBy,
// WantedBy, Before, ...) since the frontend can flip direction; emitting
// both just doubles the edge set.
var forwardDeps = []string{
	"Requires",
	"Requisite",
	"Wants",
	"BindsTo",
	"PartOf",
	"Upholds",
	"Conflicts",
	"After",
	"OnFailure",
	"OnSuccess",
}

// Client talks to a systemd manager (system or user) over D-Bus. scope
// is the label ("system" or "user") used to qualify unit IDs.
type Client struct {
	conn  *dbus.Conn
	scope string
}

// ConnectSystem dials the system bus (the system systemd manager).
func ConnectSystem() (*Client, error) {
	conn, err := dbus.SystemBus()
	if err != nil {
		return nil, fmt.Errorf("connecting to system bus: %w", err)
	}
	return &Client{conn: conn, scope: "system"}, nil
}

// ConnectUser dials the session bus (the per-user `systemd --user`
// manager).
func ConnectUser() (*Client, error) {
	conn, err := dbus.SessionBus()
	if err != nil {
		return nil, fmt.Errorf("connecting to session bus: %w", err)
	}
	return &Client{conn: conn, scope: "user"}, nil
}

// Close releases the underlying bus connection.
func (c *Client) Close() error {
	return c.conn.Close()
}

// listedUnit mirrors the struct returned by Manager.ListUnits.
type listedUnit struct {
	Name        string
	Description string
	LoadState   string
	ActiveState string
	SubState    string
	Followed    string
	Path        dbus.ObjectPath
	JobID       uint32
	JobType     string
	JobPath     dbus.ObjectPath
}

// Snapshot returns the current graph of loaded units and their
// dependency relationships.
func (c *Client) Snapshot() (*Graph, error) {
	listed, err := c.listUnits()
	if err != nil {
		return nil, err
	}

	// Only emit edges that point at units we actually know about, so the
	// graph is self-contained.
	known := make(map[string]bool, len(listed))
	for _, u := range listed {
		known[u.Name] = true
	}

	g := &Graph{}
	for _, u := range listed {
		g.Units = append(g.Units, Unit{
			ID:          c.id(u.Name),
			Name:        u.Name,
			Scope:       c.scope,
			Type:        unitType(u.Name),
			Description: u.Description,
			LoadState:   u.LoadState,
			ActiveState: u.ActiveState,
			SubState:    u.SubState,
		})

		deps, err := c.unitDeps(u.Path)
		if err != nil {
			return nil, fmt.Errorf("reading deps for %s: %w", u.Name, err)
		}
		for _, depType := range forwardDeps {
			for _, to := range deps[depType] {
				if !known[to] {
					continue
				}
				g.Edges = append(g.Edges, Edge{From: c.id(u.Name), To: c.id(to), Type: depType})
			}
		}
	}

	sort.Slice(g.Edges, func(i, j int) bool {
		a, b := g.Edges[i], g.Edges[j]
		if a.From != b.From {
			return a.From < b.From
		}
		if a.Type != b.Type {
			return a.Type < b.Type
		}
		return a.To < b.To
	})
	return g, nil
}

// id returns the scope-qualified unit ID (e.g. "system/foo.service").
func (c *Client) id(name string) string {
	return c.scope + "/" + name
}

func (c *Client) listUnits() ([]listedUnit, error) {
	mgr := c.conn.Object(busName, managerPath)
	var units []listedUnit
	if err := mgr.Call(listUnitsCall, 0).Store(&units); err != nil {
		return nil, fmt.Errorf("ListUnits: %w", err)
	}
	return units, nil
}

// unitDeps returns the dependency properties for a single unit, keyed by
// property name (e.g. "After" -> ["a.service", ...]).
func (c *Client) unitDeps(path dbus.ObjectPath) (map[string][]string, error) {
	obj := c.conn.Object(busName, path)
	var props map[string]dbus.Variant
	if err := obj.Call(propsGetAll, 0, unitIface).Store(&props); err != nil {
		return nil, err
	}
	deps := make(map[string][]string, len(forwardDeps))
	for _, name := range forwardDeps {
		v, ok := props[name]
		if !ok {
			continue
		}
		if list, ok := v.Value().([]string); ok {
			deps[name] = list
		}
	}
	return deps, nil
}

// unitType extracts the unit type from its name suffix
// (e.g. "ssh.service" -> "service").
func unitType(name string) string {
	if i := strings.LastIndex(name, "."); i >= 0 {
		return name[i+1:]
	}
	return ""
}
