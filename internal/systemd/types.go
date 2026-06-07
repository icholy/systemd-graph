package systemd

// Graph is a snapshot of loaded systemd units and the dependency
// relationships between them.
type Graph struct {
	Units []Unit `json:"units"`
	Edges []Edge `json:"edges"`
}

// Unit is a single loaded systemd unit. ID is scope-qualified
// ("system/foo.service") so system and user units with the same name
// don't collide; Name is the plain unit name for display.
type Unit struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Scope       string `json:"scope"`
	Type        string `json:"type"`
	Description string `json:"description"`
	LoadState   string `json:"loadState"`
	ActiveState string `json:"activeState"`
	SubState    string `json:"subState"`
}

// Edge is a directed dependency from one unit to another, referencing
// scope-qualified unit IDs. Type is the systemd relationship name
// (e.g. "After", "Requires", "Wants").
type Edge struct {
	From string `json:"from"`
	To   string `json:"to"`
	Type string `json:"type"`
}
