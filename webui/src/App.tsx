import { useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import snapshot from './data/snapshot.json'
import { parseGraph } from './data/graph'
import { filterGraph } from './data/select'
import type { GraphViewProps } from './experiments/types'
import { CytoscapeView } from './experiments/cytoscape/CytoscapeView'
import { ReactFlowView } from './experiments/reactflow/ReactFlowView'
import { D3View } from './experiments/d3/D3View'
import './App.css'

type Experiment = {
  key: string
  label: string
  View: ComponentType<GraphViewProps>
}

const experiments: Experiment[] = [
  { key: 'cytoscape', label: 'Cytoscape', View: CytoscapeView },
  { key: 'reactflow', label: 'React Flow', View: ReactFlowView },
  { key: 'd3', label: 'D3', View: D3View },
]

function App() {
  const graph = useMemo(() => filterGraph(parseGraph(snapshot)), [])
  const [active, setActive] = useState(experiments[0].key)

  const current = experiments.find((e) => e.key === active) ?? experiments[0]
  const View = current.View

  return (
    <div className="app">
      <header className="toolbar">
        <span className="title">systemd-graph</span>
        {experiments.map((e) => (
          <button
            key={e.key}
            type="button"
            className={e.key === active ? 'active' : ''}
            onClick={() => setActive(e.key)}
          >
            {e.label}
          </button>
        ))}
        <span className="stats">
          {graph.units.length} units / {graph.edges.length} edges
        </span>
      </header>
      <main className="canvas">
        <View graph={graph} />
      </main>
    </div>
  )
}

export default App
