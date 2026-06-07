import type { Graph, Unit, Edge, EdgeType } from './types'

const edgeTypes: readonly EdgeType[] = [
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

const edgeTypeSet: ReadonlySet<string> = new Set(edgeTypes)

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function isEdgeType(v: string): v is EdgeType {
  return edgeTypeSet.has(v)
}

function str(rec: Record<string, unknown>, key: string, ctx: string): string {
  const v = rec[key]
  if (typeof v !== 'string') {
    throw new Error(`${ctx}: expected string field "${key}"`)
  }
  return v
}

function parseUnit(raw: unknown, i: number): Unit {
  if (!isRecord(raw)) {
    throw new Error(`units[${i}]: expected object`)
  }
  const ctx = `units[${i}]`
  return {
    id: str(raw, 'id', ctx),
    name: str(raw, 'name', ctx),
    scope: str(raw, 'scope', ctx),
    type: str(raw, 'type', ctx),
    description: str(raw, 'description', ctx),
    loadState: str(raw, 'loadState', ctx),
    activeState: str(raw, 'activeState', ctx),
    subState: str(raw, 'subState', ctx),
  }
}

function parseEdge(raw: unknown, i: number): Edge {
  if (!isRecord(raw)) {
    throw new Error(`edges[${i}]: expected object`)
  }
  const ctx = `edges[${i}]`
  const type = str(raw, 'type', ctx)
  if (!isEdgeType(type)) {
    throw new Error(`${ctx}: unknown edge type "${type}"`)
  }
  return {
    from: str(raw, 'from', ctx),
    to: str(raw, 'to', ctx),
    type,
  }
}

// parseGraph validates an untrusted value (a parsed JSON snapshot, or a
// message off the websocket) and returns a typed Graph, throwing on any
// structural mismatch.
export function parseGraph(raw: unknown): Graph {
  if (!isRecord(raw)) {
    throw new Error('graph: expected object')
  }
  const { units, edges } = raw
  if (!Array.isArray(units)) {
    throw new Error('graph: "units" must be an array')
  }
  if (!Array.isArray(edges)) {
    throw new Error('graph: "edges" must be an array')
  }
  return {
    units: units.map(parseUnit),
    edges: edges.map(parseEdge),
  }
}
