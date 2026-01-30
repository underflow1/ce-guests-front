import { useState } from 'react'
import { extractTimeFromDateTime } from '../utils/date'

const SimplePeopleList = ({
  people,
  compact = false,
  dateKey,
  onDragStart,
  onDrop,
  onDoubleClick,
  onEmptyRowDoubleClick,
  onToggleCompleted,
  onToggleCancelled,
  onOrderPass,
  onRevokePass,
  onDeleteEntry,
  canDelete = false,
  canMarkCompleted = false,
  canUnmarkCompleted = false,
  canMarkCancelled = false,
  canUnmarkCancelled = false,
  canMarkPass = false,
  canRevokePass = false,
  canMove = false,
  typographyVariant,
}) => {
  const [isDragOver, setIsDragOver] = useState(false)

  const getPassStatus = (person) => person?.pass_status || null

  const isBase = typographyVariant === 'base'
  const isBaseLight = typographyVariant === 'base-light'
  const nameClass = isBase ? 'list__name text' : isBaseLight ? 'list__name text text--thin' : 'list__name text'
  const timeClass = isBase ? 'list__time text text--muted' : isBaseLight ? 'list__time text text--thin text--muted' : 'list__time text text--down text--muted'
  const responsibleClass = isBase ? 'list__responsible text text--subtle' : isBaseLight ? 'list__responsible text text--thin text--subtle' : 'list__responsible text text--italic text--subtle'

  const renderPassBadge = (person) => {
    const status = getPassStatus(person)
    const action = status === 'ordered' ? 'revoke' : 'order'
    const isAllowed = action === 'order' ? canMarkPass : canRevokePass

    const title =
      action === 'order'
        ? (isAllowed ? 'Заказать пропуск' : 'Нет прав на заказ пропуска')
        : (isAllowed ? 'Отозвать пропуск' : 'Нет прав на отзыв пропуска')

    const className = `pass-badge pass-badge--${status || 'none'} ${isAllowed ? 'pass-badge--clickable' : ''}`

    const handleClick = (e) => {
      e.stopPropagation()
      if (!isAllowed) return
      if (action === 'order') onOrderPass?.(person.id, dateKey)
      if (action === 'revoke') onRevokePass?.(person.id, dateKey)
    }

    return (
      <button
        type="button"
        className={className}
        title={title}
        onClick={handleClick}
        onDoubleClick={(e) => e.stopPropagation()}
        disabled={!isAllowed}
        aria-label={title}
      />
    )
  }

  return (
      <div
      className={`simple-list ${isDragOver ? 'simple-list--dragover' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        setIsDragOver(false)
        onDrop(event, dateKey, null)
      }}
    >
      {people.length > 0 ? (
        <ul className={`list ${compact ? 'list--compact' : ''}`}>
          {people.map((person) => (
            <li
              key={person.id}
              className={`list__item ${person.is_completed ? 'list__item--completed' : ''} ${
                person.is_cancelled ? 'list__item--cancelled' : ''
              }`}
              draggable={!person.is_completed && canMove}
              onDragStart={(event) => {
                if (!canMove || person.is_completed) {
                  event.preventDefault()
                  return
                }
                onDragStart(event, person, dateKey)
              }}
              onDoubleClick={(event) => {
                event.stopPropagation()
                onDoubleClick?.(person, dateKey)
              }}
            >
              <span className={nameClass}>
                {renderPassBadge(person)}
                {person.name}
              </span>
              <span className="list__controls">
                {(canMarkCancelled || canUnmarkCancelled) && (
                  <button
                    type="button"
                    className={`list__flag-btn ${person.is_cancelled ? 'list__flag-btn--active' : ''}`}
                    title={person.is_cancelled ? 'Снять отмену визита' : 'Отменить визит'}
                    disabled={person.is_cancelled ? !canUnmarkCancelled : !canMarkCancelled}
                    onClick={(e) => {
                      e.stopPropagation()
                      const nextValue = !person.is_cancelled
                      if (nextValue && canMarkCancelled) {
                        onToggleCancelled?.(person.id, dateKey, true)
                      }
                      if (!nextValue && canUnmarkCancelled) {
                        onToggleCancelled?.(person.id, dateKey, false)
                      }
                    }}
                  >
                    Отм
                  </button>
                )}
                {canDelete && (
                  <button
                    className="list__delete-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteEntry?.(person.id, dateKey)
                    }}
                    title="Удалить запись"
                  >
                    ×
                  </button>
                )}
                <input
                  type="checkbox"
                  checked={person.is_completed || false}
                  disabled={
                    person.is_completed
                      ? !canUnmarkCompleted
                      : !canMarkCompleted
                  }
                  onChange={(e) => {
                    e.stopPropagation()
                    const nextValue = e.target.checked
                    if (nextValue && canMarkCompleted) {
                      onToggleCompleted?.(person.id, dateKey, true)
                    }
                    if (!nextValue && canUnmarkCompleted) {
                      onToggleCompleted?.(person.id, dateKey, false)
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    // Предотвращаем клик если нет прав на соответствующее действие
                    if (
                      (person.is_completed && !canUnmarkCompleted) ||
                      (!person.is_completed && !canMarkCompleted)
                    ) {
                      e.preventDefault()
                    }
                  }}
                  className="list__checkbox"
                />
                <span className={timeClass}>
                  {person.datetime ? extractTimeFromDateTime(person.datetime) : (person.time || '')}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="list__empty text text--muted">Пока пусто</div>
      )}
      <div
        className="simple-list__empty-row"
        onDoubleClick={() => onEmptyRowDoubleClick?.(dateKey)}
      />
    </div>
  )
}

export default SimplePeopleList
