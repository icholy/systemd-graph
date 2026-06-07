import type { Graph, EdgeType } from './types'

// Default view: the units people actually reason about, with requirement
// edges only. Ordering (After) and Conflicts are excluded by default
// because they turn the graph into a hairball (see README scale notes).
export const defaultUnitTypes: ReadonlySet<string> = new Set([
  'service',
  'target',
  'socket',
])

export const defaultEdgeTypes: ReadonlySet<EdgeType> = new Set<EdgeType>([
  'Requires',
  'Requisite',
  'Wants',
  'BindsTo',
  'PartOf',
])

export type FilterOptions = {
  unitTypes?: ReadonlySet<string>
  edgeTypes?: ReadonlySet<EdgeType>
}

// filterGraph returns a self-contained subgraph: only the kept unit types,
// and only edges of the kept types whose endpoints both survive.
export function filterGraph(graph: Graph, opts: FilterOptions = {}): Graph {
  const unitTypes = opts.unitTypes ?? defaultUnitTypes
  const edgeTypes = opts.edgeTypes ?? defaultEdgeTypes

  const units = graph.units.filter((u) => unitTypes.has(u.type))
  const kept = new Set(units.map((u) => u.name))
  const edges = graph.edges.filter(
    (e) => edgeTypes.has(e.type) && kept.has(e.from) && kept.has(e.to),
  )
  return { units, edges }
}

// nodeColor maps a unit's activeState to a fill color, shared across all
// rendering experiments so they're visually comparable.
export function nodeColor(activeState: string): string {
  switch (activeState) {
    case 'active':
      return '#3fb950' // green
    case 'activating':
      return '#d29922' // amber
    case 'deactivating':
      return '#db6d28' // orange
    case 'failed':
      return '#f85149' // red
    case 'inactive':
      return '#6e7681' // gray
    default:
      return '#8b949e' // unknown / other
  }
}
