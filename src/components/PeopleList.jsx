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
  onDragStart,
  onDrop,
  onDoubleClick,
  onEmptyRowDoubleClick,
  onToggleCompleted,
  onDeleteEntry,
  canDelete = false,
  canMarkCompleted = false,
  canUnmarkCompleted = false,
  canMove = false,
}) => {
  const grouped = useMemo(() => groupPeopleByHour(people), [people])
  const [dragOverHour, setDragOverHour] = useState(null)

  return (
    <div className={`time-grid ${compact ? 'time-grid--compact' : ''}`}>
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
          <div className="time-grid__label">{hour}:00</div>
          <div className="time-grid__content">
            {grouped[hour]?.length ? (
              <ul className={`list ${compact ? 'list--compact' : ''}`}>
                {grouped[hour].map((person) => (
                  <li
                    key={person.id}
                    className={`list__item ${person.is_completed ? 'list__item--completed' : ''}`}
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
                    <span className="list__name">
                      {person.name}
                      {!compact && person.responsible && (
                        <span className="list__responsible">
                          {' '}
                          / {person.responsible}
                        </span>
                      )}
                    </span>
                    <span className="list__controls">
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
                      <span className="list__time">
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
      {!people.length && <div className="list__empty">Пока пусто</div>}
    </div>
  )
}

export default PeopleList
