import { useEffect, useRef, useState } from 'react'

const SimplePeopleList = ({
  people,
  compact = false,
  dateKey,
  onDragStart,
  onDrop,
  onDoubleClick,
  onSingleClick,
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
  itemVariant = 'full',
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const clickTimerRef = useRef(new Map())
  const SINGLE_CLICK_DELAY = 220

  useEffect(() => {
    return () => {
      clickTimerRef.current.forEach((timer) => {
        if (timer) clearTimeout(timer)
      })
      clickTimerRef.current.clear()
    }
  }, [])

  const getPassStatus = (person) => person?.pass_status || null

  const isBase = typographyVariant === 'base'
  const isBaseLight = typographyVariant === 'base-light'
  const nameClass = isBase ? 'list__name text' : isBaseLight ? 'list__name text text--thin' : 'list__name text'
  const responsibleClass = isBase ? 'list__responsible text text--subtle' : isBaseLight ? 'list__responsible text text--thin text--subtle' : 'list__responsible text text--italic text--subtle'
  const isSimpleVariant = itemVariant === 'simple'

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

  const getMeetingResultBadgeVariant = (person) => {
    if (person?.is_cancelled) return 'cancelled'
    const resultName = String(person?.meeting_result_name || '').toLowerCase()
    if (!resultName) return null
    if (resultName.includes('отказ') || resultName.includes('отмен')) return 'cancelled'
    if (resultName.includes('не оформ')) return 'pending'
    if (resultName.includes('трудоустро')) return 'employed'
    return null
  }

  const renderMeetingResultBadge = (person) => {
    const variant = getMeetingResultBadgeVariant(person)
    if (!variant) return null

    const iconClass =
      variant === 'pending'
        ? 'fa-spinner'
        : variant === 'employed'
        ? 'fa-user-check'
        : 'fa-xmark'
    const title =
      variant === 'pending'
        ? 'В процессе'
        : variant === 'employed'
        ? 'Трудоустроен'
        : 'Отказ или отмена визита'

    const className = [
      'list__badge',
      'list__badge--static',
      'list__badge--meeting-result',
      `list__badge--meeting-result-${variant}`,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <span className={className} title={title} aria-label={title}>
        <i className={`fa-solid ${iconClass}`} aria-hidden="true" />
      </span>
    )
  }

  const resetClickTimer = (personId) => {
    const timer = clickTimerRef.current.get(personId)
    if (timer) clearTimeout(timer)
    clickTimerRef.current.delete(personId)
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
              onClick={() => {
                if (!onSingleClick) return
                const personId = person.id
                resetClickTimer(personId)
                const timer = setTimeout(() => {
                  onSingleClick?.(person, dateKey)
                  resetClickTimer(personId)
                }, SINGLE_CLICK_DELAY)
                clickTimerRef.current.set(personId, timer)
              }}
              onDoubleClick={(event) => {
                event.stopPropagation()
                resetClickTimer(person.id)
                onDoubleClick?.(person, dateKey)
              }}
            >
              {isSimpleVariant ? (
                <span className={nameClass}>
                  <span className="list__text">{person.name}</span>
                </span>
              ) : (
                <span className={nameClass}>
                  <span className="list__stacked-grid">
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
                    <span className="list__stacked-icon">{renderMeetingResultBadge(person)}</span>
                    <span className="list__stacked-secondary" />
                  </span>
                </span>
              )}
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
