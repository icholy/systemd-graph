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
	client, err := systemd.Connect()
	if err != nil {
		return err
	}
	defer client.Close()

	graph, err := client.Snapshot()
	if err != nil {
		return err
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
