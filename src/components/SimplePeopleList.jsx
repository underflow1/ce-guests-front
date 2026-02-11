import { useEffect, useRef, useState } from 'react'
import { getMeetingResultIcon, getMeetingResultVariant, getMeetingResultTitle } from '../utils/meetingResult'
import { toDateKey } from '../utils/date'
import { buildVisitMenuItems } from '../utils/visitMenu'
import VisitContextMenu from './VisitContextMenu'

const SimplePeopleList = ({
  people,
  compact = false,
  dateKey,
  onDragStart,
  onDrop,
  onDoubleClick,
  onSingleClick,
  onEmptyRowDoubleClick,
  onToggleArrived,
  onToggleCancelled,
  onOrderPass,
  onRevokePass,
  onRollbackMeetingResult,
  onDeleteEntry,
  canDelete = false,
  canMarkArrived = false,
  canUnmarkArrived = false,
  canMarkCancelled = false,
  canUnmarkCancelled = false,
  canMarkPass = false,
  canRevokePass = false,
  canRollbackMeetingResult = false,
  canMove = false,
  typographyVariant,
  itemVariant = 'full',
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const clickTimerRef = useRef(new Map())
  const SINGLE_CLICK_DELAY = 220
  const [visitMenu, setVisitMenu] = useState(null)
  const visitMenuRef = useRef(null)
  const todayKey = toDateKey(new Date())

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

  const getPassStatus = (person) => person?.pass_status || null
  const getMenuItems = (person) => buildVisitMenuItems({
    person,
    dateKey,
    todayKey,
    canMarkArrived,
    canUnmarkArrived,
    canMarkCancelled,
    canUnmarkCancelled,
    canMarkPass,
    canRevokePass,
    canRollbackMeetingResult,
    onToggleArrived,
    onToggleCancelled,
    onOrderPass,
    onRevokePass,
    onRollbackMeetingResult,
  })

  const openMenu = (person, event) => {
    event.stopPropagation()
    const items = getMenuItems(person)
    if (!items.length) return

    setVisitMenu((prev) => {
      if (prev?.person?.id === person?.id) return null
      return { person, x: event.clientX + 8, y: event.clientY + 8 }
    })
  }

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
    const isArrived = state >= 30
    const isCancelled = state === 20
    const isAllowed = isCancelled ? false : state === 30 ? canUnmarkArrived : state === 10 ? canMarkArrived : false
    const title = isArrived ? 'Гость прибыл' : 'Гость не прибыл'
    const className = [
      'list__badge',
      'list__badge--accepted',
      `list__badge--state-${isArrived ? 'on' : 'off'}`,
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
          const nextValue = !isArrived
          if (nextValue && canMarkArrived) {
            onToggleArrived?.(person.id, dateKey, true)
          }
          if (!nextValue && canUnmarkArrived) {
            onToggleArrived?.(person.id, dateKey, false)
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
      'list__badge--result',
      `list__badge--result-${variant}`,
    ]
      .filter(Boolean)
      .join(' ')

    const menuItems = getMenuItems(person)
    const hasMenu = menuItems.length > 0

    if (!hasMenu) {
      return (
        <span className={`${className} list__badge--static`} title={title} aria-label={title}>
          <i className={`fa-solid ${iconClass}`} aria-hidden="true" />
        </span>
      )
    }

    return (
      <button
        type="button"
        className={`${className} list__badge--clickable`}
        title={title}
        aria-label={title}
        aria-haspopup="menu"
        onClick={(event) => openMenu(person, event)}
      >
        <i className={`fa-solid ${iconClass}`} aria-hidden="true" />
      </button>
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
              className={`list__item ${Number(person?.state) === 30 ? 'list__item--arrived' : ''} ${
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
                  <span className="list__badges">
                    {renderMeetingResultBadge(person) ?? (
                      <span className="list__badge list__badge--static" aria-hidden="true" />
                    )}
                  </span>
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
      <VisitContextMenu
        menu={visitMenu}
        menuRef={visitMenuRef}
        items={visitMenu?.person ? getMenuItems(visitMenu.person) : []}
        onSelect={(item) => {
          onSingleClick?.(visitMenu?.person, dateKey)
          item.action?.()
          setVisitMenu(null)
        }}
      />
    </div>
  )
}

export default SimplePeopleList
