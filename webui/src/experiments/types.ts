import type { Graph } from '../data/types'

// Every rendering experiment is a component taking an already-filtered
// graph and filling its parent container.
export type GraphViewProps = {
  graph: Graph
}
