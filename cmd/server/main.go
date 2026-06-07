// Command server serves the embedded web UI plus a JSON snapshot of the
// local systemd dependency graph and an SSE stream of change
// notifications. The graph is kept up to date incrementally from D-Bus
// signals.
package main

import (
	"compress/gzip"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/icholy/systemd-graph/internal/systemd"
	"github.com/icholy/systemd-graph/webui"
)

func main() {
	addr := flag.String("addr", ":8080", "listen address")
	flag.Parse()

	store := systemd.NewStore()
	ctx := context.Background()
	clients := map[string]*systemd.Client{}

	if sys, err := systemd.ConnectSystem(); err != nil {
		log.Fatalf("system bus: %v", err)
	} else if err := sys.Run(ctx, store); err != nil {
		log.Fatalf("system watch: %v", err)
	} else {
		clients["system"] = sys
	}
	if user, err := systemd.ConnectUser(); err != nil {
		log.Printf("skipping user units: %v", err)
	} else if err := user.Run(ctx, store); err != nil {
		log.Printf("user watch: %v", err)
	} else {
		clients["user"] = user
	}

	dist, err := webui.Dist()
	if err != nil {
		log.Fatal(err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/snapshot", snapshotHandler(store))
	mux.HandleFunc("GET /api/events", eventsHandler(store))
	mux.HandleFunc("GET /api/unit/{scope}/{name}", unitHandler(clients))
	mux.Handle("GET /", http.FileServerFS(dist))

	log.Printf("listening on %s", *addr)
	if err := http.ListenAndServe(*addr, mux); err != nil {
		log.Fatal(err)
	}
}

// snapshotHandler serves the cached graph, gzipping when the client
// accepts it.
func snapshotHandler(store *systemd.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		graph := store.Snapshot()
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
}

// unitHandler returns rich, live details for a single unit.
func unitHandler(clients map[string]*systemd.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		client, ok := clients[r.PathValue("scope")]
		if !ok {
			http.NotFound(w, r)
			return
		}
		details, err := client.Details(r.PathValue("name"))
		if err != nil {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(details); err != nil {
			log.Printf("encoding details: %v", err)
		}
	}
}

// eventsHandler streams the store generation over SSE; the client
// re-fetches the snapshot whenever it changes.
func eventsHandler(store *systemd.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "streaming unsupported", http.StatusInternalServerError)
			return
		}
		h := w.Header()
		h.Set("Content-Type", "text/event-stream")
		h.Set("Cache-Control", "no-cache")
		h.Set("Connection", "keep-alive")

		ch, cancel := store.Subscribe()
		defer cancel()

		// Send the current generation immediately so a fresh connection syncs.
		fmt.Fprintf(w, "data: %d\n\n", store.Generation())
		flusher.Flush()

		ticker := time.NewTicker(25 * time.Second)
		defer ticker.Stop()
		ctx := r.Context()
		for {
			select {
			case <-ctx.Done():
				return
			case gen, ok := <-ch:
				if !ok {
					return
				}
				fmt.Fprintf(w, "data: %d\n\n", gen)
				flusher.Flush()
			case <-ticker.C:
				fmt.Fprint(w, ": ping\n\n")
				flusher.Flush()
			}
		}
	}
}
