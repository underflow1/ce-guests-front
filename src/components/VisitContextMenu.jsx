const VisitContextMenu = ({ menu, menuRef, items, onSelect }) => {
  if (!menu) return null

  return (
    <div
      ref={menuRef}
      className="visit-menu"
      style={{ left: `${menu.x}px`, top: `${menu.y}px` }}
      role="menu"
    >
      {items.map((item) => (
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
          {item.label}
        </button>
      ))}
    </div>
  )
}

export default VisitContextMenu
