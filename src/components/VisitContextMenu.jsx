import { useEffect, useMemo, useState } from 'react'

const VisitContextMenu = ({ menu, menuRef, items, onSelect }) => {
  const [stack, setStack] = useState([])

  useEffect(() => {
    if (!menu) {
      setStack([])
      return
    }
    setStack([{ title: '', items: items || [] }])
  }, [menu, items])

  const current = useMemo(() => {
    if (!stack.length) return { title: '', items: [] }
    return stack[stack.length - 1]
  }, [stack])

  if (!menu) return null

  return (
    <div
      ref={menuRef}
      className="visit-menu"
      style={{ left: `${menu.x}px`, top: `${menu.y}px` }}
      role="menu"
    >
      {stack.length > 1 && (
        <div className="visit-menu__header">
          <button
            type="button"
            className="visit-menu__back"
            onClick={(event) => {
              event.stopPropagation()
              setStack((prev) => prev.slice(0, -1))
            }}
          >
            <i className="fa-solid fa-chevron-left" aria-hidden="true" />
            Назад
          </button>
          {current.title && <span className="visit-menu__title">{current.title}</span>}
        </div>
      )}
      {current.items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="visit-menu__item"
          title={item.hint || item.label}
          disabled={!item.enabled}
          onClick={(event) => {
            event.stopPropagation()
            if (!item.enabled) return
            if (item.children?.length) {
              setStack((prev) => [...prev, { title: item.label, items: item.children }])
              return
            }
            onSelect?.(item)
          }}
          role="menuitem"
        >
          <span>{item.label}</span>
          {item.children?.length ? (
            <i className="fa-solid fa-chevron-right visit-menu__arrow" aria-hidden="true" />
          ) : null}
        </button>
      ))}
    </div>
  )
}

export default VisitContextMenu
