import { useState } from 'react'

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
  const responsibleClass = isBase ? 'list__responsible text text--subtle' : isBaseLight ? 'list__responsible text text--thin text--subtle' : 'list__responsible text text--italic text--subtle'

  const renderPassBadge = (person) => {
    const status = getPassStatus(person)
    const state =
      status === 'ordered'
        ? 'ordered'
        : status === 'failed'
        ? 'failed'
        : 'none'
    const title =
      status === 'ordered'
        ? 'Пропуск заказан'
        : status === 'failed'
        ? 'Ошибка заказа пропуска'
        : 'Пропуск не заказан'

    const className = [
      'list__badge',
      'list__badge--pass',
      `list__badge--state-${state}`,
      'list__badge--static',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <span className={className} title={title} aria-label={title}>
        <i className="fa-solid fa-id-card-clip" aria-hidden="true" />
      </span>
    )
  }

  const renderCancelBadge = (person) => {
    const isCancelled = Boolean(person.is_cancelled)
    const isCompleted = Boolean(person.is_completed)
    const isAllowed = !isCompleted && (isCancelled ? canUnmarkCancelled : canMarkCancelled)
    const title = isCancelled ? 'Снять отмену визита' : 'Отменить визит'
    const className = [
      'list__badge',
      'list__badge--cancel',
      `list__badge--state-${isCancelled ? 'on' : 'off'}`,
      isAllowed ? 'list__badge--clickable' : '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <button
        type="button"
        className={className}
        title={title}
        disabled={!isAllowed}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          e.stopPropagation()
          const nextValue = !isCancelled
          if (nextValue && canMarkCancelled) {
            onToggleCancelled?.(person.id, dateKey, true)
          }
          if (!nextValue && canUnmarkCancelled) {
            onToggleCancelled?.(person.id, dateKey, false)
          }
        }}
        aria-label={title}
      >
        <i className="fa-solid fa-person-running" aria-hidden="true" />
      </button>
    )
  }

  const renderAcceptedBadge = (person) => {
    const isCompleted = Boolean(person.is_completed)
    const isCancelled = Boolean(person.is_cancelled)
    const isAllowed = !isCancelled && (isCompleted ? canUnmarkCompleted : canMarkCompleted)
    const title = isCompleted ? 'Гость принят' : 'Гость не принят'
    const className = [
      'list__badge',
      'list__badge--accepted',
      `list__badge--state-${isCompleted ? 'on' : 'off'}`,
      isAllowed ? 'list__badge--clickable' : '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <button
        type="button"
        className={className}
        title={title}
        disabled={!isAllowed}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          e.stopPropagation()
          const nextValue = !isCompleted
          if (nextValue && canMarkCompleted) {
            onToggleCompleted?.(person.id, dateKey, true)
          }
          if (!nextValue && canUnmarkCompleted) {
            onToggleCompleted?.(person.id, dateKey, false)
          }
        }}
        aria-label={title}
      >
        <i className="fa-solid fa-user-check" aria-hidden="true" />
      </button>
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
              draggable={!person.is_completed && !person.is_cancelled && canMove}
              onDragStart={(event) => {
                if (!canMove || person.is_completed || person.is_cancelled) {
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
                <span className="list__badges">
                  {renderPassBadge(person)}
                  {renderCancelBadge(person)}
                  {renderAcceptedBadge(person)}
                </span>
                <span className="list__content">
                  <span className="list__text">{person.name}</span>
                  {person.responsible && (
                    <span className={`list__responsible ${responsibleClass}`}>
                      {' '}
                      / {person.responsible}
                    </span>
                  )}
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
