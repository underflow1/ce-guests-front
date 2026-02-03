import { useMemo, useRef, useState, useEffect } from 'react'
import DayPanel from './components/DayPanel'
import EntryForm from './components/EntryForm'
import WeekendBlock from './components/WeekendBlock'
import SimplePeopleList from './components/SimplePeopleList'
import LoginForm from './components/LoginForm'
import UserManagement from './components/UserManagement'
import RoleManagement from './components/RoleManagement'
import MaintenancePanel from './components/MaintenancePanel'
import SettingsPanel from './components/SettingsPanel'
import OperatorMobileView from './components/OperatorMobileView'
import { useToast } from './components/ToastProvider'
import useEntries from './hooks/useEntries'
import useAuth from './hooks/useAuth'
import usePermissions from './hooks/usePermissions'
import { INTERFACE_OPTIONS, getInterfaceBodyClass, resolveInterfaceType } from './constants/interfaces'
import { formatWeekdayWithDate, toDateKey, formatWeekdayAndDate, localizeWeekday, parseDateFromKey, formatShortDate } from './utils/date'

const App = () => {
  const { user, loading: authLoading, isAuthenticated, login, logout } = useAuth()
  const {
    canDeleteUi,
    canMarkCompletedUi,
    canUnmarkCompletedUi,
    canMarkCancelledUi,
    canUnmarkCancelledUi,
    canMarkPassUi,
    canRevokePassUi,
    canMoveUi,
    canEditEntryUi,
    interfaceType,
    isAdmin,
  } = usePermissions(user)
  const { pushToast } = useToast()
  const [today, setToday] = useState(() => new Date())
  const todayKeyRef = useRef(toDateKey(today))
  const nameInputRef = useRef(null)
  const dateInputRef = useRef(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [showRoleManagement, setShowRoleManagement] = useState(false)
  const [showMaintenance, setShowMaintenance] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const resolvedInterfaceType = resolveInterfaceType(interfaceType)
  const isOperatorMobile = resolvedInterfaceType === 'operator'
  const dropdownRef = useRef(null)
  const lastErrorRef = useRef(null)

  const {
    todayKey,
    previousWorkday,
    previousWorkdayKey,
    nextWorkday,
    nextWorkdayKey,
    calendarStructure,
    todayPeople,
    previousWorkdayPeople,
    nextWorkdayPeople,
    bottomEntries,
    allResponsibles,
    visitGoals,
    form,
    setForm,
    isFormActive,
    isSubmitDisabled,
    loading: entriesLoading,
    error: entriesError,
    isWebSocketReady,
    handleDragStart,
    handleDrop,
    handleDoubleClick,
    handleEmptyRowDoubleClick,
    handleWeekendEmptyRowDoubleClick,
    handleSubmit,
    handleToggleCompleted,
    handleToggleCancelled,
    handleOrderPass,
    handleRevokePass,
    handleDeleteEntry,
    getEntryById,
  } = useEntries({ today, nameInputRef, interfaceType: resolvedInterfaceType, isAuthenticated })
  const editingEntry = form.editingEntryId ? getEntryById(form.editingEntryId) : null

  const isLoading = authLoading || entriesLoading || (isAuthenticated && !isWebSocketReady)
  const error = entriesError

  useEffect(() => {
    if (!error) {
      lastErrorRef.current = null
      return
    }

    if (error === lastErrorRef.current) {
      return
    }

    const message = String(error)
    const isAuthError =
      message.includes('403') ||
      message.includes('401') ||
      message.includes('деактивирован')
    
    const isSessionExpired = message.includes('Сессия истекла')

    // Показываем toast для всех ошибок, кроме обычных auth ошибок
    // Но показываем toast для истекшей сессии
    if (!isAuthError || isSessionExpired) {
      pushToast({ type: 'error', title: isSessionExpired ? 'Сессия истекла' : 'Ошибка', message })
    }

    lastErrorRef.current = error
  }, [error, pushToast])

  useEffect(() => {
    const now = new Date()
    const nextMidnight = new Date(now)
    nextMidnight.setHours(24, 0, 0, 0)
    const delay = Math.max(nextMidnight.getTime() - now.getTime(), 1000)
    const timerId = setTimeout(() => {
      setToday(new Date())
    }, delay)

    return () => clearTimeout(timerId)
  }, [today])

  useEffect(() => {
    todayKeyRef.current = toDateKey(today)
  }, [today])

  useEffect(() => {
    const checkDate = () => {
      const next = new Date()
      const nextKey = toDateKey(next)
      if (nextKey !== todayKeyRef.current) {
        todayKeyRef.current = nextKey
        setToday(next)
      }
    }

    const intervalId = setInterval(checkDate, 60000)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkDate()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  useEffect(() => {
    document.body.classList.toggle('operator-mobile', isOperatorMobile)
    return () => {
      document.body.classList.remove('operator-mobile')
    }
  }, [isOperatorMobile])

  useEffect(() => {
    const classes = INTERFACE_OPTIONS.map((item) => item.bodyClass)
    classes.forEach((cls) => document.body.classList.remove(cls))
    document.body.classList.add(getInterfaceBodyClass(resolvedInterfaceType))

    return () => classes.forEach((cls) => document.body.classList.remove(cls))
  }, [resolvedInterfaceType])

  

  // Закрываем дропдаун при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  // Показываем форму логина если не авторизован
  if (!isAuthenticated) {
    if (authLoading) {
      return (
        <div className="app">
          <div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка...</div>
        </div>
      )
    }
    return <LoginForm onLogin={login} />
  }

  // Если ошибка авторизации (401/403) и пользователь был авторизован, показываем форму логина
  if (isAuthenticated && entriesError && (entriesError.includes('403') || entriesError.includes('401') || entriesError.includes('деактивирован'))) {
    logout()
    return <LoginForm onLogin={login} />
  }

  // Показываем загрузку пока загружаются данные (entries должны быть полностью загружены перед показом интерфейса)
  // WebSocket подключается в фоне и не вызывает перерисовку, поэтому ждем только загрузку entries
  if (isLoading) {
    return (
      <div className="app">
        <div className={`app__layout ${isOperatorMobile ? 'app__layout--operator-mobile' : ''}`}>
          <div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка...</div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`app ${interfaceType === 'operator' ? 'app--operator' : ''} ${
        isOperatorMobile ? 'app--operator-mobile' : ''
      }`}
    >
      {/* Панель пользователя в правом верхнем углу */}
      <div className={`app__header-bar${isOperatorMobile ? ' app__header-bar--hidden' : ''}`}>
        <div className="app__header-title">Гости</div>
        <div className="app__user-panel" ref={dropdownRef}>
          <div
            className="app__user-name"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            {user?.full_name || user?.email || user?.username}
          </div>
        {isDropdownOpen && (
          <div className="app__user-dropdown">
            {isAdmin && (
              <>
                <button
                  className="app__user-menu-item"
                  onClick={() => {
                    setShowUserManagement(true)
                    setShowRoleManagement(false)
                    setShowMaintenance(false)
                    setShowSettings(false)
                    setIsDropdownOpen(false)
                  }}
                >
                  Пользователи
                </button>
                <button
                  className="app__user-menu-item"
                  onClick={() => {
                    setShowRoleManagement(true)
                    setShowUserManagement(false)
                    setShowMaintenance(false)
                    setShowSettings(false)
                    setIsDropdownOpen(false)
                  }}
                >
                  Роли
                </button>
                <button
                  className="app__user-menu-item"
                  onClick={() => {
                    setShowMaintenance(true)
                    setShowUserManagement(false)
                    setShowRoleManagement(false)
                    setShowSettings(false)
                    setIsDropdownOpen(false)
                  }}
                >
                  Обслуживание
                </button>
                <button
                  className="app__user-menu-item"
                  onClick={() => {
                    setShowSettings(true)
                    setShowUserManagement(false)
                    setShowRoleManagement(false)
                    setShowMaintenance(false)
                    setIsDropdownOpen(false)
                  }}
                >
                  Настройки
                </button>
              </>
            )}
            <button
              className="app__user-menu-item"
              onClick={() => {
                logout()
                setIsDropdownOpen(false)
              }}
            >
              Выход
            </button>
          </div>
        )}
        </div>
      </div>

      {showSettings ? (
        <SettingsPanel onBack={() => setShowSettings(false)} />
      ) : showMaintenance ? (
        <MaintenancePanel
          today={today}
          onBack={() => setShowMaintenance(false)}
          onSuccess={() => {
            // Перезагружаем страницу для обновления данных
            window.location.reload()
          }}
        />
      ) : showUserManagement ? (
        <div style={{ padding: 'var(--space-6)' }}>
          <button
            className="button"
            onClick={() => setShowUserManagement(false)}
            style={{ marginBottom: '1rem' }}
          >
            ← Назад к записям
          </button>
          <UserManagement />
        </div>
      ) : showRoleManagement ? (
        <div style={{ padding: 'var(--space-6)' }}>
          <button
            className="button"
            onClick={() => setShowRoleManagement(false)}
            style={{ marginBottom: '1rem' }}
          >
            ← Назад к записям
          </button>
          <RoleManagement />
        </div>
      ) : resolvedInterfaceType === 'operator' ? (
        // Интерфейс оперативного дежурного - только "Сегодня"
        <div className="app__layout">
          {isOperatorMobile ? (
            <OperatorMobileView
              title="Сегодня"
              dateLabel={formatWeekdayWithDate(today)}
              people={todayPeople}
              visitGoals={visitGoals}
              dateKey={todayKey}
              onToggleCompleted={handleToggleCompleted}
              canMarkCompleted={canMarkCompletedUi()}
              canUnmarkCompleted={canUnmarkCompletedUi()}
              onLogout={logout}
            />
          ) : (
            <div className="app__top-row">
              <DayPanel
                title="Сегодня"
                dateLabel={formatWeekdayWithDate(today)}
                people={todayPeople}
                visitGoals={visitGoals}
                showVisitGoals
                dateKey={todayKey}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onDoubleClick={handleDoubleClick}
                onEmptyRowDoubleClick={handleEmptyRowDoubleClick}
                onToggleCompleted={handleToggleCompleted}
                onToggleCancelled={handleToggleCancelled}
                onOrderPass={handleOrderPass}
                onRevokePass={handleRevokePass}
                onDeleteEntry={handleDeleteEntry}
                canDelete={canDeleteUi()}
                canMarkCompleted={canMarkCompletedUi()}
                canUnmarkCompleted={canUnmarkCompletedUi()}
                canMarkCancelled={canMarkCancelledUi()}
                canUnmarkCancelled={canUnmarkCancelledUi()}
                canMarkPass={canMarkPassUi()}
                canRevokePass={canRevokePassUi()}
                canMove={canMoveUi()}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="app__layout">
          <div className="app__top-row">
            {previousWorkday && previousWorkdayKey && (
              <DayPanel
                title="Предыдущий рабочий день"
                titleAs="div"
                titleTextClassName="text text--bold"
                dateTextClassName="text text--muted"
                peopleTypographyVariant="base"
                dateLabel={(() => {
                  const item = calendarStructure.find(item => item.date === previousWorkdayKey)
                  return item?.weekday
                    ? formatWeekdayAndDate(item.weekday, previousWorkdayKey)
                    : formatWeekdayWithDate(previousWorkday)
                })()}
                people={previousWorkdayPeople}
                visitGoals={visitGoals}
                showVisitGoals
                dateKey={previousWorkdayKey}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onDoubleClick={handleDoubleClick}
                onEmptyRowDoubleClick={handleEmptyRowDoubleClick}
                onToggleCompleted={handleToggleCompleted}
                onToggleCancelled={handleToggleCancelled}
                onOrderPass={handleOrderPass}
                onRevokePass={handleRevokePass}
                onDeleteEntry={handleDeleteEntry}
                canDelete={canDeleteUi()}
                canMarkCompleted={canMarkCompletedUi()}
                canUnmarkCompleted={canUnmarkCompletedUi()}
                canMarkCancelled={canMarkCancelledUi()}
                canUnmarkCancelled={canUnmarkCancelledUi()}
                canMarkPass={canMarkPassUi()}
                canRevokePass={canRevokePassUi()}
                canMove={canMoveUi()}
              />
            )}

            <DayPanel
              title="Сегодня"
              titleAs="div"
              titleTextClassName="text text--bold"
              dateTextClassName="text text--muted"
              peopleTypographyVariant="base"
              dateLabel={formatWeekdayWithDate(today)}
              people={todayPeople}
              visitGoals={visitGoals}
              showVisitGoals
              dateKey={todayKey}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onDoubleClick={handleDoubleClick}
              onEmptyRowDoubleClick={handleEmptyRowDoubleClick}
              onToggleCompleted={handleToggleCompleted}
              onToggleCancelled={handleToggleCancelled}
              onOrderPass={handleOrderPass}
              onRevokePass={handleRevokePass}
              onDeleteEntry={handleDeleteEntry}
              canDelete={canDeleteUi()}
              canMarkCompleted={canMarkCompletedUi()}
              canUnmarkCompleted={canUnmarkCompletedUi()}
              canMarkCancelled={canMarkCancelledUi()}
              canUnmarkCancelled={canUnmarkCancelledUi()}
              canMarkPass={canMarkPassUi()}
              canRevokePass={canRevokePassUi()}
              canMove={canMoveUi()}
            />

            {nextWorkday && nextWorkdayKey && (
              <DayPanel
                title="Следующий рабочий день"
                titleAs="div"
                titleTextClassName="text text--bold"
                dateTextClassName="text text--muted"
                peopleTypographyVariant="base"
                dateLabel={(() => {
                  const item = calendarStructure.find(item => item.date === nextWorkdayKey)
                  return item?.weekday
                    ? formatWeekdayAndDate(item.weekday, nextWorkdayKey)
                    : formatWeekdayWithDate(nextWorkday)
                })()}
                people={nextWorkdayPeople}
                visitGoals={visitGoals}
                showVisitGoals
                dateKey={nextWorkdayKey}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onDoubleClick={handleDoubleClick}
                onEmptyRowDoubleClick={handleEmptyRowDoubleClick}
                onToggleCompleted={handleToggleCompleted}
                onToggleCancelled={handleToggleCancelled}
                onOrderPass={handleOrderPass}
                onRevokePass={handleRevokePass}
                onDeleteEntry={handleDeleteEntry}
                canDelete={canDeleteUi()}
                canMarkCompleted={canMarkCompletedUi()}
                canUnmarkCompleted={canUnmarkCompletedUi()}
                canMarkCancelled={canMarkCancelledUi()}
                canUnmarkCancelled={canUnmarkCancelledUi()}
                canMarkPass={canMarkPassUi()}
                canRevokePass={canRevokePassUi()}
                canMove={canMoveUi()}
              />
            )}

            <section className={`panel${!isFormActive ? ' panel--inactive' : ''}`}>
              <header className="panel__header text">
                <div className="text text--bold">
                  {form.editingEntryId ? 'Редактирование записи' : 'Новая запись'}
                </div>
              </header>
              <EntryForm
                form={form}
                setForm={setForm}
                onSubmit={handleSubmit}
                isSubmitDisabled={isSubmitDisabled}
                nameInputRef={nameInputRef}
                dateInputRef={dateInputRef}
                today={today}
                todayKey={todayKey}
                isEditing={Boolean(form.editingEntryId)}
                editingEntry={editingEntry}
                allResponsibles={allResponsibles}
                canEditEntry={canEditEntryUi()}
                canMarkPass={canMarkPassUi()}
                canRevokePass={canRevokePassUi()}
                canDeleteEntry={canDeleteUi()}
                visitGoals={visitGoals}
                labelTextClassName="text text--muted"
                interfaceType={resolvedInterfaceType}
                isFormActive={isFormActive}
                onOrderPass={handleOrderPass}
                onRevokePass={handleRevokePass}
                onDeleteEntry={handleDeleteEntry}
              />
            </section>
          </div>

          <div className="app__bottom-row">
            {(() => {
              const saturdayItem = calendarStructure.find(item => item.weekday === 'Saturday')
              const sundayItem = calendarStructure.find(item => item.weekday === 'Sunday')
              const weekendRendered = saturdayItem && sundayItem

              const bottomRowItems = []
              calendarStructure.forEach((item, index) => {
                if (item.weekday === 'Saturday' || item.weekday === 'Sunday') {
                  if (item.weekday === 'Saturday' && weekendRendered) {
                    bottomRowItems.push(
                      <div className="weekend-stack" key={`weekend-stack-${index}`}>
                        <section className="panel panel--compact">
                          <header className="panel__header text">
                            <div className="text">Суббота</div>
                          </header>
                          <div className="panel__content text">
                            <SimplePeopleList
                              people={bottomEntries[saturdayItem.date] ?? []}
                              compact
                              dateKey={saturdayItem.date}
                              onDragStart={handleDragStart}
                              onDrop={handleDrop}
                              onDoubleClick={(entry) => handleDoubleClick?.(entry, saturdayItem.date)}
                              onEmptyRowDoubleClick={handleWeekendEmptyRowDoubleClick}
                              onToggleCompleted={handleToggleCompleted}
                              onToggleCancelled={handleToggleCancelled}
                              onOrderPass={handleOrderPass}
                              onRevokePass={handleRevokePass}
                              onDeleteEntry={handleDeleteEntry}
                              canDelete={canDeleteUi()}
                              canMarkCompleted={canMarkCompletedUi()}
                              canUnmarkCompleted={canUnmarkCompletedUi()}
                              canMarkCancelled={canMarkCancelledUi()}
                              canUnmarkCancelled={canUnmarkCancelledUi()}
                              canMarkPass={canMarkPassUi()}
                              canRevokePass={canRevokePassUi()}
                              canMove={canMoveUi()}
                              typographyVariant="base-light"
                            />
                          </div>
                        </section>

                        <section className="panel panel--compact">
                          <header className="panel__header text">
                            <div className="text">Воскресенье</div>
                          </header>
                          <div className="panel__content text">
                            <SimplePeopleList
                              people={bottomEntries[sundayItem.date] ?? []}
                              compact
                              dateKey={sundayItem.date}
                              onDragStart={handleDragStart}
                              onDrop={handleDrop}
                              onDoubleClick={(entry) => handleDoubleClick?.(entry, sundayItem.date)}
                              onEmptyRowDoubleClick={handleWeekendEmptyRowDoubleClick}
                              onToggleCompleted={handleToggleCompleted}
                              onToggleCancelled={handleToggleCancelled}
                              onOrderPass={handleOrderPass}
                              onRevokePass={handleRevokePass}
                              onDeleteEntry={handleDeleteEntry}
                              canDelete={canDeleteUi()}
                              canMarkCompleted={canMarkCompletedUi()}
                              canUnmarkCompleted={canUnmarkCompletedUi()}
                              canMarkCancelled={canMarkCancelledUi()}
                              canUnmarkCancelled={canUnmarkCancelledUi()}
                              canMarkPass={canMarkPassUi()}
                              canRevokePass={canRevokePassUi()}
                              canMove={canMoveUi()}
                              typographyVariant="base-light"
                            />
                          </div>
                        </section>
                      </div>
                    )
                  }
                  return
                }

                bottomRowItems.push(
                  <DayPanel
                    key={item.date}
                    title={localizeWeekday(item.weekday)}
                    dateLabel={formatShortDate(parseDateFromKey(item.date))}
                    titleAs="div"
                    titleTextClassName="text"
                    dateTextClassName="text text--thin text--muted"
                    people={bottomEntries[item.date] ?? []}
                    dateKey={item.date}
                    compact
                    onDragStart={handleDragStart}
                    onDrop={handleDrop}
                    onDoubleClick={handleDoubleClick}
                    onEmptyRowDoubleClick={handleEmptyRowDoubleClick}
                    onToggleCompleted={handleToggleCompleted}
                    onToggleCancelled={handleToggleCancelled}
                    onOrderPass={handleOrderPass}
                    onRevokePass={handleRevokePass}
                    onDeleteEntry={handleDeleteEntry}
                    canDelete={canDeleteUi()}
                    canMarkCompleted={canMarkCompletedUi()}
                    canUnmarkCompleted={canUnmarkCompletedUi()}
                    canMarkCancelled={canMarkCancelledUi()}
                    canUnmarkCancelled={canUnmarkCancelledUi()}
                    canMarkPass={canMarkPassUi()}
                    canRevokePass={canRevokePassUi()}
                    canMove={canMoveUi()}
                    peopleTypographyVariant="base-light"
                    isAdmin={user?.is_admin || false}
                  />
                )
              })
              return bottomRowItems
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
