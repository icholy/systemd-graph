import { useEffect, useRef } from 'react'
import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'
import type { DagreLayoutOptions } from 'cytoscape-dagre'
import type { GraphViewProps } from '../types'
import { nodeColor } from '../../data/select'

cytoscape.use(dagre)

export function CytoscapeView(props: GraphViewProps) {
  const { graph, selected } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const lastFocusRef = useRef<string | null>(null)

  // Keep the latest onSelect reachable from the tap handler without
  // rebuilding the graph when it changes identity.
  const onSelectRef = useRef(props.onSelect)
  useEffect(() => {
    onSelectRef.current = props.onSelect
  }, [props.onSelect])

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
          selector: 'node.focused',
          style: {
            'border-width': 3,
            'border-color': '#58a6ff',
            color: '#fff',
            'font-size': 12,
            'z-index': 10,
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

    cy.on('tap', 'node', (evt) => {
      onSelectRef.current?.(evt.target.id())
    })
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        onSelectRef.current?.(null)
      }
    })

    const layout: DagreLayoutOptions = {
      name: 'dagre',
      rankDir: 'LR',
      fit: true,
    }
    cy.layout(layout).run()
    cyRef.current = cy

    return () => {
      cy.destroy()
      cyRef.current = null
    }
  }, [graph])

  // Highlight the selected node. The class is re-applied on every graph
  // rebuild (a new cytoscape instance loses it), but we only pan/zoom when
  // the selection itself changes -- not on unrelated graph changes.
  useEffect(() => {
    const cy = cyRef.current
    if (cy === null) {
      return
    }
    cy.nodes().removeClass('focused')
    if (selected === null || selected === undefined) {
      lastFocusRef.current = null
      return
    }
    const node = cy.getElementById(selected)
    if (node.empty()) {
      return
    }
    node.addClass('focused')
    if (lastFocusRef.current !== selected) {
      cy.animate({ center: { eles: node }, zoom: 2 }, { duration: 300 })
      lastFocusRef.current = selected
    }
  }, [selected, graph])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
