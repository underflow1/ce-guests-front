import { useMemo, useRef, useState, useEffect } from 'react'
import DayPanel from './components/DayPanel'
import EntryForm from './components/EntryForm'
import WeekendBlock from './components/WeekendBlock'
import LoginForm from './components/LoginForm'
import UserManagement from './components/UserManagement'
import RoleManagement from './components/RoleManagement'
import MaintenancePanel from './components/MaintenancePanel'
import OperatorMobileView from './components/OperatorMobileView'
import { useToast } from './components/ToastProvider'
import useEntries from './hooks/useEntries'
import useWorkDays from './hooks/useWorkDays'
import useAuth from './hooks/useAuth'
import usePermissions from './hooks/usePermissions'
import { formatWeekdayWithDate, toDateKey } from './utils/date'

const App = () => {
  const { user, loading: authLoading, isAuthenticated, login, logout } = useAuth()
  const {
    canDeleteUi,
    canMarkCompletedUi,
    canUnmarkCompletedUi,
    canMoveUi,
    canEditEntryUi,
    interfaceType,
    isAdmin,
  } = usePermissions()
  const { pushToast } = useToast()
  const [today, setToday] = useState(() => new Date())
  const todayKeyRef = useRef(toDateKey(today))
  const nameInputRef = useRef(null)
  const dateInputRef = useRef(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [showRoleManagement, setShowRoleManagement] = useState(false)
  const [showMaintenance, setShowMaintenance] = useState(false)
  const isOperatorMobile = interfaceType === 'operator'
  const dropdownRef = useRef(null)
  const lastErrorRef = useRef(null)

  // Загружаем данные только если пользователь авторизован
  const { tomorrow, nextMonday, loading: datesLoading, error: datesError } = useWorkDays(
    isAuthenticated ? today : null
  )
  const {
    todayKey,
    tomorrowKey,
    nextMondayKey,
    todayPeople,
    tomorrowPeople,
    bottomColumns,
    bottomEntries,
    allResponsibles,
    form,
    setForm,
    isSubmitDisabled,
    loading: entriesLoading,
    error: entriesError,
    handleDragStart,
    handleDrop,
    handleDoubleClick,
    handleEmptyRowDoubleClick,
    handleWeekendEmptyRowDoubleClick,
    handleSubmit,
    handleToggleCompleted,
    handleDeleteEntry,
  } = useEntries({ today, tomorrow, nextMonday, nameInputRef, interfaceType })

  const isLoading = authLoading || datesLoading || entriesLoading
  const error = datesError || entriesError

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

  // Если ошибка авторизации (401/403), показываем форму логина
  if ((datesError && (datesError.includes('403') || datesError.includes('401') || datesError.includes('деактивирован'))) ||
      (entriesError && (entriesError.includes('403') || entriesError.includes('401') || entriesError.includes('деактивирован')))) {
    logout()
    return <LoginForm onLogin={login} />
  }

  // Показываем загрузку пока загружаются данные
  if (isLoading && !tomorrow) {
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
                    setIsDropdownOpen(false)
                  }}
                >
                  Обслуживание
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

      {showMaintenance ? (
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
      ) : interfaceType === 'operator' ? (
        // Интерфейс оперативного дежурного - только "Сегодня"
        <div className="app__layout">
          {isOperatorMobile ? (
            <OperatorMobileView
              title="Сегодня"
              dateLabel={formatWeekdayWithDate(today)}
              people={todayPeople}
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
                dateKey={todayKey}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onDoubleClick={handleDoubleClick}
                onEmptyRowDoubleClick={handleEmptyRowDoubleClick}
                onToggleCompleted={handleToggleCompleted}
                onDeleteEntry={handleDeleteEntry}
                canDelete={canDeleteUi()}
                canMarkCompleted={canMarkCompletedUi()}
                canUnmarkCompleted={canUnmarkCompletedUi()}
                canMove={canMoveUi()}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="app__layout">
        <div className="app__top-row">
          <DayPanel
            title="Сегодня"
            dateLabel={formatWeekdayWithDate(today)}
            people={todayPeople}
            dateKey={todayKey}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onDoubleClick={handleDoubleClick}
            onEmptyRowDoubleClick={handleEmptyRowDoubleClick}
            onToggleCompleted={handleToggleCompleted}
            onDeleteEntry={handleDeleteEntry}
            canDelete={canDeleteUi()}
            canMarkCompleted={canMarkCompletedUi()}
            canUnmarkCompleted={canUnmarkCompletedUi()}
            canMove={canMoveUi()}
          />

          {tomorrow && (
            <DayPanel
              title="Завтра"
              dateLabel={formatWeekdayWithDate(tomorrow)}
              people={tomorrowPeople}
              dateKey={tomorrowKey}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onDoubleClick={handleDoubleClick}
              onEmptyRowDoubleClick={handleEmptyRowDoubleClick}
              onToggleCompleted={handleToggleCompleted}
              onDeleteEntry={handleDeleteEntry}
              canDelete={canDeleteUi()}
              canMarkCompleted={canMarkCompletedUi()}
              canUnmarkCompleted={canUnmarkCompletedUi()}
              canMove={canMoveUi()}
            />
          )}

          <section className="panel">
            <header className="panel__header">
              <h2 className="panel__title">
                {form.editingEntryId ? 'Редактирование записи' : 'Новая запись'}
              </h2>
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
              nextMondayKey={nextMondayKey}
              isEditing={Boolean(form.editingEntryId)}
              allResponsibles={allResponsibles}
              canEditEntry={canEditEntryUi()}
            />
          </section>
        </div>

        <div className="app__bottom-row">
          {bottomColumns.map((column, index) => {
            if (column.type === 'weekend') {
              return (
                <section className="panel panel--compact" key={`weekend-${index}`}>
                  <header className="panel__header">
                    <h3 className="panel__title">Суббота / Воскресенье</h3>
                  </header>
                  <div className="panel__content">
                    <WeekendBlock
                      saturday={column.saturday}
                      sunday={column.sunday}
                      saturdayKey={toDateKey(column.saturday)}
                      sundayKey={toDateKey(column.sunday)}
                      saturdayPeople={bottomEntries[toDateKey(column.saturday)] ?? []}
                      sundayPeople={bottomEntries[toDateKey(column.sunday)] ?? []}
                      onDragStart={handleDragStart}
                      onDrop={handleDrop}
                      onDoubleClick={handleDoubleClick}
                      onEmptyRowDoubleClick={handleWeekendEmptyRowDoubleClick}
                      onToggleCompleted={handleToggleCompleted}
                      onDeleteEntry={handleDeleteEntry}
                      canDelete={canDeleteUi()}
                      canMarkCompleted={canMarkCompletedUi()}
                      canUnmarkCompleted={canUnmarkCompletedUi()}
                      canMove={canMoveUi()}
                    />
                  </div>
                </section>
              )
            }

            return (
              <DayPanel
                key={column.date.toISOString()}
                title={formatWeekdayWithDate(column.date)}
                titleAs="h3"
                people={bottomEntries[toDateKey(column.date)] ?? []}
                dateKey={toDateKey(column.date)}
                compact
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onDoubleClick={handleDoubleClick}
                onEmptyRowDoubleClick={handleEmptyRowDoubleClick}
                onToggleCompleted={handleToggleCompleted}
                onDeleteEntry={handleDeleteEntry}
                canDelete={canDeleteUi()}
                canMarkCompleted={canMarkCompletedUi()}
                canUnmarkCompleted={canUnmarkCompletedUi()}
                canMove={canMoveUi()}
                isAdmin={user?.is_admin || false}
              />
            )
          })}
        </div>
      </div>
      )}
    </div>
  )
}

export default App
