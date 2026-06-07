import { nodeShape } from '../data/select'
import { ShapeIcon } from './ShapeIcon'

// Legend color is neutral: shape encodes type, color is reserved for
// active state, so the legend glyphs shouldn't imply a state.
const LEGEND_COLOR = '#8b949e'

type TypeFilterProps = {
  types: string[]
  counts: Map<string, number>
  enabled: ReadonlySet<string>
  onToggle: (type: string) => void
  onClear: () => void
}

export function TypeFilter(props: TypeFilterProps) {
  return (
    <div className="type-filter">
      <div className="filter-head">
        <h2 className="type-filter-title">Types</h2>
        <button type="button" className="clear-link" onClick={props.onClear}>
          clear
        </button>
      </div>
      {props.types.map((type) => (
        <label
          key={type}
          className={props.enabled.has(type) ? 'type-row' : 'type-row off'}
        >
          <input
            type="checkbox"
            checked={props.enabled.has(type)}
            onChange={() => props.onToggle(type)}
          />
          <ShapeIcon shape={nodeShape(type)} color={LEGEND_COLOR} />
          <span className="type-name">{type}</span>
          <span className="type-count">{props.counts.get(type) ?? 0}</span>
        </label>
      ))}
    </div>
  )
}
