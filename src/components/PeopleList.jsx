import { useEffect, useMemo, useRef, useState } from 'react'
import { extractTimeFromDateTime } from '../utils/date'
import { getMeetingResultIcon, getMeetingResultVariant, getMeetingResultTitle } from '../utils/meetingResult'

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
  itemVariant = 'full',
  activeEntryId,
  isFormActive,
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
  visitGoals = [],
  showVisitGoals = false,
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
  const visitGoalsMap = useMemo(() => {
    return new Map((visitGoals || []).map((goal) => [goal.id, goal.name]))
  }, [visitGoals])
  const [dragOverHour, setDragOverHour] = useState(null)
  const clickTimerRef = useRef(new Map())
  const SINGLE_CLICK_DELAY = 220
  const [visitMenu, setVisitMenu] = useState(null) // { person, x, y }
  const visitMenuRef = useRef(null)

  useEffect(() => {
    return () => {
      clickTimerRef.current.forEach((timer) => {
        if (timer) clearTimeout(timer)
      })
      clickTimerRef.current.clear()
    }
  }, [])

  useEffect(() => {
    if (!visitMenu) return

    const handleDocMouseDown = (event) => {
      if (visitMenuRef.current && visitMenuRef.current.contains(event.target)) return
      setVisitMenu(null)
    }

    const handleDocKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setVisitMenu(null)
      }
    }

    document.addEventListener('mousedown', handleDocMouseDown)
    document.addEventListener('keydown', handleDocKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleDocMouseDown)
      document.removeEventListener('keydown', handleDocKeyDown)
    }
  }, [visitMenu])

  const isBaseTypography = typographyVariant === 'base'
  const isBaseLightTypography = typographyVariant === 'base-light'
  const isSimpleVariant = itemVariant === 'simple'
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

  const getVisitGoalNames = (person) => {
    const ids = Array.isArray(person?.visit_goal_ids) ? person.visit_goal_ids : []
    if (!ids.length) return []
    return ids.map((id) => visitGoalsMap.get(id)).filter(Boolean)
  }

  const renderStateBadge = (person, options = {}) => {
    const { interactive = false } = options
    const state = Number(person?.state)
    const variant = getMeetingResultVariant(state)
    if (!variant) {
      return <span className="list__badge list__badge--static" aria-hidden="true" />
    }

    const iconClass = getMeetingResultIcon(state)
    const title = getMeetingResultTitle(state)

    const className = [
      'list__badge',
      'list__badge--result',
      `list__badge--result-${variant}`,
      interactive ? 'list__badge--clickable' : 'list__badge--static',
    ]
      .filter(Boolean)
      .join(' ')

    if (!interactive) {
      return (
        <span className={className} title={title} aria-label={title}>
          <i className={`fa-solid ${iconClass}`} aria-hidden="true" />
        </span>
      )
    }

    const s = Number(person?.state)
    const isEditable = s === 10 || s === 20 || s === 30
    const items = buildVisitMenuItems(person)
    const hasAny = items.some((i) => i.enabled)

    const handleStatusClick = (event) => {
      event.stopPropagation()

      // Если эта запись сейчас редактируется в правой панели — любой клик по ней в списке схлопывает в чтение
      if (isFormActive && activeEntryId && person?.id === activeEntryId) {
        onSingleClick?.(person, dateKey)
      }

      if (!items.length) return

      // Если нет ни одного доступного действия — не показываем меню
      if (!hasAny) return

      setVisitMenu((prev) => {
        if (prev?.person?.id === person?.id) return null
        return { person, x: event.clientX + 8, y: event.clientY + 8 }
      })
    }

    return (
      <button
        type="button"
        className={className}
        title={title}
        onClick={isEditable ? handleStatusClick : undefined}
        aria-label={title}
        aria-haspopup={hasAny ? 'menu' : undefined}
      >
        <i className={`fa-solid ${iconClass}`} aria-hidden="true" />
      </button>
    )
  }

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

  const resetClickTimer = (personId) => {
    const timer = clickTimerRef.current.get(personId)
    if (timer) clearTimeout(timer)
    clickTimerRef.current.delete(personId)
  }

  const buildVisitMenuItems = (person) => {
    const s = Number(person?.state)

    const accept = {
      key: 'accept',
      label: s === 30 ? 'Снять «гость принят»' : 'Гость принят',
      enabled: s === 10 ? canMarkCompleted : s === 30 ? canUnmarkCompleted : false,
      action: () => {
        if (s === 10) onToggleCompleted?.(person.id, dateKey, true)
        if (s === 30) onToggleCompleted?.(person.id, dateKey, false)
      },
    }

    const cancel = {
      key: 'cancel',
      label: s === 20 ? 'Снять отмену' : 'Встреча отменена',
      enabled: s === 10 ? canMarkCancelled : s === 20 ? canUnmarkCancelled : false,
      action: () => {
        if (s === 10) onToggleCancelled?.(person.id, dateKey, true)
        if (s === 20) onToggleCancelled?.(person.id, dateKey, false)
      },
    }

    return [accept, cancel]
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
                      className={`list__item ${Number(person?.state) === 30 ? 'list__item--completed' : ''} ${
                        Number(person?.state) === 20 ? 'list__item--cancelled' : ''
                      } ${[40, 60].includes(Number(person?.state)) ? 'list__item--subtle' : ''} ${
                        [20, 40].includes(Number(person?.state)) ? 'list__item--strike' : ''
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
                          // Но если это текущая редактируемая запись — схлопываем в чтение
                          if (isFormActive && activeEntryId && person?.id === activeEntryId) {
                            onSingleClick?.(person, dateKey)
                          }
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
                          // Но если это текущая редактируемая запись — схлопываем в чтение
                          if (isFormActive && activeEntryId && person?.id === activeEntryId) {
                            onSingleClick?.(person, dateKey)
                          }
                          event.stopPropagation()
                          return
                        }
                        event.stopPropagation()
                        resetClickTimer(person.id)
                        onDoubleClick?.(person, dateKey)
                      }}
                    >
                      {isSimpleVariant ? (
                        <span className={nameClassName}>
                          <span className="list__badges">
                            {renderStateBadge(person)}
                          </span>
                          <span className="list__text">{person.name}</span>
                        </span>
                      ) : (
                        (() => {
                          const goals = showVisitGoals ? getVisitGoalNames(person) : []
                          return (
                        <span className={`${nameClassName}${showVisitGoals ? ' list__name--stacked' : ''}`}>
                          {showVisitGoals ? (
                            <span className="list__stacked-grid">
                              <span className="list__badges">
                                {renderPassBadge(person)}
                                {renderStateBadge(person, { interactive: true })}
                              </span>
                              <span className="list__primary">
                                <span className="list__text">{person.name}</span>
                                {!compact && person.responsible && (
                                  <span className={`list__responsible ${responsibleClassName}`}>
                                    {' '}
                                    / {person.responsible}
                                  </span>
                                )}
                              </span>
                              {/* Оставляем слот, чтобы строка с целями не съезжала */}
                              <span className="list__stacked-icon" aria-hidden="true" />
                              <span
                                className={[
                                  'list__goals',
                                  'text',
                                  'text--down',
                                  'text--thin',
                                  'text--italic',
                                  goals.length ? '' : 'text--subtle',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                              >
                                {goals.length ? goals.join(', ') : 'Цель визита не установлена'}
                              </span>
                            </span>
                          ) : (
                            <>
                              <span className="list__badges">
                                {renderPassBadge(person)}
                                {renderStateBadge(person, { interactive: true })}
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
                            </>
                          )}
                        </span>
                          )
                        })()
                      )}
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
      {visitMenu && (
        <div
          ref={visitMenuRef}
          className="visit-menu"
          style={{ left: `${visitMenu.x}px`, top: `${visitMenu.y}px` }}
          role="menu"
        >
          {buildVisitMenuItems(visitMenu.person)
            .filter((item) => item.enabled)
            .map((item) => (
            <button
              key={item.key}
              type="button"
              className="visit-menu__item"
              onClick={(e) => {
                e.stopPropagation()
                // После выбора пункта открываем запись справа в режиме чтения
                onSingleClick?.(visitMenu.person, dateKey)
                item.action?.()
                setVisitMenu(null)
              }}
              role="menuitem"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default PeopleList
