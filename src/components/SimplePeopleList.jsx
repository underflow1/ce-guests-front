import { useEffect, useRef, useState } from 'react'
import { getMeetingResultIcon, getMeetingResultVariant, getMeetingResultTitle } from '../utils/meetingResult'

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
    const state = Number(person?.state)
    const isCancelled = state === 20
    const isAllowed = isCancelled ? canUnmarkCancelled : state === 10 ? canMarkCancelled : false
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
    const state = Number(person?.state)
    const isCompleted = state >= 30
    const isCancelled = state === 20
    const isAllowed = isCancelled ? false : state === 30 ? canUnmarkCompleted : state === 10 ? canMarkCompleted : false
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

  const renderMeetingResultBadge = (person) => {
    const state = Number(person?.state)
    const variant = getMeetingResultVariant(state)
    if (!variant) return null

    const iconClass = getMeetingResultIcon(state)
    const title = getMeetingResultTitle(state)

    const className = [
      'list__badge',
      'list__badge--static',
      'list__badge--result',
      `list__badge--result-${variant}`,
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
              className={`list__item ${Number(person?.state) >= 30 ? 'list__item--completed' : ''} ${
                Number(person?.state) === 20 ? 'list__item--cancelled' : ''
              }`}
              draggable={Number(person?.state) === 10 && canMove}
              onDragStart={(event) => {
                if (!canMove || Number(person?.state) !== 10) {
                  event.preventDefault()
                  return
                }
                onDragStart(event, person, dateKey)
              }}
              onClick={(event) => {
                // Любые клики по иконкам/бейджам не должны открывать просмотр/редактирование записи
                if (event?.target?.closest?.('.list__badge') || event?.target?.closest?.('.list__badges')) {
                  event.stopPropagation()
                  return
                }
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
                // Любые клики по иконкам/бейджам не должны открывать просмотр/редактирование записи
                if (event?.target?.closest?.('.list__badge') || event?.target?.closest?.('.list__badges')) {
                  event.stopPropagation()
                  return
                }
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
