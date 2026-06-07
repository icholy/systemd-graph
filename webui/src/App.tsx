import { useCallback, useEffect, useState } from 'react'
import { parseGraph } from './data/graph'
import type { Graph } from './data/types'
import { Explorer } from './Explorer'
import './App.css'

function App() {
  const [graph, setGraph] = useState<Graph | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(() => {
    setRefreshing(true)
    return fetch('/api/snapshot')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        setGraph(parseGraph(data))
        setError(null)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        setRefreshing(false)
      })
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Only block the whole screen on the initial load; later failures keep
  // the last good graph on screen.
  if (graph === null) {
    if (error !== null) {
      return <div className="app-status">Failed to load snapshot: {error}</div>
    }
    return <div className="app-status">Loading...</div>
  }

  return <Explorer full={graph} refreshing={refreshing} onRefresh={load} />
}

export default App
