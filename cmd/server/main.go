// Command server serves the embedded web UI and an on-demand JSON
// snapshot of the local systemd dependency graph.
package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"

	"github.com/icholy/systemd-graph/internal/systemd"
	"github.com/icholy/systemd-graph/webui"
)

func main() {
	addr := flag.String("addr", ":8080", "listen address")
	flag.Parse()

	dist, err := webui.Dist()
	if err != nil {
		log.Fatal(err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/snapshot", handleSnapshot)
	mux.Handle("GET /", http.FileServerFS(dist))

	log.Printf("listening on %s", *addr)
	if err := http.ListenAndServe(*addr, mux); err != nil {
		log.Fatal(err)
	}
}

// handleSnapshot computes a fresh snapshot on each request.
func handleSnapshot(w http.ResponseWriter, _ *http.Request) {
	graph, err := systemd.Collect()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(graph); err != nil {
		log.Printf("encoding snapshot: %v", err)
	}
}
