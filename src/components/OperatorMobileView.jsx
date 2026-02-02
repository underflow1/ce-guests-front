import { useMemo, useRef, useState, useEffect } from 'react'
import { extractTimeFromDateTime } from '../utils/date'

const getEntryTime = (person) =>
  person.datetime ? extractTimeFromDateTime(person.datetime) : (person.time || '')

const toMinutes = (time) => {
  if (!time) return Number.POSITIVE_INFINITY
  const [hours, minutes] = time.split(':').map((part) => Number.parseInt(part, 10))
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.POSITIVE_INFINITY
  return hours * 60 + minutes
}

const OperatorMobileView = ({
  title,
  dateLabel,
  people,
  visitGoals = [],
  dateKey,
  onToggleCompleted,
  canMarkCompleted = false,
  canUnmarkCompleted = false,
  onLogout,
}) => {
  const sortedPeople = useMemo(
    () => [...people].sort((a, b) => toMinutes(getEntryTime(a)) - toMinutes(getEntryTime(b))),
    [people]
  )
  const lastTapRef = useRef({ id: null, time: 0 })
  const prevIdsRef = useRef(new Set())
  const [newEntryIds, setNewEntryIds] = useState(new Set())
  const timeoutIdsRef = useRef([])
  const reloadTimerRef = useRef(null)
  const logoutTimerRef = useRef(null)

  useEffect(() => {
    const currentIds = new Set(people.map((person) => person.id))
    const prevIds = prevIdsRef.current
    const addedIds = people
      .map((person) => person.id)
      .filter((id) => !prevIds.has(id))

    if (addedIds.length) {
      setNewEntryIds((prev) => {
        const next = new Set(prev)
        addedIds.forEach((id) => next.add(id))
        return next
      })

      addedIds.forEach((id) => {
        const timeoutId = setTimeout(() => {
          setNewEntryIds((prev) => {
            if (!prev.has(id)) return prev
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }, 600)
        timeoutIdsRef.current.push(timeoutId)
      })
    }

    prevIdsRef.current = currentIds
  }, [people])

  useEffect(() => () => {
    timeoutIdsRef.current.forEach((id) => clearTimeout(id))
    timeoutIdsRef.current = []
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current)
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
  }, [])

  const handleReloadStart = () => {
    if (reloadTimerRef.current) return
    reloadTimerRef.current = setTimeout(() => {
      reloadTimerRef.current = null
      window.location.reload()
    }, 1000)
  }

  const handleReloadCancel = () => {
    if (!reloadTimerRef.current) return
    clearTimeout(reloadTimerRef.current)
    reloadTimerRef.current = null
  }

  const handleLogoutStart = () => {
    if (logoutTimerRef.current) return
    logoutTimerRef.current = setTimeout(() => {
      logoutTimerRef.current = null
      onLogout?.()
    }, 1000)
  }

  const handleLogoutCancel = () => {
    if (!logoutTimerRef.current) return
    clearTimeout(logoutTimerRef.current)
    logoutTimerRef.current = null
  }

  const multiTapRef = useRef({ id: null, count: 0, time: 0 })
  const visitGoalsMap = useMemo(() => {
    return new Map((visitGoals || []).map((goal) => [goal.id, goal.name]))
  }, [visitGoals])

  const getVisitGoalNames = (person) => {
    const ids = Array.isArray(person?.visit_goal_ids) ? person.visit_goal_ids : []
    if (!ids.length) return []
    return ids.map((id) => visitGoalsMap.get(id)).filter(Boolean)
  }

  const handleRowTap = (person) => {
    const now = Date.now()
    const isSame = multiTapRef.current.id === person.id
    const withinWindow = now - multiTapRef.current.time < 500
    const nextCount = isSame && withinWindow ? multiTapRef.current.count + 1 : 1

    multiTapRef.current = { id: person.id, count: nextCount, time: now }

    if (nextCount === 2 && !person.is_completed) {
      multiTapRef.current = { id: null, count: 0, time: 0 }
      if (canMarkCompleted) {
        onToggleCompleted?.(person.id, dateKey, true)
      }
      return
    }

    if (nextCount === 3) {
      multiTapRef.current = { id: null, count: 0, time: 0 }
      if (person.is_completed && canUnmarkCompleted) {
        onToggleCompleted?.(person.id, dateKey, false)
      }
    }
  }

  return (
    <section className="operator-mobile panel">
      <header className="panel__header operator-mobile__header">
        <h2
          className="panel__title operator-mobile__title"
          onTouchStart={handleReloadStart}
          onTouchEnd={handleReloadCancel}
          onTouchMove={handleReloadCancel}
          onMouseDown={handleReloadStart}
          onMouseUp={handleReloadCancel}
          onMouseLeave={handleReloadCancel}
        >
          {title}
        </h2>
        {dateLabel && (
          <div
            className="panel__date operator-mobile__date"
            onTouchStart={handleLogoutStart}
            onTouchEnd={handleLogoutCancel}
            onTouchMove={handleLogoutCancel}
            onMouseDown={handleLogoutStart}
            onMouseUp={handleLogoutCancel}
            onMouseLeave={handleLogoutCancel}
          >
            {dateLabel}
          </div>
        )}
      </header>
      <div className="operator-mobile__content">
        {sortedPeople.length ? (
          <ul className="list operator-mobile__list">
            {sortedPeople.map((person) => {
              const isNew = newEntryIds.has(person.id)
              const goals = getVisitGoalNames(person)
              const time = getEntryTime(person)
              return (
                <li
                  key={person.id}
                  className={`list__item operator-mobile__item ${
                    person.is_completed ? 'list__item--completed' : ''
                  } ${person.is_cancelled ? 'list__item--cancelled' : ''} ${
                    isNew ? 'operator-mobile__item--new' : ''
                  }`}
                  onPointerUp={() => handleRowTap(person)}
                >
                  <span className="operator-mobile__entry">
                    <span className="operator-mobile__entry-header">
                      <span className="operator-mobile__entry-name">{person.name}</span>
                      {time && <span className="operator-mobile__entry-time">{time}</span>}
                    </span>
                    <span
                      className={[
                        'operator-mobile__entry-goals',
                        'text--thin',
                        'text--italic',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {goals.length ? goals.join(', ') : 'Цель визита не установлена'}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="operator-mobile__empty">Пока пусто</div>
        )}
      </div>
    </section>
  )
}

export default OperatorMobileView
