import { useMemo, useState } from 'react'
import snapshot from './data/snapshot.json'
import { parseGraph } from './data/graph'
import { matchUnits, subgraphByNames } from './data/select'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { UnitList } from './components/UnitList'
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
  const graph = useMemo(() => {
    const matched = matchUnits(full.units, debouncedQuery)
    const names = new Set(matched.map((u) => u.name))
    return subgraphByNames(full, names)
  }, [full, debouncedQuery])

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
    </div>
  )
}

export default App
