package systemd

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/godbus/dbus/v5"
)

const propsIface = "org.freedesktop.DBus.Properties"

// debounceWindow coalesces bursts of signals into a single store update.
const debounceWindow = 300 * time.Millisecond

// Scope returns the client's scope label ("system" or "user").
func (c *Client) Scope() string {
	return c.scope
}

// Subscribe enables signal emission on the manager and returns a channel
// of raw D-Bus signals: manager lifecycle signals (UnitNew, UnitRemoved,
// Reloading, JobNew, JobRemoved) and per-unit PropertiesChanged.
func (c *Client) Subscribe() (<-chan *dbus.Signal, error) {
	mgr := c.conn.Object(busName, managerPath)
	if call := mgr.Call(managerIface+".Subscribe", 0); call.Err != nil {
		return nil, fmt.Errorf("subscribe: %w", call.Err)
	}

	// Manager lifecycle signals.
	if err := c.conn.AddMatchSignal(
		dbus.WithMatchObjectPath(managerPath),
		dbus.WithMatchInterface(managerIface),
	); err != nil {
		return nil, fmt.Errorf("match manager signals: %w", err)
	}

	// Per-unit property changes, restricted to signals from systemd.
	if err := c.conn.AddMatchSignal(
		dbus.WithMatchInterface(propsIface),
		dbus.WithMatchMember("PropertiesChanged"),
		dbus.WithMatchSender(busName),
	); err != nil {
		return nil, fmt.Errorf("match property signals: %w", err)
	}

	ch := make(chan *dbus.Signal, 1024)
	c.conn.Signal(ch)
	return ch, nil
}

// Run seeds store with this scope's units, then keeps it up to date from
// D-Bus signals until ctx is cancelled. It subscribes before seeding so
// events during the seed are buffered, not lost.
func (c *Client) Run(ctx context.Context, store *Store) error {
	ch, err := c.Subscribe()
	if err != nil {
		return err
	}

	listed, err := c.listUnits()
	if err != nil {
		return err
	}
	paths := make(map[dbus.ObjectPath]string, len(listed))
	seed := make([]UnitUpdate, 0, len(listed))
	for _, lu := range listed {
		u, edges, err := c.fetchUnit(lu.Name, lu.Path)
		if err != nil {
			continue
		}
		paths[lu.Path] = u.ID
		seed = append(seed, UnitUpdate{Unit: u, Edges: edges})
	}
	store.Apply(seed, nil)

	go c.watchLoop(ctx, store, paths, ch)
	return nil
}

func (c *Client) watchLoop(
	ctx context.Context,
	store *Store,
	paths map[dbus.ObjectPath]string,
	ch <-chan *dbus.Signal,
) {
	dirty := map[string]dbus.ObjectPath{}
	removed := map[string]bool{}
	var flush <-chan time.Time

	for {
		select {
		case <-ctx.Done():
			return
		case sig, ok := <-ch:
			if !ok {
				return
			}
			c.handleSignal(sig, paths, dirty, removed)
			if flush == nil && (len(dirty) > 0 || len(removed) > 0) {
				flush = time.After(debounceWindow)
			}
		case <-flush:
			flush = nil
			c.flushBatch(store, dirty, removed)
			clear(dirty)
			clear(removed)
		}
	}
}

// handleSignal records which units became dirty or removed; it does no
// D-Bus I/O so the signal channel keeps draining.
func (c *Client) handleSignal(
	sig *dbus.Signal,
	paths map[dbus.ObjectPath]string,
	dirty map[string]dbus.ObjectPath,
	removed map[string]bool,
) {
	switch {
	case strings.HasSuffix(sig.Name, ".UnitNew"):
		name, path, ok := unitNameAndPath(sig)
		if !ok {
			return
		}
		id := c.id(name)
		paths[path] = id
		delete(removed, id)
		dirty[id] = path
	case strings.HasSuffix(sig.Name, ".UnitRemoved"):
		name, path, ok := unitNameAndPath(sig)
		if !ok {
			return
		}
		id := c.id(name)
		delete(paths, path)
		delete(dirty, id)
		removed[id] = true
	case strings.HasSuffix(sig.Name, ".PropertiesChanged"):
		// Only the Unit interface carries ActiveState/SubState/deps.
		if len(sig.Body) < 1 {
			return
		}
		iface, _ := sig.Body[0].(string)
		if iface != unitIface {
			return
		}
		if id, ok := paths[sig.Path]; ok {
			dirty[id] = sig.Path
		}
	}
}

// flushBatch re-reads the dirty units and applies the batch to the store.
func (c *Client) flushBatch(
	store *Store,
	dirty map[string]dbus.ObjectPath,
	removed map[string]bool,
) {
	updates := make([]UnitUpdate, 0, len(dirty))
	rem := make([]string, 0, len(removed))
	for id := range removed {
		rem = append(rem, id)
	}
	for id, path := range dirty {
		u, edges, err := c.fetchUnit(c.unitName(id), path)
		if err != nil {
			// Vanished between the signal and the fetch; drop it.
			rem = append(rem, id)
			continue
		}
		updates = append(updates, UnitUpdate{Unit: u, Edges: edges})
	}
	store.Apply(updates, rem)
}

// fetchUnit reads a unit's state and dependencies via one GetAll and
// returns the Unit plus its (unfiltered) outgoing edges.
func (c *Client) fetchUnit(name string, path dbus.ObjectPath) (Unit, []Edge, error) {
	obj := c.conn.Object(busName, path)
	var props map[string]dbus.Variant
	if err := obj.Call(propsGetAll, 0, unitIface).Store(&props); err != nil {
		return Unit{}, nil, err
	}
	u := Unit{
		ID:          c.id(name),
		Name:        name,
		Scope:       c.scope,
		Type:        unitType(name),
		Description: variantString(props, "Description"),
		LoadState:   variantString(props, "LoadState"),
		ActiveState: variantString(props, "ActiveState"),
		SubState:    variantString(props, "SubState"),
	}
	var edges []Edge
	for _, depType := range forwardDeps {
		v, ok := props[depType]
		if !ok {
			continue
		}
		list, ok := v.Value().([]string)
		if !ok {
			continue
		}
		for _, to := range list {
			edges = append(edges, Edge{From: u.ID, To: c.id(to), Type: depType})
		}
	}
	return u, edges, nil
}

func (c *Client) unitName(id string) string {
	return strings.TrimPrefix(id, c.scope+"/")
}

func unitNameAndPath(sig *dbus.Signal) (string, dbus.ObjectPath, bool) {
	if len(sig.Body) < 2 {
		return "", "", false
	}
	name, ok := sig.Body[0].(string)
	if !ok {
		return "", "", false
	}
	path, ok := sig.Body[1].(dbus.ObjectPath)
	if !ok {
		return "", "", false
	}
	return name, path, true
}

func variantString(props map[string]dbus.Variant, key string) string {
	if v, ok := props[key]; ok {
		if s, ok := v.Value().(string); ok {
			return s
		}
	}
	return ""
}
