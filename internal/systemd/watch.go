package systemd

import (
	"fmt"

	"github.com/godbus/dbus/v5"
)

const propsIface = "org.freedesktop.DBus.Properties"

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

	ch := make(chan *dbus.Signal, 256)
	c.conn.Signal(ch)
	return ch, nil
}
