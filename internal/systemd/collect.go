package systemd

// Collect builds a snapshot of the system systemd manager plus, on a
// best-effort basis, the per-user manager, merged into a single graph
// with scope-qualified IDs.
func Collect() (*Graph, error) {
	sys, err := ConnectSystem()
	if err != nil {
		return nil, err
	}
	defer sys.Close()

	graph, err := sys.Snapshot()
	if err != nil {
		return nil, err
	}

	// User units are best-effort: a session bus may not exist (headless,
	// sudo, etc.), in which case we just return the system graph.
	if user, err := ConnectUser(); err == nil {
		defer user.Close()
		if ug, err := user.Snapshot(); err == nil {
			graph.Units = append(graph.Units, ug.Units...)
			graph.Edges = append(graph.Edges, ug.Edges...)
		}
	}

	return graph, nil
}
