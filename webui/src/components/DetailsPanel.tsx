import type { Unit, Edge } from '../data/types'
import { nodeColor } from '../data/select'

type DetailsPanelProps = {
  unit: Unit
  outgoing: Edge[]
  incoming: Edge[]
  onSelect: (name: string) => void
  onClose: () => void
}

function groupByType(
  edges: Edge[],
  pick: (e: Edge) => string,
): Map<string, string[]> {
  const groups = new Map<string, string[]>()
  for (const e of edges) {
    const list = groups.get(e.type) ?? []
    list.push(pick(e))
    groups.set(e.type, list)
  }
  return groups
}

function Relations(props: {
  title: string
  groups: Map<string, string[]>
  onSelect: (name: string) => void
}) {
  if (props.groups.size === 0) {
    return null
  }
  return (
    <section className="details-relations">
      <h3>{props.title}</h3>
      {[...props.groups.entries()].map(([type, names]) => (
        <div key={type} className="rel-group">
          <div className="rel-type">{type}</div>
          <ul>
            {names.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  className="rel-link"
                  onClick={() => props.onSelect(name)}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

export function DetailsPanel(props: DetailsPanelProps) {
  const { unit } = props
  const deps = groupByType(props.outgoing, (e) => e.to)
  const dependents = groupByType(props.incoming, (e) => e.from)

  return (
    <aside className="details">
      <header className="details-header">
        <span className="details-title">{unit.name}</span>
        <button
          type="button"
          className="details-close"
          onClick={props.onClose}
          aria-label="Close"
        >
          x
        </button>
      </header>

      <dl className="details-fields">
        <dt>Type</dt>
        <dd>{unit.type}</dd>
        <dt>Active</dt>
        <dd>
          <span className="dot" style={{ background: nodeColor(unit.activeState) }} />
          {unit.activeState} ({unit.subState})
        </dd>
        <dt>Load</dt>
        <dd>{unit.loadState}</dd>
        {unit.description !== '' ? (
          <>
            <dt>Description</dt>
            <dd>{unit.description}</dd>
          </>
        ) : null}
      </dl>

      <Relations title="Dependencies" groups={deps} onSelect={props.onSelect} />
      <Relations title="Dependents" groups={dependents} onSelect={props.onSelect} />
    </aside>
  )
}
