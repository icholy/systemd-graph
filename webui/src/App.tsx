import { useMemo } from 'react'
import snapshot from './data/snapshot.json'
import { parseGraph } from './data/graph'
import { filterGraph } from './data/select'
import { CytoscapeView } from './experiments/cytoscape/CytoscapeView'
import './App.css'

function App() {
  const graph = useMemo(() => filterGraph(parseGraph(snapshot)), [])

  return (
    <div className="app">
      <header className="toolbar">
        <span className="title">systemd-graph</span>
        <span className="stats">
          {graph.units.length} units / {graph.edges.length} edges
        </span>
      </header>
      <main className="canvas">
        <CytoscapeView graph={graph} />
      </main>
    </div>
  )
}

export default App
