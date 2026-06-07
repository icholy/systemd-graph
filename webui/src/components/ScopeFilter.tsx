type ScopeFilterProps = {
  scopes: string[]
  counts: Map<string, number>
  enabled: ReadonlySet<string>
  onToggle: (scope: string) => void
}

export function ScopeFilter(props: ScopeFilterProps) {
  return (
    <div className="type-filter">
      <h2 className="type-filter-title">Scope</h2>
      {props.scopes.map((scope) => (
        <label
          key={scope}
          className={props.enabled.has(scope) ? 'type-row' : 'type-row off'}
        >
          <input
            type="checkbox"
            checked={props.enabled.has(scope)}
            onChange={() => props.onToggle(scope)}
          />
          <span className="type-name">{scope}</span>
          <span className="type-count">{props.counts.get(scope) ?? 0}</span>
        </label>
      ))}
    </div>
  )
}
