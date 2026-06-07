import { useEffect, useRef } from 'react'
import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'
import type { DagreLayoutOptions } from 'cytoscape-dagre'
import type { GraphViewProps } from '../types'
import { nodeColor } from '../../data/select'

cytoscape.use(dagre)

export function CytoscapeView(props: GraphViewProps) {
  const { graph } = props
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (container === null) {
      return
    }

    const nodes: cytoscape.ElementDefinition[] = graph.units.map((unit) => ({
      group: 'nodes',
      data: {
        id: unit.name,
        label: unit.name,
        color: nodeColor(unit.activeState),
      },
    }))

    const edges: cytoscape.ElementDefinition[] = graph.edges.map((edge) => ({
      group: 'edges',
      data: {
        id: `${edge.from}->${edge.to}:${edge.type}`,
        source: edge.from,
        target: edge.to,
      },
    }))

    const cy = cytoscape({
      container,
      elements: [...nodes, ...edges],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            label: 'data(label)',
            color: '#c9d1d9',
            'font-size': 10,
            'text-valign': 'center',
            'text-halign': 'right',
            'text-margin-x': 4,
            width: 14,
            height: 14,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1,
            'line-color': '#484f58',
            'target-arrow-color': '#484f58',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
          },
        },
      ],
    })

    const layout: DagreLayoutOptions = {
      name: 'dagre',
      rankDir: 'LR',
      fit: true,
    }
    cy.layout(layout).run()

    return () => {
      cy.destroy()
    }
  }, [graph])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
