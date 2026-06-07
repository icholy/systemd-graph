import { useEffect, useRef } from 'react'
import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'
import type { DagreLayoutOptions } from 'cytoscape-dagre'
import type { GraphViewProps } from '../types'
import { nodeColor, nodeShape, unitLabel } from '../../data/select'

cytoscape.use(dagre)

export function CytoscapeView(props: GraphViewProps) {
  const { graph, selected } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
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
        label: unitLabel(unit),
        full: unit.name,
        color: nodeColor(unit.activeState),
        shape: nodeShape(unit.type),
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
            'text-wrap': 'ellipsis',
            'text-max-width': '140px',
            width: 16,
            height: 16,
          },
        },
        { selector: 'node[shape = "round-rectangle"]', style: { shape: 'round-rectangle' } },
        { selector: 'node[shape = "tag"]', style: { shape: 'tag' } },
        { selector: 'node[shape = "diamond"]', style: { shape: 'diamond' } },
        { selector: 'node[shape = "hexagon"]', style: { shape: 'hexagon' } },
        { selector: 'node[shape = "rhomboid"]', style: { shape: 'rhomboid' } },
        { selector: 'node[shape = "star"]', style: { shape: 'star' } },
        { selector: 'node[shape = "vee"]', style: { shape: 'vee' } },
        { selector: 'node[shape = "barrel"]', style: { shape: 'barrel' } },
        { selector: 'node[shape = "pentagon"]', style: { shape: 'pentagon' } },
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

    cy.on('mouseover', 'node', (evt) => {
      const tip = tooltipRef.current
      if (tip === null) {
        return
      }
      tip.textContent = evt.target.data('full')
      const pos = evt.target.renderedPosition()
      tip.style.left = `${pos.x}px`
      tip.style.top = `${pos.y}px`
      tip.style.display = 'block'
    })
    cy.on('mouseout', 'node', () => {
      const tip = tooltipRef.current
      if (tip !== null) {
        tip.style.display = 'none'
      }
    })

    const layout: DagreLayoutOptions = {
      name: 'dagre',
      rankDir: 'LR',
      nodeSep: 40,
      rankSep: 220,
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

  return (
    <div className="cy-wrap">
      <div ref={containerRef} className="cy-canvas" />
      <div ref={tooltipRef} className="cy-tooltip" />
    </div>
  )
}
