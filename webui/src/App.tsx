import { useEffect, useState } from 'react'
import { parseGraph } from './data/graph'
import type { Graph } from './data/types'
import { Explorer } from './Explorer'
import './App.css'

function App() {
  const [graph, setGraph] = useState<Graph | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/snapshot')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          setGraph(parseGraph(data))
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error !== null) {
    return <div className="app-status">Failed to load snapshot: {error}</div>
  }
  if (graph === null) {
    return <div className="app-status">Loading...</div>
  }
  return <Explorer full={graph} />
}

export default App
