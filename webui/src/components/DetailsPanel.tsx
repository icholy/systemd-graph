import type { Unit, Edge, EdgeType } from '../data/types'
import { nodeColor } from '../data/select'

type DetailsPanelProps = {
  unit: Unit
  outgoing: Edge[]
  incoming: Edge[]
  depTypes: ReadonlySet<EdgeType>
  dependentTypes: ReadonlySet<EdgeType>
  resolveName: (id: string) => string
  onToggleDepType: (type: EdgeType) => void
  onToggleDependentType: (type: EdgeType) => void
  onAllDepTypes: (types: EdgeType[]) => void
  onAllDependentTypes: (types: EdgeType[]) => void
  onClearDepTypes: (types: EdgeType[]) => void
  onClearDependentTypes: (types: EdgeType[]) => void
  onSelect: (id: string) => void
  onClose: () => void
}

function groupByType(
  edges: Edge[],
  pick: (e: Edge) => string,
): Map<EdgeType, string[]> {
  const groups = new Map<EdgeType, string[]>()
  for (const e of edges) {
    const list = groups.get(e.type) ?? []
    list.push(pick(e))
    groups.set(e.type, list)
  }
  return groups
}

function Relations(props: {
  title: string
  groups: Map<EdgeType, string[]>
  edgeTypes: ReadonlySet<EdgeType>
  resolveName: (id: string) => string
  onToggleEdgeType: (type: EdgeType) => void
  onAll: (types: EdgeType[]) => void
  onClear: (types: EdgeType[]) => void
  onSelect: (id: string) => void
}) {
  if (props.groups.size === 0) {
    return null
  }
  return (
    <section className="details-relations">
      <div className="filter-head">
        <h3>{props.title}</h3>
        <span className="filter-actions">
          <button
            type="button"
            className="clear-link"
            onClick={() => props.onAll([...props.groups.keys()])}
          >
            all
          </button>
          <button
            type="button"
            className="clear-link"
            onClick={() => props.onClear([...props.groups.keys()])}
          >
            clear
          </button>
        </span>
      </div>
      {[...props.groups.entries()].map(([type, ids]) => {
        const on = props.edgeTypes.has(type)
        return (
          <div key={type} className={on ? 'rel-group' : 'rel-group off'}>
            <label className="rel-type">
              <input
                type="checkbox"
                checked={on}
                onChange={() => props.onToggleEdgeType(type)}
              />
              {type}
              <span className="rel-type-count">{ids.length}</span>
            </label>
            {on ? (
              <ul>
                {ids.map((id) => (
                  <li key={id}>
                    <button
                      type="button"
                      className="rel-link"
                      onClick={() => props.onSelect(id)}
                    >
                      {props.resolveName(id)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )
      })}
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
          ×
        </button>
      </header>

      <dl className="details-fields">
        <dt>Scope</dt>
        <dd>{unit.scope}</dd>
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

      <Relations
        title="Dependencies"
        groups={deps}
        edgeTypes={props.depTypes}
        resolveName={props.resolveName}
        onToggleEdgeType={props.onToggleDepType}
        onAll={props.onAllDepTypes}
        onClear={props.onClearDepTypes}
        onSelect={props.onSelect}
      />
      <Relations
        title="Dependents"
        groups={dependents}
        edgeTypes={props.dependentTypes}
        resolveName={props.resolveName}
        onToggleEdgeType={props.onToggleDependentType}
        onAll={props.onAllDependentTypes}
        onClear={props.onClearDependentTypes}
        onSelect={props.onSelect}
      />
    </aside>
  )
}
