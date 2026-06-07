package systemd

import (
	"sort"
	"sync"
)

// Store holds the merged unit graph (across scopes) and notifies
// subscribers when it changes. It is safe for concurrent use.
//
// Each unit owns its outgoing edges, which may reference units that
// aren't loaded; such dangling edges are dropped when serializing a
// Snapshot. This lets a unit appearing later light up its incoming edges
// without rescanning the units that point at it.
type Store struct {
	mu    sync.RWMutex
	units map[string]Unit
	out   map[string][]Edge
	gen   uint64

	subMu sync.Mutex
	subs  map[chan uint64]struct{}
}

func NewStore() *Store {
	return &Store{
		units: map[string]Unit{},
		out:   map[string][]Edge{},
		subs:  map[chan uint64]struct{}{},
	}
}

// UnitUpdate is an added or changed unit together with its outgoing edges.
type UnitUpdate struct {
	Unit  Unit
	Edges []Edge
}

// Apply upserts the given units (replacing each unit's outgoing edges),
// removes the given unit IDs, then bumps the generation and notifies
// subscribers once. Empty batches are ignored.
func (s *Store) Apply(updates []UnitUpdate, removed []string) {
	if len(updates) == 0 && len(removed) == 0 {
		return
	}
	s.mu.Lock()
	for _, u := range updates {
		s.units[u.Unit.ID] = u.Unit
		s.out[u.Unit.ID] = u.Edges
	}
	for _, id := range removed {
		delete(s.units, id)
		delete(s.out, id)
	}
	s.gen++
	gen := s.gen
	s.mu.Unlock()
	s.notify(gen)
}

// Snapshot returns a self-contained graph, dropping edges whose endpoints
// aren't both present.
func (s *Store) Snapshot() *Graph {
	s.mu.RLock()
	defer s.mu.RUnlock()
	g := &Graph{Units: make([]Unit, 0, len(s.units))}
	for _, u := range s.units {
		g.Units = append(g.Units, u)
	}
	for from, edges := range s.out {
		if _, ok := s.units[from]; !ok {
			continue
		}
		for _, e := range edges {
			if _, ok := s.units[e.To]; ok {
				g.Edges = append(g.Edges, e)
			}
		}
	}

	// Stable order: map iteration is randomized, so sort before returning
	// to keep the list and layout deterministic across requests.
	sort.Slice(g.Units, func(i, j int) bool {
		return g.Units[i].ID < g.Units[j].ID
	})
	sort.Slice(g.Edges, func(i, j int) bool {
		a, b := g.Edges[i], g.Edges[j]
		if a.From != b.From {
			return a.From < b.From
		}
		if a.To != b.To {
			return a.To < b.To
		}
		return a.Type < b.Type
	})
	return g
}

// Generation returns the current generation counter.
func (s *Store) Generation() uint64 {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.gen
}

// Subscribe returns a channel that receives the generation on each change
// and a function to unsubscribe. The channel is buffered and coalescing:
// if a notification is already pending it is dropped (the subscriber will
// read the latest state anyway).
func (s *Store) Subscribe() (<-chan uint64, func()) {
	ch := make(chan uint64, 1)
	s.subMu.Lock()
	s.subs[ch] = struct{}{}
	s.subMu.Unlock()
	cancel := func() {
		s.subMu.Lock()
		if _, ok := s.subs[ch]; ok {
			delete(s.subs, ch)
			close(ch)
		}
		s.subMu.Unlock()
	}
	return ch, cancel
}

func (s *Store) notify(gen uint64) {
	s.subMu.Lock()
	defer s.subMu.Unlock()
	for ch := range s.subs {
		select {
		case ch <- gen:
		default:
		}
	}
}
