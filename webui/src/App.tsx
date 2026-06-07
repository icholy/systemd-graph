import { useMemo, useState } from 'react'
import snapshot from './data/snapshot.json'
import { parseGraph } from './data/graph'
import { matchUnits, subgraphByNames, neighborhood } from './data/select'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { UnitList } from './components/UnitList'
import { DetailsPanel } from './components/DetailsPanel'
import { CytoscapeView } from './experiments/cytoscape/CytoscapeView'
import './App.css'

function App() {
  const full = useMemo(() => parseGraph(snapshot), [])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const debouncedQuery = useDebouncedValue(query, 200)

  // List tracks the query immediately; the graph follows the debounced
  // query so typing stays smooth through the expensive relayout.
  const listed = useMemo(() => matchUnits(full.units, query), [full, query])

  // A selection narrows the graph to that unit's neighborhood; otherwise
  // it follows the (debounced) search.
  const graph = useMemo(() => {
    if (selected !== null) {
      return neighborhood(full, selected)
    }
    const matched = matchUnits(full.units, debouncedQuery)
    const names = new Set(matched.map((u) => u.name))
    return subgraphByNames(full, names)
  }, [full, selected, debouncedQuery])

  // Details come from the full graph so they stay complete even when the
  // view is filtered down.
  const selectedUnit = useMemo(
    () =>
      selected === null
        ? null
        : (full.units.find((u) => u.name === selected) ?? null),
    [full, selected],
  )
  const outgoing = useMemo(
    () => (selected === null ? [] : full.edges.filter((e) => e.from === selected)),
    [full, selected],
  )
  const incoming = useMemo(
    () => (selected === null ? [] : full.edges.filter((e) => e.to === selected)),
    [full, selected],
  )

  return (
    <div className="app">
      <aside className="sidebar">
        <input
          className="search"
          type="text"
          placeholder="Filter units..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="list-meta">
          {listed.length} / {full.units.length} units
        </div>
        <UnitList units={listed} selected={selected} onSelect={setSelected} />
      </aside>
      <main className="canvas">
        <CytoscapeView graph={graph} selected={selected} onSelect={setSelected} />
      </main>
      {selectedUnit !== null ? (
        <DetailsPanel
          unit={selectedUnit}
          outgoing={outgoing}
          incoming={incoming}
          onSelect={setSelected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  )
}

export default App
