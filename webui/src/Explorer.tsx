import { useMemo, useState } from 'react'
import {
  matchUnits,
  subgraphByIds,
  neighborhood,
  allEdgeTypes,
  displayName,
} from './data/select'
import type { EdgeType, Graph, Unit } from './data/types'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { useUrlParam } from './hooks/useUrlParam'
import { UnitList } from './components/UnitList'
import { TypeFilter } from './components/TypeFilter'
import { ScopeFilter } from './components/ScopeFilter'
import { DetailsPanel } from './components/DetailsPanel'
import { GraphView } from './components/GraphView'

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

function removeFromSet<T>(
  setState: (updater: (prev: Set<T>) => Set<T>) => void,
  values: T[],
) {
  setState((prev) => {
    const next = new Set(prev)
    for (const v of values) {
      next.delete(v)
    }
    return next
  })
}

function addToSet<T>(
  setState: (updater: (prev: Set<T>) => Set<T>) => void,
  values: T[],
) {
  setState((prev) => {
    const next = new Set(prev)
    for (const v of values) {
      next.add(v)
    }
    return next
  })
}

type ExplorerProps = {
  full: Graph
  refreshing: boolean
  onRefresh: () => void
}

export function Explorer({ full, refreshing, onRefresh }: ExplorerProps) {
  const typeCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const u of full.units) {
      m.set(u.type, (m.get(u.type) ?? 0) + 1)
    }
    return m
  }, [full])
  const allTypes = useMemo(() => [...typeCounts.keys()].sort(), [typeCounts])

  const scopeCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const u of full.units) {
      m.set(u.scope, (m.get(u.scope) ?? 0) + 1)
    }
    return m
  }, [full])
  const allScopes = useMemo(() => [...scopeCounts.keys()].sort(), [scopeCounts])

  const unitsById = useMemo(() => {
    const m = new Map<string, Unit>()
    for (const u of full.units) {
      m.set(u.id, u)
    }
    return m
  }, [full])

  const [query, setQuery] = useState('')
  const [selected, setSelected] = useUrlParam('unit')
  const [unitTypes, setUnitTypes] = useState<Set<string>>(
    () => new Set(typeCounts.keys()),
  )
  const [scopes, setScopes] = useState<Set<string>>(
    () => new Set(scopeCounts.keys()),
  )
  const [nodeLimit, setNodeLimit] = useState(500)
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
      matchUnits(full.units, query).filter(
        (u) => unitTypes.has(u.type) && scopes.has(u.scope),
      ),
    [full, query, unitTypes, scopes],
  )

  // A selection narrows the graph to that unit's neighborhood (relatives
  // of any type); otherwise it follows the (debounced) search and the
  // type/scope filters.
  const graph = useMemo(() => {
    if (selected !== null) {
      return neighborhood(full, selected, depTypes, dependentTypes)
    }
    const matched = matchUnits(full.units, debouncedQuery).filter(
      (u) => unitTypes.has(u.type) && scopes.has(u.scope),
    )
    const ids = new Set(matched.map((u) => u.id))
    return subgraphByIds(full, ids)
  }, [
    full,
    selected,
    depTypes,
    dependentTypes,
    debouncedQuery,
    unitTypes,
    scopes,
  ])

  // Identifies the user-chosen view; when it's unchanged across a graph
  // change, the graph rebuild is a background refresh and the viewport is
  // preserved instead of refit.
  const fitKey = useMemo(
    () =>
      JSON.stringify({
        selected,
        query: debouncedQuery,
        unitTypes: [...unitTypes].sort(),
        scopes: [...scopes].sort(),
        depTypes: [...depTypes].sort(),
        dependentTypes: [...dependentTypes].sort(),
      }),
    [selected, debouncedQuery, unitTypes, scopes, depTypes, dependentTypes],
  )

  // Details come from the full graph so they stay complete even when the
  // view is filtered down.
  const selectedUnit = useMemo(
    () => (selected === null ? null : (unitsById.get(selected) ?? null)),
    [unitsById, selected],
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
        <div className="sidebar-header">
          <span className="app-title">systemd-graph</span>
          <button
            type="button"
            className="refresh-btn"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <ScopeFilter
          scopes={allScopes}
          counts={scopeCounts}
          enabled={scopes}
          onToggle={(scope) => toggleInSet(setScopes, scope)}
          onAll={() => setScopes(new Set(allScopes))}
          onClear={() => setScopes(new Set())}
        />
        <TypeFilter
          types={allTypes}
          counts={typeCounts}
          enabled={unitTypes}
          onToggle={(type) => toggleInSet(setUnitTypes, type)}
          onAll={() => setUnitTypes(new Set(allTypes))}
          onClear={() => setUnitTypes(new Set())}
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
        <div className="node-limit">
          <label htmlFor="node-limit">Max graph nodes: {nodeLimit}</label>
          <input
            id="node-limit"
            type="range"
            min={100}
            max={3000}
            step={100}
            value={nodeLimit}
            onChange={(e) => setNodeLimit(Number(e.target.value))}
          />
        </div>
      </aside>
      <main className="canvas">
        <GraphView
          graph={graph}
          nodeLimit={nodeLimit}
          fitKey={fitKey}
          selected={selected}
          onSelect={setSelected}
        />
      </main>
      {selectedUnit !== null ? (
        <DetailsPanel
          unit={selectedUnit}
          outgoing={outgoing}
          incoming={incoming}
          depTypes={depTypes}
          dependentTypes={dependentTypes}
          resolveName={(id) => {
            const u = unitsById.get(id)
            return u ? displayName(u) : id
          }}
          onToggleDepType={(type) => toggleInSet(setDepTypes, type)}
          onToggleDependentType={(type) => toggleInSet(setDependentTypes, type)}
          onAllDepTypes={(types) => addToSet(setDepTypes, types)}
          onAllDependentTypes={(types) => addToSet(setDependentTypes, types)}
          onClearDepTypes={(types) => removeFromSet(setDepTypes, types)}
          onClearDependentTypes={(types) => removeFromSet(setDependentTypes, types)}
          onSelect={setSelected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  )
}
