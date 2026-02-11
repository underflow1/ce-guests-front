import { useState } from 'react'

const isStatusItem = (item) => item?.key?.startsWith('status') ?? false

const StatusFlyout = ({ items, onSelect }) => {
  const [hoveredKey, setHoveredKey] = useState(null)

  return (
    <div className="visit-menu__flyout" role="menu">
      {items.map((item) => {
        const hasChildren = item.children?.length > 0
        const isHovered = hoveredKey === item.key

        return (
          <div
            key={item.key}
            className="visit-menu__item-wrapper"
            onMouseEnter={() => setHoveredKey(item.key)}
            onMouseLeave={() => setHoveredKey(null)}
          >
            <button
              type="button"
              className="visit-menu__item"
              title={item.hint || item.label}
              disabled={!item.enabled}
              onClick={(event) => {
                event.stopPropagation()
                if (!item.enabled) return
                if (!hasChildren) onSelect?.(item)
              }}
              role="menuitem"
            >
              <span>{item.label}</span>
              {hasChildren ? (
                <i className="fa-solid fa-chevron-right visit-menu__arrow visit-menu__arrow--flyout" aria-hidden="true" />
              ) : null}
            </button>
            {hasChildren && isHovered && (
              <StatusFlyout items={item.children} onSelect={onSelect} />
            )}
          </div>
        )
      })}
    </div>
  )
}

const VisitContextMenu = ({ menu, menuRef, items, onSelect }) => {
  const [statusHovered, setStatusHovered] = useState(false)

  if (!menu) return null

  const rootItems = items || []

  return (
    <div
      ref={menuRef}
      className="visit-menu"
      style={{ left: `${menu.x}px`, top: `${menu.y}px` }}
      role="menu"
    >
      {rootItems.map((item) => {
        const isStatus = isStatusItem(item)
        const hasStatusChildren = isStatus && item.children?.length > 0

        if (hasStatusChildren) {
          return (
            <div
              key={item.key}
              className="visit-menu__item-wrapper"
              onMouseEnter={() => item.enabled && setStatusHovered(true)}
              onMouseLeave={() => setStatusHovered(false)}
            >
              <button
                type="button"
                className="visit-menu__item"
                title={item.hint || item.label}
                disabled={!item.enabled}
                aria-haspopup="menu"
                aria-expanded={statusHovered}
                role="menuitem"
              >
                <span>{item.label}</span>
                <i className="fa-solid fa-chevron-right visit-menu__arrow visit-menu__arrow--flyout" aria-hidden="true" />
              </button>
              {statusHovered && (
                <StatusFlyout items={item.children} onSelect={onSelect} />
              )}
            </div>
          )
        }

        return (
          <button
            key={item.key}
            type="button"
            className="visit-menu__item"
            title={item.hint || item.label}
            disabled={!item.enabled}
            onClick={(event) => {
              event.stopPropagation()
              if (!item.enabled) return
              onSelect?.(item)
            }}
            role="menuitem"
          >
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default VisitContextMenu
