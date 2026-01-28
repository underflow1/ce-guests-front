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
  onDeleteEntry,
  canDelete = false,
  canMarkCompleted = false,
  canUnmarkCompleted = false,
  canMove = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false)

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
              <span className="list__name">{person.name}</span>
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
        <div className="list__empty">Пока пусто</div>
      )}
      <div
        className="simple-list__empty-row"
        onDoubleClick={() => onEmptyRowDoubleClick?.(dateKey)}
      />
    </div>
  )
}

export default SimplePeopleList
