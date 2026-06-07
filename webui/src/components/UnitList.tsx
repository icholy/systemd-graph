import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Unit } from '../data/types'
import { nodeColor } from '../data/select'

const ROW_HEIGHT = 26

type UnitListProps = {
  units: Unit[]
  selected: string | null
  onSelect: (name: string) => void
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
            unit.name === selected ? 'unit-row selected' : 'unit-row'
          return (
            <div
              key={unit.name}
              className={className}
              style={{ height: item.size, transform: `translateY(${item.start}px)` }}
              title={`${unit.name} (${unit.activeState})`}
              onClick={() => onSelect(unit.name)}
            >
              <span
                className="dot"
                style={{ background: nodeColor(unit.activeState) }}
              />
              <span className="name">{unit.name}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
