import type { Graph } from '../data/types'

// Every rendering experiment is a component taking an already-filtered
// graph and filling its parent container. selected is the focused unit
// name (if any); onSelect is called when a node is tapped.
export type GraphViewProps = {
  graph: Graph
  selected?: string | null
  onSelect?: (name: string | null) => void
}
