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
    const names = new Set(graph.units.map((u) => u.name))
    for (const e of graph.edges) {
      expect(names.has(e.from)).toBe(true)
      expect(names.has(e.to)).toBe(true)
    }
  })
})
