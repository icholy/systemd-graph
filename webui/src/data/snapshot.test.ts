import { describe, it, expect } from 'vitest'
import snapshot from './snapshot.json'
import { parseGraph } from './graph'

const graph = parseGraph(snapshot)

describe('snapshot', () => {
  it('has units and edges', () => {
    expect(graph.units.length).toBeGreaterThan(0)
    expect(graph.edges.length).toBeGreaterThan(0)
  })

  it('every edge references known units', () => {
    const ids = new Set(graph.units.map((u) => u.id))
    for (const e of graph.edges) {
      expect(ids.has(e.from)).toBe(true)
      expect(ids.has(e.to)).toBe(true)
    }
  })

  it('includes both system and user units', () => {
    const scopes = new Set(graph.units.map((u) => u.scope))
    expect(scopes.has('system')).toBe(true)
    expect(scopes.has('user')).toBe(true)
  })
})
