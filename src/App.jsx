import { useRef, useState, useEffect } from 'react'
import LoginForm from './components/LoginForm'
import UserManagement from './components/UserManagement'
import RoleManagement from './components/RoleManagement'
import MaintenancePanel from './components/MaintenancePanel'
import SettingsPanel from './components/SettingsPanel'
import { useToast } from './components/ToastProvider'
import useEntries from './hooks/useEntries'
import useAuth from './hooks/useAuth'
import usePermissions from './hooks/usePermissions'
import { INTERFACE_OPTIONS, getInterfaceBodyClass, resolveInterfaceType } from './constants/interfaces'
import DutyOfficerInterface from './interfaces/DutyOfficerInterface'
import UserInterface from './interfaces/UserInterface'
import { toDateKey } from './utils/date'

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
    canSetMeetingResultUi,
    canChangeMeetingResultUi,
    canRollbackMeetingResultUi,
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
  const isDutyOfficer = resolvedInterfaceType === 'duty_officer'
  const isDutyOfficerMobile = isDutyOfficer
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
    meetingResults,
    meetingResultReasons,
    meetingResultReasonsLoading,
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
    handleSingleClick,
    handleEmptyRowDoubleClick,
    handleWeekendEmptyRowDoubleClick,
    handleExitEdit,
    handleSubmit,
    handleToggleCompleted,
    handleToggleCancelled,
    handleOrderPass,
    handleRevokePass,
    handleDeleteEntry,
    handleRollbackMeetingResult,
    getEntryById,
  } = useEntries({
    today,
    nameInputRef,
    interfaceType: resolvedInterfaceType,
    isAuthenticated,
    canSetMeetingResult: canSetMeetingResultUi(),
    canChangeMeetingResult: canChangeMeetingResultUi(),
    canRollbackMeetingResult: canRollbackMeetingResultUi(),
  })
  const editingEntry = form.editingEntryId ? getEntryById(form.editingEntryId) : null

  const isLoading = authLoading || entriesLoading || (isAuthenticated && !isWebSocketReady)
  const error = entriesError
  const canDelete = canDeleteUi()
  const canMarkCompleted = canMarkCompletedUi()
  const canUnmarkCompleted = canUnmarkCompletedUi()
  const canMarkCancelled = canMarkCancelledUi()
  const canUnmarkCancelled = canUnmarkCancelledUi()
  const canMarkPass = canMarkPassUi()
  const canRevokePass = canRevokePassUi()
  const canMove = canMoveUi()
  const canEditEntry = canEditEntryUi()
  const canSetMeetingResult = canSetMeetingResultUi()
  const canChangeMeetingResult = canChangeMeetingResultUi()
  const canRollbackMeetingResult = canRollbackMeetingResultUi()

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
    document.body.classList.toggle('duty-officer-mobile', isDutyOfficerMobile)
    return () => {
      document.body.classList.remove('duty-officer-mobile')
    }
  }, [isDutyOfficerMobile])

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

  // Если ошибка авторизации (401) или деактивации, показываем форму логина
  if (isAuthenticated && entriesError && (entriesError.includes('401') || entriesError.includes('деактивирован'))) {
    logout()
    return <LoginForm onLogin={login} />
  }

  // Показываем загрузку пока загружаются данные (entries должны быть полностью загружены перед показом интерфейса)
  // WebSocket подключается в фоне и не вызывает перерисовку, поэтому ждем только загрузку entries
  if (isLoading) {
    return (
      <div className="app">
        <div className={`app__layout ${isDutyOfficerMobile ? 'app__layout--duty-officer-mobile' : ''}`}>
          <div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка...</div>
        </div>
      </div>
    )
  }

  const dutyOfficerProps = {
    isMobile: isDutyOfficerMobile,
    today,
    todayKey,
    todayPeople,
    visitGoals,
    handleToggleCompleted,
    canMarkCompleted,
    canUnmarkCompleted,
    logout,
    handleDragStart,
    handleDrop,
    handleDoubleClick,
    handleSingleClick,
    handleEmptyRowDoubleClick,
    handleToggleCancelled,
    handleOrderPass,
    handleRevokePass,
    handleDeleteEntry,
    handleRollbackMeetingResult,
    canDelete,
    canMarkCancelled,
    canUnmarkCancelled,
    canMarkPass,
    canRevokePass,
    canMove,
    canChangeMeetingResult,
    canRollbackMeetingResult,
  }

  const userInterfaceProps = {
    previousWorkday,
    previousWorkdayKey,
    nextWorkday,
    nextWorkdayKey,
    calendarStructure,
    today,
    todayKey,
    todayPeople,
    previousWorkdayPeople,
    nextWorkdayPeople,
    bottomEntries,
    visitGoals,
    meetingResults,
    meetingResultReasons,
    meetingResultReasonsLoading,
    form,
    setForm,
    isFormActive,
    isSubmitDisabled,
    nameInputRef,
    dateInputRef,
    editingEntry,
    allResponsibles,
    canEditEntry,
    canDelete,
    canMarkCompleted,
    canUnmarkCompleted,
    canMarkCancelled,
    canUnmarkCancelled,
    canMarkPass,
    canRevokePass,
    canMove,
    canSetMeetingResult,
    canChangeMeetingResult,
    canRollbackMeetingResult,
    handleDragStart,
    handleDrop,
    handleDoubleClick,
    handleSingleClick,
    handleEmptyRowDoubleClick,
    handleWeekendEmptyRowDoubleClick,
    handleExitEdit,
    handleToggleCompleted,
    handleToggleCancelled,
    handleOrderPass,
    handleRevokePass,
    handleDeleteEntry,
    handleRollbackMeetingResult,
    handleSubmit,
    interfaceType: resolvedInterfaceType,
    isAdmin: user?.is_admin || false,
  }

  const InterfaceComponent = isDutyOfficer ? DutyOfficerInterface : UserInterface
  const interfaceProps = isDutyOfficer ? dutyOfficerProps : userInterfaceProps

  return (
    <div
      className={`app ${isDutyOfficer ? 'app--duty-officer' : ''} ${
        isDutyOfficerMobile ? 'app--duty-officer-mobile' : ''
      }`}
    >
      {/* Панель пользователя в правом верхнем углу */}
      <div className={`app__header-bar${isDutyOfficerMobile ? ' app__header-bar--hidden' : ''}`}>
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
      ) : (
        <InterfaceComponent {...interfaceProps} />
      )}
    </div>
  )
}

export default App
