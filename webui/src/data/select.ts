import type { Graph, Unit, Edge, EdgeType } from './types'

// Default view: the units people actually reason about, with requirement
// edges only. Ordering (After) and Conflicts are excluded by default
// because they turn the graph into a hairball (see README scale notes).
export const defaultUnitTypes: ReadonlySet<string> = new Set([
  'service',
  'target',
  'socket',
])

export const allEdgeTypes: readonly EdgeType[] = [
  'Requires',
  'Requisite',
  'Wants',
  'BindsTo',
  'PartOf',
  'Upholds',
  'Conflicts',
  'After',
  'OnFailure',
  'OnSuccess',
]

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

// matchUnits returns the units whose name contains the query
// (case-insensitive). An empty query matches everything.
export function matchUnits(units: Unit[], query: string): Unit[] {
  const q = query.trim().toLowerCase()
  if (q === '') {
    return units
  }
  return units.filter((u) => u.name.toLowerCase().includes(q))
}

// subgraphByNames keeps only the named units and the edges (of the given
// types) that run between two kept units.
export function subgraphByNames(
  graph: Graph,
  names: ReadonlySet<string>,
  edgeTypes: ReadonlySet<EdgeType> = defaultEdgeTypes,
): Graph {
  const units = graph.units.filter((u) => names.has(u.name))
  const edges = graph.edges.filter(
    (e) => edgeTypes.has(e.type) && names.has(e.from) && names.has(e.to),
  )
  return { units, edges }
}

// neighborhood returns the named unit plus its directly connected
// relatives: dependencies reached by an enabled outgoing edge type, and
// dependents reached by an enabled incoming edge type. Only the edges
// incident to the named unit (and enabled) are drawn, so each edge
// corresponds to one of the panel toggles.
export function neighborhood(
  graph: Graph,
  name: string,
  outTypes: ReadonlySet<EdgeType> = new Set(allEdgeTypes),
  inTypes: ReadonlySet<EdgeType> = new Set(allEdgeTypes),
): Graph {
  const names = new Set<string>([name])
  const edges: Edge[] = []
  for (const e of graph.edges) {
    if (e.from === name && outTypes.has(e.type)) {
      names.add(e.to)
      edges.push(e)
    }
    if (e.to === name && inTypes.has(e.type)) {
      names.add(e.from)
      edges.push(e)
    }
  }
  const units = graph.units.filter((u) => names.has(u.name))
  return { units, edges }
}

// unitLabel is the short, in-graph label. Device units have long,
// machine-generated path names, so we prefer their description (or the
// trailing path segment) and keep the full name for tooltips.
export function unitLabel(unit: Unit): string {
  if (unit.type !== 'device') {
    return unit.name
  }
  if (unit.description !== '') {
    return unit.description
  }
  const base = unit.name.replace(/\.device$/, '')
  const parts = base.split('-')
  return `${parts[parts.length - 1]}.device`
}

// nodeShape maps a unit type to a cytoscape node shape so types are
// distinguishable at a glance (color stays reserved for active state).
export function nodeShape(type: string): string {
  switch (type) {
    case 'service':
      return 'ellipse'
    case 'target':
      return 'round-rectangle'
    case 'socket':
      return 'tag'
    case 'device':
      return 'diamond'
    case 'mount':
      return 'hexagon'
    case 'automount':
      return 'hexagon'
    case 'swap':
      return 'rhomboid'
    case 'timer':
      return 'star'
    case 'path':
      return 'vee'
    case 'slice':
      return 'barrel'
    case 'scope':
      return 'pentagon'
    default:
      return 'ellipse'
  }
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
