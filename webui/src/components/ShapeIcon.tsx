import type { JSX } from 'react'

// shapeElement mirrors nodeShape() from data/select, so the list glyphs
// match the graph node shapes. Drawn in a 24x24 viewBox.
function shapeElement(shape: string, color: string): JSX.Element {
  switch (shape) {
    case 'round-rectangle':
      return <rect x="4" y="4" width="16" height="16" rx="4" fill={color} />
    case 'tag':
      return <polygon points="3,5 15,5 21,12 15,19 3,19" fill={color} />
    case 'diamond':
      return <polygon points="12,3 21,12 12,21 3,12" fill={color} />
    case 'hexagon':
      return <polygon points="8,4 16,4 21,12 16,20 8,20 3,12" fill={color} />
    case 'rhomboid':
      return <polygon points="7,5 21,5 17,19 3,19" fill={color} />
    case 'star':
      return (
        <polygon
          points="12,2 14.6,9 22,9 16,13.5 18.2,21 12,16.6 5.8,21 8,13.5 2,9 9.4,9"
          fill={color}
        />
      )
    case 'vee':
      return <polygon points="3,6 12,13 21,6 21,9.5 12,16.5 3,9.5" fill={color} />
    case 'barrel':
      return <rect x="4" y="4" width="16" height="16" rx="6" fill={color} />
    case 'pentagon':
      return <polygon points="12,2 22,10 18,21 6,21 2,10" fill={color} />
    default:
      return <circle cx="12" cy="12" r="9" fill={color} />
  }
}

export function ShapeIcon(props: { shape: string; color: string }) {
  return (
    <svg
      className="shape-icon"
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true"
    >
      {shapeElement(props.shape, props.color)}
    </svg>
  )
}
