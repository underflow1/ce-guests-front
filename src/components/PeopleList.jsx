import { useEffect, useMemo, useRef, useState } from 'react'
import { extractTimeFromDateTime } from '../utils/date'

const HOURS = Array.from({ length: 10 }, (_, idx) =>
  String(9 + idx).padStart(2, '0'),
)


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
  const clickStateRef = useRef(new Map())
  const CLICK_TIMEOUT = 400

  useEffect(() => {
    return () => {
      clickStateRef.current.forEach((state) => {
        if (state?.timer) clearTimeout(state.timer)
      })
      clickStateRef.current.clear()
    }
  }, [])

  const isBaseTypography = typographyVariant === 'base'
  const isBaseLightTypography = typographyVariant === 'base-light'
  const timeLabelClassName = isBaseTypography
    ? 'text text--muted'
    : isBaseLightTypography
    ? 'text text--thin text--muted'
    : 'text text--down text--muted'
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

  const resetClickState = (personId) => {
    const state = clickStateRef.current.get(personId)
    if (state?.timer) clearTimeout(state.timer)
    clickStateRef.current.delete(personId)
  }

  const renderStatusBadge = (person) => {
    const isCompleted = Boolean(person.is_completed)
    const isCancelled = Boolean(person.is_cancelled)
    const canToggleCompleted = isCompleted ? canUnmarkCompleted : canMarkCompleted
    const canToggleCancelled = isCancelled ? canUnmarkCancelled : canMarkCancelled
    const isAllowed = isCancelled
      ? canToggleCancelled
      : isCompleted
      ? canToggleCompleted
      : canToggleCancelled || canToggleCompleted
    const title = isCancelled
      ? 'Снять отмену визита'
      : isCompleted
      ? 'Снять принятие'
      : 'Визит не состоялся'
    const className = [
      'list__badge',
      isCancelled ? 'list__badge--cancel' : '',
      `list__badge--state-${isCancelled || isCompleted ? 'on' : 'off'}`,
      isAllowed ? 'list__badge--clickable' : '',
    ]
      .filter(Boolean)
      .join(' ')

    const handleStatusClick = (event) => {
      event.stopPropagation()

      if (isCancelled && !canToggleCancelled) return
      if (isCompleted && !canToggleCompleted) return
      if (!isCancelled && !isCompleted && !canToggleCancelled && !canToggleCompleted) return

      const personId = person.id
      const state = clickStateRef.current.get(personId) || { count: 0, timer: null }
      state.count += 1
      if (state.timer) {
        clearTimeout(state.timer)
        state.timer = null
      }

      const applyCancelledToggle = () => {
        const nextValue = !isCancelled
        if (nextValue && canMarkCancelled) {
          onToggleCancelled?.(person.id, dateKey, true)
        }
        if (!nextValue && canUnmarkCancelled) {
          onToggleCancelled?.(person.id, dateKey, false)
        }
      }

      const applyCompletedToggle = () => {
        const nextValue = !isCompleted
        if (nextValue && canMarkCompleted) {
          onToggleCompleted?.(person.id, dateKey, true)
        }
        if (!nextValue && canUnmarkCompleted) {
          onToggleCompleted?.(person.id, dateKey, false)
        }
      }

      if (isCancelled) {
        if (state.count >= 3) {
          applyCancelledToggle()
          resetClickState(personId)
          return
        }
        state.timer = setTimeout(() => resetClickState(personId), CLICK_TIMEOUT)
        clickStateRef.current.set(personId, state)
        return
      }

      if (isCompleted) {
        if (state.count >= 2) {
          applyCompletedToggle()
          resetClickState(personId)
          return
        }
        state.timer = setTimeout(() => resetClickState(personId), CLICK_TIMEOUT)
        clickStateRef.current.set(personId, state)
        return
      }

      if (state.count >= 3) {
        if (canToggleCancelled) {
          applyCancelledToggle()
          resetClickState(personId)
          return
        }
        if (canToggleCompleted) {
          applyCompletedToggle()
          resetClickState(personId)
          return
        }
      }

      if (state.count >= 2 && canToggleCompleted) {
        state.timer = setTimeout(() => {
          applyCompletedToggle()
          resetClickState(personId)
        }, CLICK_TIMEOUT)
      } else {
        state.timer = setTimeout(() => resetClickState(personId), CLICK_TIMEOUT)
      }
      clickStateRef.current.set(personId, state)
    }

    return (
      <button
        type="button"
        className={className}
        title={title}
        disabled={!isAllowed}
        onClick={handleStatusClick}
        aria-label={title}
      >
        <i
          className={`fa-solid ${isCancelled ? 'fa-person-running' : 'fa-user-check'}`}
          aria-hidden="true"
        />
      </button>
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
                    <span className={nameClassName}>
                      <span className="list__badges">
                        {renderPassBadge(person)}
                        {renderStatusBadge(person)}
                      </span>
                      <span className="list__content">
                        <span className="list__text">{person.name}</span>
                        {!compact && person.responsible && (
                          <span className={`list__responsible ${responsibleClassName}`}>
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
