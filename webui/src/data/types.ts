// Mirrors the JSON emitted by cmd/dump (internal/systemd.Graph).

export type Graph = {
  units: Unit[]
  edges: Edge[]
}

export type Unit = {
  id: string
  name: string
  scope: string
  type: string
  description: string
  loadState: string
  activeState: string
  subState: string
}

export type EdgeType =
  | 'Requires'
  | 'Requisite'
  | 'Wants'
  | 'BindsTo'
  | 'PartOf'
  | 'Upholds'
  | 'Conflicts'
  | 'After'
  | 'OnFailure'
  | 'OnSuccess'

export type Edge = {
  from: string
  to: string
  type: EdgeType
}
