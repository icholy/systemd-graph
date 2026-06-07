// Command dump writes a JSON snapshot of the local systemd unit
// dependency graph to stdout (or a file via -o), for frontend rendering
// experiments.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"

	"github.com/icholy/systemd-graph/internal/systemd"
)

func main() {
	out := flag.String("o", "", "output file (default stdout)")
	flag.Parse()

	if err := run(*out); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

func run(out string) error {
	sys, err := systemd.ConnectSystem()
	if err != nil {
		return err
	}
	defer sys.Close()

	graph, err := sys.Snapshot()
	if err != nil {
		return err
	}

	// User units are best-effort: a session bus may not exist (e.g. when
	// run headless or via sudo).
	if user, err := systemd.ConnectUser(); err != nil {
		fmt.Fprintln(os.Stderr, "warning: skipping user units:", err)
	} else {
		defer user.Close()
		if ug, err := user.Snapshot(); err != nil {
			fmt.Fprintln(os.Stderr, "warning: reading user units:", err)
		} else {
			graph.Units = append(graph.Units, ug.Units...)
			graph.Edges = append(graph.Edges, ug.Edges...)
		}
	}

	w := os.Stdout
	if out != "" {
		f, err := os.Create(out)
		if err != nil {
			return err
		}
		defer f.Close()
		w = f
	}

	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	return enc.Encode(graph)
}
