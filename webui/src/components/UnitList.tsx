import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Unit } from '../data/types'
import { displayName, nodeColor, nodeShape } from '../data/select'
import { ShapeIcon } from './ShapeIcon'

const ROW_HEIGHT = 26

type UnitListProps = {
  units: Unit[]
  selected: string | null
  onSelect: (id: string) => void
}

export function UnitList({ units, selected, onSelect }: UnitListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: units.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  })

  return (
    <div ref={parentRef} className="unit-list">
      <div
        className="unit-list-inner"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const unit = units[item.index]
          const className =
            unit.id === selected ? 'unit-row selected' : 'unit-row'
          return (
            <div
              key={unit.id}
              className={className}
              style={{ height: item.size, transform: `translateY(${item.start}px)` }}
              title={`${displayName(unit)} (${unit.scope}, ${unit.activeState})`}
              onClick={() => onSelect(unit.id)}
            >
              <ShapeIcon
                shape={nodeShape(unit.type)}
                color={nodeColor(unit.activeState)}
              />
              <span className="name">{displayName(unit)}</span>
              {unit.scope === 'user' ? (
                <span className="scope-tag">user</span>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
