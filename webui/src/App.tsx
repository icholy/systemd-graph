import { useMemo, useState } from 'react'
import snapshot from './data/snapshot.json'
import { parseGraph } from './data/graph'
import {
  matchUnits,
  subgraphByNames,
  neighborhood,
  allEdgeTypes,
} from './data/select'
import type { EdgeType } from './data/types'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { UnitList } from './components/UnitList'
import { TypeFilter } from './components/TypeFilter'
import { DetailsPanel } from './components/DetailsPanel'
import { CytoscapeView } from './experiments/cytoscape/CytoscapeView'
import './App.css'

function toggleInSet<T>(
  setState: (updater: (prev: Set<T>) => Set<T>) => void,
  value: T,
) {
  setState((prev) => {
    const next = new Set(prev)
    if (next.has(value)) {
      next.delete(value)
    } else {
      next.add(value)
    }
    return next
  })
}

function App() {
  const full = useMemo(() => parseGraph(snapshot), [])

  const typeCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const u of full.units) {
      m.set(u.type, (m.get(u.type) ?? 0) + 1)
    }
    return m
  }, [full])
  const allTypes = useMemo(() => [...typeCounts.keys()].sort(), [typeCounts])

  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [unitTypes, setUnitTypes] = useState<Set<string>>(
    () => new Set(typeCounts.keys()),
  )
  // Outgoing (dependency) and incoming (dependent) edge types are toggled
  // independently, so e.g. "After" can be on for dependencies and off for
  // dependents.
  const [depTypes, setDepTypes] = useState<Set<EdgeType>>(
    () => new Set(allEdgeTypes),
  )
  const [dependentTypes, setDependentTypes] = useState<Set<EdgeType>>(
    () => new Set(allEdgeTypes),
  )
  const debouncedQuery = useDebouncedValue(query, 200)

  // List tracks the query immediately; the graph follows the debounced
  // query so typing stays smooth through the expensive relayout. Both are
  // restricted to the enabled unit types.
  const listed = useMemo(
    () =>
      matchUnits(full.units, query).filter((u) => unitTypes.has(u.type)),
    [full, query, unitTypes],
  )

  // A selection narrows the graph to that unit's neighborhood (relatives
  // of any type); otherwise it follows the (debounced) search and the
  // type filter.
  const graph = useMemo(() => {
    if (selected !== null) {
      return neighborhood(full, selected, depTypes, dependentTypes)
    }
    const matched = matchUnits(full.units, debouncedQuery).filter((u) =>
      unitTypes.has(u.type),
    )
    const names = new Set(matched.map((u) => u.name))
    return subgraphByNames(full, names)
  }, [full, selected, depTypes, dependentTypes, debouncedQuery, unitTypes])

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
        <TypeFilter
          types={allTypes}
          counts={typeCounts}
          enabled={unitTypes}
          onToggle={(type) => toggleInSet(setUnitTypes, type)}
        />
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
          depTypes={depTypes}
          dependentTypes={dependentTypes}
          onToggleDepType={(type) => toggleInSet(setDepTypes, type)}
          onToggleDependentType={(type) => toggleInSet(setDependentTypes, type)}
          onSelect={setSelected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  )
}

export default App
