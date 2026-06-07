package systemd

import (
	"math"
	"strings"

	"github.com/godbus/dbus/v5"
)

const serviceIface = "org.freedesktop.systemd1.Service"

// UnitDetails is the richer, on-demand view of a single unit, fetched
// live from the manager (kept out of the snapshot to avoid bloat/churn).
type UnitDetails struct {
	FragmentPath    string   `json:"fragmentPath,omitempty"`
	Documentation   []string `json:"documentation,omitempty"`
	ActiveEnterUSec uint64   `json:"activeEnterUSec,omitempty"`
	Triggers        []string `json:"triggers,omitempty"`
	TriggeredBy     []string `json:"triggeredBy,omitempty"`

	// Service-specific; zero/empty for other unit types.
	MainPID       uint32 `json:"mainPID,omitempty"`
	ExecStart     string `json:"execStart,omitempty"`
	MemoryCurrent uint64 `json:"memoryCurrent,omitempty"`
	CPUUsageNSec  uint64 `json:"cpuUsageNSec,omitempty"`
	NRestarts     uint32 `json:"nRestarts,omitempty"`
	Result        string `json:"result,omitempty"`
}

// Details fetches the rich properties for a loaded unit by name.
func (c *Client) Details(name string) (*UnitDetails, error) {
	mgr := c.conn.Object(busName, managerPath)
	var path dbus.ObjectPath
	if err := mgr.Call(managerIface+".GetUnit", 0, name).Store(&path); err != nil {
		return nil, err
	}

	obj := c.conn.Object(busName, path)
	var unit map[string]dbus.Variant
	if err := obj.Call(propsGetAll, 0, unitIface).Store(&unit); err != nil {
		return nil, err
	}

	d := &UnitDetails{
		FragmentPath:    variantString(unit, "FragmentPath"),
		Documentation:   variantStrings(unit, "Documentation"),
		ActiveEnterUSec: variantUint64(unit, "ActiveEnterTimestamp"),
		Triggers:        variantStrings(unit, "Triggers"),
		TriggeredBy:     variantStrings(unit, "TriggeredBy"),
	}

	if unitType(name) == "service" {
		var svc map[string]dbus.Variant
		if err := obj.Call(propsGetAll, 0, serviceIface).Store(&svc); err == nil {
			d.MainPID = variantUint32(svc, "MainPID")
			d.ExecStart = execStartCmd(svc)
			d.MemoryCurrent = sanitizeUnset(variantUint64(svc, "MemoryCurrent"))
			d.CPUUsageNSec = sanitizeUnset(variantUint64(svc, "CPUUsageNSec"))
			d.NRestarts = variantUint32(svc, "NRestarts")
			d.Result = variantString(svc, "Result")
		}
	}
	return d, nil
}

// execStartCmd extracts the argv of the first ExecStart= command. The
// property signature is a(sasbttttuii): [path, argv, ...].
func execStartCmd(props map[string]dbus.Variant) string {
	v, ok := props["ExecStart"]
	if !ok {
		return ""
	}
	entries, ok := v.Value().([][]any)
	if !ok || len(entries) == 0 || len(entries[0]) < 2 {
		return ""
	}
	argv, ok := entries[0][1].([]string)
	if !ok {
		return ""
	}
	return strings.Join(argv, " ")
}

// sanitizeUnset maps systemd's "not set" sentinel (uint64 max) to 0.
func sanitizeUnset(v uint64) uint64 {
	if v == math.MaxUint64 {
		return 0
	}
	return v
}

func variantStrings(props map[string]dbus.Variant, key string) []string {
	if v, ok := props[key]; ok {
		if s, ok := v.Value().([]string); ok {
			return s
		}
	}
	return nil
}

func variantUint64(props map[string]dbus.Variant, key string) uint64 {
	if v, ok := props[key]; ok {
		if n, ok := v.Value().(uint64); ok {
			return n
		}
	}
	return 0
}

func variantUint32(props map[string]dbus.Variant, key string) uint32 {
	if v, ok := props[key]; ok {
		if n, ok := v.Value().(uint32); ok {
			return n
		}
	}
	return 0
}
