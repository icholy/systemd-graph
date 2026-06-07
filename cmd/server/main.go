// Command server serves the embedded web UI and an on-demand JSON
// snapshot of the local systemd dependency graph.
package main

import (
	"compress/gzip"
	"encoding/json"
	"flag"
	"io"
	"log"
	"net/http"
	"strings"

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

// handleSnapshot computes a fresh snapshot on each request, gzipping the
// (large) JSON response when the client accepts it.
func handleSnapshot(w http.ResponseWriter, r *http.Request) {
	graph, err := systemd.Collect()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	var out io.Writer = w
	if strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
		w.Header().Set("Content-Encoding", "gzip")
		gz := gzip.NewWriter(w)
		defer gz.Close()
		out = gz
	}

	if err := json.NewEncoder(out).Encode(graph); err != nil {
		log.Printf("encoding snapshot: %v", err)
	}
}
