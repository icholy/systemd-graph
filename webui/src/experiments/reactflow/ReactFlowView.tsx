import { useMemo } from 'react'
import { ReactFlow, Background, Controls } from '@xyflow/react'
import type { Node, Edge as FlowEdge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import type { GraphViewProps } from '../types'
import { nodeColor } from '../../data/select'

const NODE_W = 160
const NODE_H = 36

type Layout = {
  nodes: Node[]
  edges: FlowEdge[]
}

function computeLayout(props: GraphViewProps): Layout {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 24, ranksep: 60 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const u of props.graph.units) {
    g.setNode(u.name, { width: NODE_W, height: NODE_H })
  }
  for (const e of props.graph.edges) {
    g.setEdge(e.from, e.to)
  }

  // dagre tolerates cycles; no guard needed.
  dagre.layout(g)

  const nodes: Node[] = props.graph.units.map((u) => {
    const pos = g.node(u.name)
    // dagre gives centers; React Flow wants top-left.
    return {
      id: u.name,
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
      data: { label: u.name },
      style: {
        background: nodeColor(u.activeState),
        width: NODE_W,
        height: NODE_H,
        color: '#0d1117',
        fontSize: 11,
        borderRadius: 6,
        border: '1px solid rgba(0,0,0,0.3)',
      },
    }
  })

  const edges: FlowEdge[] = props.graph.edges.map((e, i) => ({
    id: `${e.from}->${e.to}#${i}`,
    source: e.from,
    target: e.to,
  }))

  return { nodes, edges }
}

export function ReactFlowView(props: GraphViewProps) {
  const { nodes, edges } = useMemo(() => computeLayout(props), [props])
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
