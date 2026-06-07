import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { graph, sugiyama, type MutGraphNode } from 'd3-dag'
import type { Graph, Unit, Edge } from '../../data/types'
import type { GraphViewProps } from '../types'
import { nodeColor } from '../../data/select'

const NODE_W = 200
const NODE_H = 34
const FONT = 12

// Drop back-edges (edges that close a cycle) so the layout stays acyclic.
// Classic DFS edge classification over the adjacency built from graph.edges.
function acyclicEdges(units: Unit[], edges: Edge[]): Edge[] {
  const names = new Set(units.map((u) => u.name))
  const out = new Map<string, Edge[]>()
  for (const u of units) {
    out.set(u.name, [])
  }
  for (const e of edges) {
    if (!names.has(e.from) || !names.has(e.to)) {
      continue
    }
    const list = out.get(e.from)
    if (list) {
      list.push(e)
    }
  }

  const WHITE = 0
  const GRAY = 1
  const BLACK = 2
  const color = new Map<string, number>()
  for (const u of units) {
    color.set(u.name, WHITE)
  }

  const kept: Edge[] = []

  // Iterative DFS to avoid stack overflow on deep graphs.
  type Frame = { node: string; edges: Edge[]; i: number }
  for (const root of units) {
    if (color.get(root.name) !== WHITE) {
      continue
    }
    const stack: Frame[] = [
      { node: root.name, edges: out.get(root.name) ?? [], i: 0 },
    ]
    color.set(root.name, GRAY)
    while (stack.length > 0) {
      const top = stack[stack.length - 1]
      if (top.i >= top.edges.length) {
        color.set(top.node, BLACK)
        stack.pop()
        continue
      }
      const e = top.edges[top.i]
      top.i++
      const c = color.get(e.to)
      if (c === GRAY) {
        // Back-edge: closes a cycle, drop it.
        continue
      }
      kept.push(e)
      if (c === WHITE) {
        color.set(e.to, GRAY)
        stack.push({ node: e.to, edges: out.get(e.to) ?? [], i: 0 })
      }
    }
  }
  return kept
}

function isUnit(v: unknown): v is Unit {
  return typeof v === 'object' && v !== null && 'name' in v
}

export function D3View(props: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl) {
      return
    }

    const data: Graph = props.graph
    const builder = graph<Unit, Edge>()

    const nodes = new Map<string, MutGraphNode<Unit, Edge>>()
    for (const u of data.units) {
      nodes.set(u.name, builder.node(u))
    }
    for (const e of acyclicEdges(data.units, data.edges)) {
      const src = nodes.get(e.from)
      const tgt = nodes.get(e.to)
      if (src && tgt) {
        builder.link(src, tgt, e)
      }
    }

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()
    const root = svg.append('g')

    // Empty graph: nothing to lay out.
    if (builder.nnodes() === 0) {
      return
    }

    const layout = sugiyama().nodeSize([NODE_W, NODE_H]).gap([24, 48])
    const { width, height } = layout(builder)

    const line = d3
      .line<[number, number]>()
      .x((p) => p[0])
      .y((p) => p[1])
      .curve(d3.curveMonotoneY)

    // Edges.
    root
      .append('g')
      .attr('fill', 'none')
      .attr('stroke', '#484f58')
      .attr('stroke-width', 1.5)
      .selectAll('path')
      .data([...builder.links()])
      .join('path')
      .attr('d', (l) => line(l.points))
      .attr('marker-end', 'url(#d3-arrow)')

    // Arrow marker.
    const defs = svg.append('defs')
    defs
      .append('marker')
      .attr('id', 'd3-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#484f58')

    // Nodes.
    const node = root
      .append('g')
      .selectAll('g')
      .data([...builder.nodes()])
      .join('g')
      .attr('transform', (n) => `translate(${n.x},${n.y})`)

    node
      .append('rect')
      .attr('x', -NODE_W / 2)
      .attr('y', -NODE_H / 2)
      .attr('width', NODE_W)
      .attr('height', NODE_H)
      .attr('rx', 6)
      .attr('fill', (n) => (isUnit(n.data) ? nodeColor(n.data.activeState) : '#8b949e'))
      .attr('stroke', '#0d1117')
      .attr('stroke-width', 1)

    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-family', 'system-ui, sans-serif')
      .attr('font-size', FONT)
      .attr('fill', '#0d1117')
      .text((n) => (isUnit(n.data) ? n.data.name : ''))
      .each(function truncate() {
        const t = d3.select(this)
        const full = t.text()
        let s = full
        while (s.length > 4 && this.getComputedTextLength() > NODE_W - 16) {
          s = s.slice(0, -1)
          t.text(s + '...')
        }
      })

    // Pan/zoom + fit on mount.
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 4])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        root.attr('transform', event.transform.toString())
      })
    svg.call(zoom)

    const rect = svgEl.getBoundingClientRect()
    const vw = rect.width || 1
    const vh = rect.height || 1
    const pad = 40
    const scale = Math.min(
      (vw - pad) / Math.max(width, 1),
      (vh - pad) / Math.max(height, 1),
      1.5,
    )
    const tx = (vw - width * scale) / 2
    const ty = (vh - height * scale) / 2
    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(tx, ty).scale(scale),
    )

    return () => {
      svg.on('.zoom', null)
      svg.selectAll('*').remove()
    }
  }, [props.graph])

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '100%', display: 'block', background: '#0d1117' }}
    />
  )
}
