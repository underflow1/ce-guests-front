import { useMemo, useState } from 'react'

const HOURS = Array.from({ length: 10 }, (_, idx) =>
  String(9 + idx).padStart(2, '0'),
)

import { extractTimeFromDateTime } from '../utils/date'

const groupPeopleByHour = (people) =>
  people.reduce((acc, person) => {
    // Извлекаем время из datetime
    const time = person.datetime ? extractTimeFromDateTime(person.datetime) : (person.time || '')
    const hour = time.split(':')[0] ?? ''
    if (!acc[hour]) acc[hour] = []
    acc[hour].push(person)
    return acc
  }, {})

const PeopleList = ({
  people,
  compact = false,
  dateKey,
  typographyVariant,
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
}) => {
  const grouped = useMemo(() => groupPeopleByHour(people), [people])
  const [dragOverHour, setDragOverHour] = useState(null)

  const isBaseTypography = typographyVariant === 'base'
  const isBaseLightTypography = typographyVariant === 'base-light'
  const timeLabelClassName = isBaseTypography
    ? 'text text--muted'
    : isBaseLightTypography
    ? 'text text--thin text--muted'
    : 'text text--down text--muted'
  const timeValueClassName = timeLabelClassName
  const responsibleClassName = isBaseTypography
    ? 'text text--subtle'
    : isBaseLightTypography
    ? 'text text--thin text--subtle'
    : 'text text--italic text--subtle'
  const nameClassName = isBaseTypography
    ? 'list__name text'
    : isBaseLightTypography
    ? 'list__name text text--thin'
    : 'list__name text'

  const getPassStatus = (person) => person?.pass_status || null

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
    <div className={`time-grid text ${compact ? 'time-grid--compact' : ''}`}>
      {HOURS.map((hour) => (
        <div
          className={`time-grid__row ${dragOverHour === hour ? 'time-grid__row--dragover' : ''}`}
          key={hour}
          onDragOver={(event) => {
            event.preventDefault()
            setDragOverHour(hour)
          }}
          onDragLeave={() => {
            if (dragOverHour === hour) {
              setDragOverHour(null)
            }
          }}
          onDrop={(event) => {
            setDragOverHour(null)
            onDrop(event, dateKey, hour)
          }}
          onDoubleClick={() => onEmptyRowDoubleClick?.(dateKey, hour)}
        >
          <div className={`time-grid__label ${timeLabelClassName}`}>{hour}:00</div>
          <div className="time-grid__content">
            {grouped[hour]?.length ? (
              <ul className={`list ${compact ? 'list--compact' : ''}`}>
                {grouped[hour].map((person) => (
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
                    <span className={nameClassName}>
                      {renderPassBadge(person)}
                      {person.name}
                      {!compact && person.responsible && (
                        <span className={`list__responsible ${responsibleClassName}`}>
                          {' '}
                          / {person.responsible}
                        </span>
                      )}
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
                      <span className={`list__time ${timeValueClassName}`}>
                        {person.datetime ? extractTimeFromDateTime(person.datetime) : (person.time || '')}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="time-grid__empty-row" />
            )}
          </div>
        </div>
      ))}
      {!people.length && <div className="list__empty text text--muted">Пока пусто</div>}
    </div>
  )
}

export default PeopleList
