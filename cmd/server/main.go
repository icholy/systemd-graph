// Command server serves the embedded web UI and an on-demand JSON
// snapshot of the local systemd dependency graph.
package main

import (
	"compress/gzip"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/godbus/dbus/v5"

	"github.com/icholy/systemd-graph/internal/systemd"
	"github.com/icholy/systemd-graph/webui"
)

func main() {
	addr := flag.String("addr", ":8080", "listen address")
	watch := flag.Bool("watch", false, "log systemd D-Bus events to stderr")
	flag.Parse()

	if *watch {
		startWatch()
	}

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

// startWatch subscribes to the system and (best-effort) user managers and
// logs every signal, for exploring what events systemd emits.
func startWatch() {
	if sys, err := systemd.ConnectSystem(); err != nil {
		log.Printf("watch: system: %v", err)
	} else if err := watchClient(sys); err != nil {
		log.Printf("watch: system: %v", err)
	}
	if user, err := systemd.ConnectUser(); err != nil {
		log.Printf("watch: user: %v", err)
	} else if err := watchClient(user); err != nil {
		log.Printf("watch: user: %v", err)
	}
}

func watchClient(c *systemd.Client) error {
	ch, err := c.Subscribe()
	if err != nil {
		return err
	}
	go func() {
		for sig := range ch {
			logSignal(c.Scope(), sig)
		}
	}()
	return nil
}

func logSignal(scope string, sig *dbus.Signal) {
	member := sig.Name[strings.LastIndex(sig.Name, ".")+1:]
	if member == "PropertiesChanged" && len(sig.Body) >= 2 {
		iface, _ := sig.Body[0].(string)
		changed, _ := sig.Body[1].(map[string]dbus.Variant)
		parts := make([]string, 0, len(changed))
		for k, v := range changed {
			parts = append(parts, fmt.Sprintf("%s=%v", k, v.Value()))
		}
		log.Printf("[%s] PropertiesChanged %s %s {%s}", scope, sig.Path, iface, strings.Join(parts, ", "))
		return
	}
	log.Printf("[%s] %s %v", scope, member, sig.Body)
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
