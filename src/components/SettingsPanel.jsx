import { useState, useEffect, useRef } from 'react'
import useSettings from '../hooks/useSettings'
import useVisitGoals from '../hooks/useVisitGoals'
import { apiGet, apiPost, apiPatch, apiPut } from '../utils/api'
import { useToast } from './ToastProvider'

const SECTION_TITLES = {
  notifications: 'Уведомления',
  passes: 'Пропуска',
  'production-calendar': 'Производственный календарь',
  'visit-dictionaries': 'Справочники визитов',
  all: 'Настройки',
}

const SettingsPanel = ({ section = 'all' }) => {
  const {
    getSettings,
    updateSettings,
    loadProductionCalendarCurrentYear,
    clearProductionCalendarCurrentYear,
    loading,
    error: apiError,
  } = useSettings()
  const {
    getAllGoals,
    createGoal,
    updateGoal,
    loading: goalsLoading,
    error: goalsError,
  } = useVisitGoals()
  const { pushToast } = useToast()
  const [error, setError] = useState(null)
  const [calendarActionLoading, setCalendarActionLoading] = useState(false)
  const lastErrorRef = useRef(null)
  const [visitGoals, setVisitGoals] = useState([])
  const [newGoalName, setNewGoalName] = useState('')
  const [allReasons, setAllReasons] = useState([])
  const [newReasonName, setNewReasonName] = useState('')
  const [reasonEdits, setReasonEdits] = useState({})
  const [reasonsLoading, setReasonsLoading] = useState(false)
  const [reasonsError, setReasonsError] = useState(null)
  const currentYear = new Date().getFullYear()

  const REASON_STATES = [
    { value: 40, label: 'Отказ' },
    { value: 50, label: 'Не оформлен' },
    { value: 60, label: 'Трудоустроен' },
  ]
  const [allowedReasonIdsByState, setAllowedReasonIdsByState] = useState(() => ({
    40: new Set(),
    50: new Set(),
    60: new Set(),
  }))
  const [allowedReasonIdsByStateInitial, setAllowedReasonIdsByStateInitial] = useState(() => ({
    40: new Set(),
    50: new Set(),
    60: new Set(),
  }))
  const [allowedLoading, setAllowedLoading] = useState(false)
  const [editingReasonId, setEditingReasonId] = useState(null)
  const [editingReasonName, setEditingReasonName] = useState('')
  const [showAddReasonForm, setShowAddReasonForm] = useState(false)
  const [productionCalendarInitialEnabled, setProductionCalendarInitialEnabled] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState(null)
  const [editingGoalName, setEditingGoalName] = useState('')
  const [showAddGoalForm, setShowAddGoalForm] = useState(false)

  // Типы уведомлений (fallback, если metadata отсутствует)
  const fallbackNotificationTypes = [
    { code: 'entry_created', title: 'Создание записи' },
    { code: 'entry_updated', title: 'Обновление записи' },
    { code: 'entry_arrived', title: 'Гость отмечен как прибывший' },
    { code: 'entry_rollback', title: 'Состояние записи откатано' },
    { code: 'result_set', title: 'Результат установлен' },
    { code: 'visit_cancelled', title: 'Визит отменен' },
    { code: 'entry_moved', title: 'Перенос записи' },
    { code: 'entry_deleted', title: 'Удаление записи' },
    { code: 'entries_deleted_all', title: 'Удаление всех записей' },
    { code: 'pass_ordered', title: 'Пропуск заказан' },
    { code: 'pass_order_failed', title: 'Не удалось заказать пропуск' },
    { code: 'pass_revoked', title: 'Пропуск отозван' },
  ]
  const [availableTypes, setAvailableTypes] = useState(fallbackNotificationTypes)
  const createDefaultNotifications = () => ({
    providers: {
      max_via_green_api: {
        enabled: false,
        base_url: '',
        instance_id: '',
        api_token: '',
        chat_id: '',
      },
      telegram: {
        enabled: false,
        bot_token: '',
        chat_id: '',
      },
    },
    enabled_notification_types: fallbackNotificationTypes.map((t) => t.code),
  })
  const cloneNotifications = (value) => JSON.parse(JSON.stringify(value))

  // Форма настроек
  const [form, setForm] = useState({
    notifications: {
      ...createDefaultNotifications(),
    },
    pass_integration: {
      enabled: false,
      base_url: '',
      login: '',
      password: '',
      object: '',
      corpa: '',
    },
    production_calendar: {
      enabled: false,
      status: null,
    },
  })
  const [notificationsInitial, setNotificationsInitial] = useState(() => cloneNotifications(createDefaultNotifications()))
  const createDefaultPassIntegration = () => ({
    enabled: false,
    base_url: '',
    login: '',
    password: '',
    object: '',
    corpa: '',
  })
  const [passesInitial, setPassesInitial] = useState(() => createDefaultPassIntegration())

  // Загрузить настройки при монтировании
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getSettings()
        if (settings) {
          const notifications = settings.notifications || {}
          const passIntegration = settings.pass_integration || {}
          const productionCalendar = settings.production_calendar || {}
          const providers = notifications.providers || {}
          const maxProvider = providers.max_via_green_api || {}
          const telegramProvider = providers.telegram || {}
          const metadataTypes = settings.metadata?.notifications?.available_types
          const normalizedTypes = Array.isArray(metadataTypes) && metadataTypes.length > 0
            ? metadataTypes
            : fallbackNotificationTypes
          const enabledTypes =
            notifications.enabled_notification_types || normalizedTypes.map((t) => t.code)

          setAvailableTypes(normalizedTypes)

          const loadedNotifications = {
            providers: {
              max_via_green_api: {
                enabled: !!maxProvider.enabled,
                base_url: maxProvider.base_url || '',
                instance_id: maxProvider.instance_id || '',
                api_token: maxProvider.api_token || '',
                chat_id: maxProvider.chat_id || '',
              },
              telegram: {
                enabled: !!telegramProvider.enabled,
                bot_token: telegramProvider.bot_token || '',
                chat_id: telegramProvider.chat_id || '',
              },
            },
            enabled_notification_types: enabledTypes,
          }

          setForm({
            notifications: loadedNotifications,
            pass_integration: {
              enabled: !!passIntegration.enabled,
              base_url: passIntegration.base_url || '',
              login: passIntegration.login || '',
              password: passIntegration.password || '',
              object: passIntegration.object || '',
              corpa: passIntegration.corpa || '',
            },
            production_calendar: {
              enabled: !!productionCalendar.enabled,
              status: productionCalendar.status || null,
            },
          })
          setNotificationsInitial(cloneNotifications(loadedNotifications))
          setPassesInitial({
            enabled: !!passIntegration.enabled,
            base_url: passIntegration.base_url || '',
            login: passIntegration.login || '',
            password: passIntegration.password || '',
            object: passIntegration.object || '',
            corpa: passIntegration.corpa || '',
          })
          setProductionCalendarInitialEnabled(!!productionCalendar.enabled)
        }
      } catch (err) {
        // Если настройки не найдены, используем значения по умолчанию
        console.log('Настройки не найдены, используем значения по умолчанию')
        setNotificationsInitial(cloneNotifications(createDefaultNotifications()))
        setPassesInitial(createDefaultPassIntegration())
      }
    }
    loadSettings()
  }, [])

  const loadAllReasons = async () => {
    try {
      setReasonsError(null)
      setReasonsLoading(true)
      const res = await apiGet('/reasons/all')
      setAllReasons(res?.reasons || [])
    } catch (err) {
      setReasonsError(err.message || 'Не удалось загрузить причины')
    } finally {
      setReasonsLoading(false)
    }
  }

  const loadAllAllowedReasons = async () => {
    setAllowedLoading(true)
    try {
      const [res40, res50, res60] = await Promise.all([
        apiGet('/states/40/reasons/all'),
        apiGet('/states/50/reasons/all'),
        apiGet('/states/60/reasons/all'),
      ])
      const next = {
        40: new Set((res40?.reasons || []).map((r) => r.id)),
        50: new Set((res50?.reasons || []).map((r) => r.id)),
        60: new Set((res60?.reasons || []).map((r) => r.id)),
      }
      setAllowedReasonIdsByState(next)
      setAllowedReasonIdsByStateInitial(next)
    } catch (err) {
      setReasonsError(err.message || 'Не удалось загрузить список разрешенных причин')
    } finally {
      setAllowedLoading(false)
    }
  }

  useEffect(() => {
    loadAllReasons()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadAllAllowedReasons()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const loadGoals = async () => {
      try {
        const goals = await getAllGoals()
        setVisitGoals(goals)
      } catch (err) {
        console.log('Не удалось загрузить цели визита', err)
      }
    }
    loadGoals()
  }, [])


  // Обработка ошибок
  const displayError = error || apiError || goalsError || reasonsError
  useEffect(() => {
    if (!displayError) {
      lastErrorRef.current = null
      return
    }

    if (displayError === lastErrorRef.current) {
      return
    }

    pushToast({ type: 'error', title: 'Ошибка', message: displayError })
    lastErrorRef.current = displayError
  }, [displayError, pushToast])

  // Валидация формы
  const isFormValid = () => {
    const providers = form.notifications?.providers || {}
    const maxProvider = providers.max_via_green_api || {}
    const telegramProvider = providers.telegram || {}

    if (maxProvider.enabled) {
      if (!String(maxProvider.base_url || '').trim()) return false
      if (!String(maxProvider.instance_id || '').trim()) return false
      if (!String(maxProvider.api_token || '').trim()) return false
      if (!String(maxProvider.chat_id || '').trim()) return false
    }

    if (telegramProvider.enabled) {
      if (!String(telegramProvider.bot_token || '').trim()) return false
      if (!String(telegramProvider.chat_id || '').trim()) return false
    }

    const passIntegration = form.pass_integration || {}
    if (passIntegration.enabled) {
      if (!String(passIntegration.base_url || '').trim()) return false
      if (!String(passIntegration.login || '').trim()) return false
      if (!String(passIntegration.password || '').trim()) return false
      if (!String(passIntegration.object || '').trim()) return false
      if (!String(passIntegration.corpa || '').trim()) return false
    }

    return true
  }

  // Сохранение настроек
  const handleSave = async () => {
    if (calendarActionLoading) return
    if (!isFormValid()) {
      setError('Заполните все обязательные поля')
      return
    }

    try {
      setError(null)
      const settingsData = {
        notifications: form.notifications,
        pass_integration: form.pass_integration,
        production_calendar: {
          enabled: !!form.production_calendar?.enabled,
        },
      }
      const updatedSettings = await updateSettings(settingsData)
      setNotificationsInitial(cloneNotifications(settingsData.notifications))
      setPassesInitial({ ...settingsData.pass_integration })
      if (updatedSettings?.production_calendar) {
        setForm((prev) => ({
          ...prev,
          production_calendar: {
            enabled: !!updatedSettings.production_calendar.enabled,
            status: updatedSettings.production_calendar.status || null,
          },
        }))
        setProductionCalendarInitialEnabled(!!updatedSettings.production_calendar.enabled)
      }
      pushToast({
        type: 'success',
        title: 'Готово',
        message: 'Настройки успешно сохранены',
      })
    } catch (err) {
      setError(err.message || 'Ошибка при сохранении настроек')
    }
  }

  const handleLoadProductionCalendar = async () => {
    try {
      setError(null)
      setCalendarActionLoading(true)
      const updatedSettings = await loadProductionCalendarCurrentYear()
      if (updatedSettings?.production_calendar) {
        setForm((prev) => ({
          ...prev,
          production_calendar: {
            enabled: !!updatedSettings.production_calendar.enabled,
            status: updatedSettings.production_calendar.status || null,
          },
        }))
      }
      pushToast({
        type: 'success',
        title: 'Готово',
        message: `Календарь на ${currentYear} год загружен`,
      })
    } catch (err) {
      setError(err.message || 'Ошибка при загрузке производственного календаря')
    } finally {
      setCalendarActionLoading(false)
    }
  }

  const handleClearProductionCalendar = async () => {
    const confirmed = window.confirm(`Очистить производственный календарь за ${currentYear} год?`)
    if (!confirmed) return

    try {
      setError(null)
      setCalendarActionLoading(true)
      const updatedSettings = await clearProductionCalendarCurrentYear()
      if (updatedSettings?.production_calendar) {
        setForm((prev) => ({
          ...prev,
          production_calendar: {
            enabled: !!updatedSettings.production_calendar.enabled,
            status: updatedSettings.production_calendar.status || null,
          },
        }))
      }
      pushToast({
        type: 'warning',
        title: 'Очищено',
        message: `Календарь на ${currentYear} год очищен`,
      })
    } catch (err) {
      setError(err.message || 'Ошибка при очистке производственного календаря')
    } finally {
      setCalendarActionLoading(false)
    }
  }

  const handleCreateGoal = async () => {
    const name = newGoalName.trim()
    if (!name) {
      setError('Введите название цели визита')
      return
    }

    try {
      setError(null)
      await createGoal(name)
      const updatedGoals = await getAllGoals()
      setVisitGoals(updatedGoals)
      setNewGoalName('')
      setShowAddGoalForm(false)
      pushToast({
        type: 'success',
        title: 'Готово',
        message: 'Цель визита добавлена',
      })
    } catch (err) {
      setError(err.message || 'Ошибка при добавлении цели визита')
    }
  }

  const handleToggleGoal = async (goalId, nextActive) => {
    try {
      setError(null)
      await updateGoal(goalId, { is_active: nextActive })
      const updatedGoals = await getAllGoals()
      setVisitGoals(updatedGoals)
      pushToast({
        type: 'success',
        title: 'Готово',
        message: nextActive ? 'Цель визита восстановлена' : 'Цель визита скрыта',
      })
    } catch (err) {
      setError(err.message || 'Ошибка при обновлении цели визита')
    }
  }

  const startEditGoal = (goal) => {
    setEditingGoalId(goal.id)
    setEditingGoalName(goal.name)
    setError(null)
  }

  const cancelEditGoal = () => {
    setEditingGoalId(null)
    setError(null)
  }

  const handleUpdateGoalName = async (goalId) => {
    const name = editingGoalName.trim()
    if (!name) {
      setError('Введите название цели')
      return
    }
    try {
      setError(null)
      await updateGoal(goalId, { name })
      const updatedGoals = await getAllGoals()
      setVisitGoals(updatedGoals)
      setEditingGoalId(null)
      pushToast({ type: 'success', title: 'Готово', message: 'Цель визита обновлена' })
    } catch (err) {
      setError(err.message || 'Ошибка при сохранении цели визита')
    }
  }

  const handleCreateReason = async () => {
    const name = newReasonName.trim()
    if (!name) {
      setError('Введите название причины')
      return
    }
    try {
      setError(null)
      await apiPost('/reasons', { name })
      await loadAllReasons()
      setNewReasonName('')
      setShowAddReasonForm(false)
      pushToast({ type: 'success', title: 'Готово', message: 'Причина добавлена' })
    } catch (err) {
      setError(err.message || 'Ошибка при добавлении причины')
    }
  }

  const handleToggleReason = async (reasonId, nextActive) => {
    try {
      setError(null)
      await apiPatch(`/reasons/${reasonId}`, { is_active: nextActive })
      await loadAllReasons()
      await loadAllAllowedReasons()
      pushToast({
        type: 'success',
        title: 'Готово',
        message: nextActive ? 'Причина восстановлена' : 'Причина скрыта',
      })
    } catch (err) {
      setError(err.message || 'Ошибка при обновлении причины')
    }
  }

  const startEditReason = (reason) => {
    setEditingReasonId(reason.id)
    setEditingReasonName(reason.name)
    setError(null)
  }

  const cancelEditReason = () => {
    setEditingReasonId(null)
    setError(null)
  }

  const handleUpdateReasonName = async (reasonId) => {
    const name = editingReasonName.trim()
    if (!name) {
      setError('Название причины не может быть пустым')
      return
    }
    try {
      setError(null)
      await apiPatch(`/reasons/${reasonId}`, { name })
      await loadAllReasons()
      setEditingReasonId(null)
      pushToast({ type: 'success', title: 'Готово', message: 'Причина обновлена' })
    } catch (err) {
      setError(err.message || 'Ошибка при обновлении причины')
    }
  }

  const handleToggleAllowed = (reasonId, state) => {
    setAllowedReasonIdsByState((prev) => {
      const next = new Set(prev[state])
      if (next.has(reasonId)) next.delete(reasonId)
      else next.add(reasonId)
      return { ...prev, [state]: next }
    })
  }

  const isReasonsDirty = [40, 50, 60].some((s) => {
    const cur = allowedReasonIdsByState[s] || new Set()
    const init = allowedReasonIdsByStateInitial[s] || new Set()
    if (cur.size !== init.size) return true
    for (const id of cur) if (!init.has(id)) return true
    return false
  })

  const handleCancelReasons = () => {
    setAllowedReasonIdsByState({
      40: new Set(allowedReasonIdsByStateInitial[40]),
      50: new Set(allowedReasonIdsByStateInitial[50]),
      60: new Set(allowedReasonIdsByStateInitial[60]),
    })
    setError(null)
  }

  const handleSaveAllowed = async () => {
    try {
      setError(null)
      setAllowedLoading(true)
      await Promise.all([
        apiPut('/states/40/reasons', { reason_ids: Array.from(allowedReasonIdsByState[40]) }),
        apiPut('/states/50/reasons', { reason_ids: Array.from(allowedReasonIdsByState[50]) }),
        apiPut('/states/60/reasons', { reason_ids: Array.from(allowedReasonIdsByState[60]) }),
      ])
      await loadAllAllowedReasons()
      pushToast({ type: 'success', title: 'Готово', message: 'Списки причин сохранены' })
    } catch (err) {
      setError(err.message || 'Ошибка при сохранении списков причин')
    } finally {
      setAllowedLoading(false)
    }
  }

  // Переключение типа уведомления
  const toggleNotificationType = (typeKey) => {
    setForm((prev) => {
      const enabledList = prev.notifications.enabled_notification_types
      const enabled = enabledList.includes(typeKey)
      return {
        ...prev,
        notifications: {
          ...prev.notifications,
          enabled_notification_types: enabled
            ? enabledList.filter((t) => t !== typeKey)
            : [...enabledList, typeKey],
        },
      }
    })
  }

  // Обновление конфигурации провайдера
  const updateProviderConfig = (providerKey, field, value) => {
    setForm((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        providers: {
          ...prev.notifications.providers,
          [providerKey]: {
            ...prev.notifications.providers[providerKey],
            [field]: value,
          },
        },
      },
    }))
  }

  const toggleProviderEnabled = (providerKey, nextValue) => {
    setForm((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        providers: {
          ...prev.notifications.providers,
          [providerKey]: {
            ...prev.notifications.providers[providerKey],
            enabled: nextValue,
          },
        },
      },
    }))
  }

  const productionCalendarStatus = form.production_calendar?.status || null
  const isProductionCalendarLoaded = !!productionCalendarStatus?.is_complete_for_current_year
  const formatStatusDateTime = (isoValue) => {
    if (!isoValue) return null
    const date = new Date(isoValue)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleString('ru-RU')
  }
  const lastLoadedAtText = formatStatusDateTime(productionCalendarStatus?.last_loaded_at)
  const lastClearedAtText = formatStatusDateTime(productionCalendarStatus?.last_cleared_at)
  const productionCalendarStatusText = isProductionCalendarLoaded
    ? `Календарь за ${productionCalendarStatus?.current_year || currentYear} год загружен (${productionCalendarStatus?.loaded_days_count || 0}/${productionCalendarStatus?.expected_days_count || 0} дней).`
    : `Календарь за ${productionCalendarStatus?.current_year || currentYear} год не загружен полностью (${productionCalendarStatus?.loaded_days_count || 0}/${productionCalendarStatus?.expected_days_count || 0} дней).`
  const productionCalendarMetaText = lastLoadedAtText
    ? `Последняя загрузка: ${lastLoadedAtText}`
    : lastClearedAtText
      ? `Последняя очистка: ${lastClearedAtText}`
      : 'Загрузок еще не было'
  const isCalendarDirty =
    !!form.production_calendar &&
    !!(section === 'production-calendar') &&
    !!(form.production_calendar.enabled !== productionCalendarInitialEnabled)

  const handleCancelProductionCalendar = () => {
    setForm((prev) => ({
      ...prev,
      production_calendar: {
        ...(prev.production_calendar || {}),
        enabled: productionCalendarInitialEnabled,
      },
    }))
  }

  const showNotifications = section === 'all' || section === 'notifications'
  const showPasses = section === 'all' || section === 'passes'
  const showCalendar = section === 'all' || section === 'production-calendar'
  const showVisitDictionaries = section === 'all' || section === 'visit-dictionaries'
  const canSaveSettings = showNotifications || showPasses
  const showHeaderSave = canSaveSettings && !showNotifications
  const panelClassName = 'panel'
  const isNotificationsDirty =
    JSON.stringify(form.notifications) !== JSON.stringify(notificationsInitial)
  const handleCancelNotifications = () => {
    setForm((prev) => ({
      ...prev,
      notifications: cloneNotifications(notificationsInitial),
    }))
  }
  const isPassesDirty =
    JSON.stringify(form.pass_integration) !== JSON.stringify(passesInitial)
  const handleCancelPasses = () => {
    setForm((prev) => ({
      ...prev,
      pass_integration: { ...passesInitial },
    }))
  }

  if (section === 'notifications') {
    return (
      <div className="section-stack">
        {error && <div className="error-message section-block-end">{error}</div>}
        <div className="panel section notify">
              <header className="section__header section__header--start">
                <h3 className="panel__title">MAX</h3>
              </header>
              <div className="section__body">
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={form.notifications.providers.max_via_green_api.enabled}
                    onChange={(e) => toggleProviderEnabled('max_via_green_api', e.target.checked)}
                  />
                  <span className="text">Использовать</span>
                </label>
                <label className="notify__field">
                  <span className="text text--muted">Базовый URL:</span>
                  <input
                    type="text"
                    className="input text text--down notify__input"
                    value={form.notifications.providers.max_via_green_api.base_url}
                    onChange={(e) => updateProviderConfig('max_via_green_api', 'base_url', e.target.value)}
                    disabled={!form.notifications.providers.max_via_green_api.enabled}
                    placeholder="https://3100.api.green-api.com/v3"
                  />
                </label>
                <label className="notify__field">
                  <span className="text text--muted">Instance ID:</span>
                  <input
                    type="text"
                    className="input text text--down notify__input"
                    value={form.notifications.providers.max_via_green_api.instance_id}
                    onChange={(e) => updateProviderConfig('max_via_green_api', 'instance_id', e.target.value)}
                    disabled={!form.notifications.providers.max_via_green_api.enabled}
                    placeholder="110000"
                  />
                </label>
                <label className="notify__field">
                  <span className="text text--muted">API Token:</span>
                  <input
                    type="password"
                    className="input text text--down notify__input"
                    value={form.notifications.providers.max_via_green_api.api_token}
                    onChange={(e) => updateProviderConfig('max_via_green_api', 'api_token', e.target.value)}
                    disabled={!form.notifications.providers.max_via_green_api.enabled}
                    placeholder="token123"
                  />
                </label>
                <label className="notify__field">
                  <span className="text text--muted">Chat ID:</span>
                  <input
                    type="text"
                    className="input text text--down notify__input"
                    value={form.notifications.providers.max_via_green_api.chat_id}
                    onChange={(e) => updateProviderConfig('max_via_green_api', 'chat_id', e.target.value)}
                    disabled={!form.notifications.providers.max_via_green_api.enabled}
                    placeholder="chat123"
                  />
                </label>
              </div>
              <footer className="section__footer section__footer--end">
                <button
                  className="button button--small"
                  onClick={handleCancelNotifications}
                  disabled={loading || calendarActionLoading || !isNotificationsDirty}
                >
                  Отмена
                </button>
                <button
                  className="button button--small button--primary"
                  onClick={handleSave}
                  disabled={loading || calendarActionLoading || !isFormValid() || !isNotificationsDirty}
                >
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </footer>
            </div>

        <div className="panel section notify">
              <header className="section__header section__header--start">
                <h3 className="panel__title">Telegram</h3>
              </header>
              <div className="section__body">
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={form.notifications.providers.telegram.enabled}
                    onChange={(e) => toggleProviderEnabled('telegram', e.target.checked)}
                  />
                  <span className="text">Использовать</span>
                </label>
                <label className="notify__field">
                  <span className="text text--muted">Bot Token:</span>
                  <input
                    type="password"
                    className="input text text--down notify__input"
                    value={form.notifications.providers.telegram.bot_token}
                    onChange={(e) => updateProviderConfig('telegram', 'bot_token', e.target.value)}
                    disabled={!form.notifications.providers.telegram.enabled}
                    placeholder="token123"
                  />
                </label>
                <label className="notify__field">
                  <span className="text text--muted">Chat ID:</span>
                  <input
                    type="text"
                    className="input text text--down notify__input"
                    value={form.notifications.providers.telegram.chat_id}
                    onChange={(e) => updateProviderConfig('telegram', 'chat_id', e.target.value)}
                    disabled={!form.notifications.providers.telegram.enabled}
                    placeholder="chat456"
                  />
                </label>
              </div>
              <footer className="section__footer section__footer--end">
                <button
                  className="button button--small"
                  onClick={handleCancelNotifications}
                  disabled={loading || calendarActionLoading || !isNotificationsDirty}
                >
                  Отмена
                </button>
                <button
                  className="button button--small button--primary"
                  onClick={handleSave}
                  disabled={loading || calendarActionLoading || !isFormValid() || !isNotificationsDirty}
                >
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </footer>
            </div>

        <div className="panel section notify">
              <header className="section__header section__header--start">
                <h3 className="panel__title">Типы уведомлений</h3>
              </header>
              <div className="section__body">
                <div className="notify__types">
                  {availableTypes.map((type) => (
                    <label
                      key={type.code}
                      className="notify__type-item"
                    >
                      <input
                        type="checkbox"
                        checked={form.notifications.enabled_notification_types.includes(type.code)}
                        onChange={() => toggleNotificationType(type.code)}
                      />
                      <span>{type.title}</span>
                    </label>
                  ))}
                </div>
              </div>
              <footer className="section__footer section__footer--end">
                <button
                  className="button button--small"
                  onClick={handleCancelNotifications}
                  disabled={loading || calendarActionLoading || !isNotificationsDirty}
                >
                  Отмена
                </button>
                <button
                  className="button button--small button--primary"
                  onClick={handleSave}
                  disabled={loading || calendarActionLoading || !isFormValid() || !isNotificationsDirty}
                >
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </footer>
            </div>
      </div>
    );
  }

  if (section === 'passes') {
    return (
      <div className="section-stack">
        {error && <div className="error-message section-block-end">{error}</div>}
        <div className="panel section">
          <header className="section__header section__header--start">
            <h3 className="panel__title">Заказ пропусков (интеграция)</h3>
          </header>
          <div className="section__body">
            <label className="check-row">
              <input
                type="checkbox"
                checked={form.pass_integration.enabled}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    pass_integration: {
                      ...prev.pass_integration,
                      enabled: e.target.checked,
                    },
                  }))
                }
              />
              <span className="text">Использовать</span>
            </label>
            <label className="notify__field">
              <span className="text text--muted">API URL:</span>
              <input
                type="text"
                className="input text text--down notify__input"
                value={form.pass_integration.base_url}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    pass_integration: {
                      ...prev.pass_integration,
                      base_url: e.target.value,
                    },
                  }))
                }
                disabled={!form.pass_integration.enabled}
                placeholder="https://example.local/api"
              />
            </label>
            <label className="notify__field">
              <span className="text text--muted">Логин:</span>
              <input
                type="text"
                className="input text text--down notify__input"
                value={form.pass_integration.login}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    pass_integration: {
                      ...prev.pass_integration,
                      login: e.target.value,
                    },
                  }))
                }
                disabled={!form.pass_integration.enabled}
                placeholder="login"
              />
            </label>
            <label className="notify__field">
              <span className="text text--muted">Пароль:</span>
              <input
                type="password"
                className="input text text--down notify__input"
                value={form.pass_integration.password}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    pass_integration: {
                      ...prev.pass_integration,
                      password: e.target.value,
                    },
                  }))
                }
                disabled={!form.pass_integration.enabled}
                placeholder="password"
              />
            </label>
            <label className="notify__field">
              <span className="text text--muted">Object:</span>
              <input
                type="text"
                className="input text text--down notify__input"
                value={form.pass_integration.object}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    pass_integration: {
                      ...prev.pass_integration,
                      object: e.target.value,
                    },
                  }))
                }
                disabled={!form.pass_integration.enabled}
                placeholder="1"
              />
            </label>
            <label className="notify__field">
              <span className="text text--muted">Corpa:</span>
              <input
                type="text"
                className="input text text--down notify__input"
                value={form.pass_integration.corpa}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    pass_integration: {
                      ...prev.pass_integration,
                      corpa: e.target.value,
                    },
                  }))
                }
                disabled={!form.pass_integration.enabled}
                placeholder="Название организации"
              />
            </label>
          </div>
          <footer className="section__footer section__footer--end">
            <button
              className="button button--small"
              onClick={handleCancelPasses}
              disabled={loading || calendarActionLoading || !isPassesDirty}
            >
              Отмена
            </button>
            <button
              className="button button--small button--primary"
              onClick={handleSave}
              disabled={loading || calendarActionLoading || !isFormValid() || !isPassesDirty}
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </footer>
        </div>
      </div>
    );
  }

  const cancelAddGoalForm = () => {
    setShowAddGoalForm(false)
    setNewGoalName('')
    setError(null)
  }

  const renderVisitGoalsSection = (wrapItem = false) => (
    <div key="goals" className={`panel section${wrapItem ? ' section-group__item' : ''}`}>
      <header className="section__header section__header--between">
        <h3 className="panel__title">Цели визита</h3>
        <button
          className={`button button--primary button--small${showAddGoalForm ? ' action--hidden' : ''}`}
          onClick={() => {
            setShowAddGoalForm(true)
            setError(null)
          }}
          disabled={goalsLoading}
          tabIndex={showAddGoalForm ? -1 : 0}
          aria-hidden={showAddGoalForm}
        >
          + Добавить
        </button>
      </header>
      <div className="section__body section__body--scroll-x">
        <div className="visit-goals">
          <table className="table visit-goals__table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {visitGoals.map((goal) => (
                <tr
                  key={goal.id}
                  className={!goal.is_active ? 'visit-goals__row--inactive' : undefined}
                >
                  {editingGoalId === goal.id ? (
                    <>
                      <td>
                        <input
                          type="text"
                          className="input input--compact field--full"
                          value={editingGoalName}
                          onChange={(e) => setEditingGoalName(e.target.value)}
                        />
                      </td>
                      <td>
                        <div className="table__actions table__actions--nowrap">
                          <button
                            className="icon-action-button icon-action-button--primary"
                            onClick={() => handleUpdateGoalName(goal.id)}
                            disabled={goalsLoading}
                            title="Сохранить"
                            aria-label="Сохранить"
                          >
                            <i className="fa-solid fa-check" aria-hidden="true" />
                          </button>
                          <button
                            className="icon-action-button"
                            onClick={cancelEditGoal}
                            title="Отмена"
                            aria-label="Отмена"
                          >
                            <i className="fa-solid fa-xmark" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{goal.name}</td>
                      <td>
                        <div className="table__actions table__actions--nowrap">
                          <button
                            className="icon-action-button icon-action-button--primary"
                            onClick={() => startEditGoal(goal)}
                            disabled={!goal.is_active}
                            title={goal.is_active ? 'Редактировать' : 'Редактирование недоступно'}
                            aria-label="Редактировать"
                          >
                            <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                          </button>
                          {goal.is_active ? (
                            <button
                              className="icon-action-button icon-action-button--danger"
                              onClick={() => handleToggleGoal(goal.id, false)}
                              disabled={goalsLoading}
                              title="Деактивировать"
                              aria-label="Деактивировать"
                            >
                              <i className="fa-solid fa-user-minus" aria-hidden="true" />
                            </button>
                          ) : (
                            <button
                              className="icon-action-button icon-action-button--success"
                              onClick={() => handleToggleGoal(goal.id, true)}
                              disabled={goalsLoading}
                              title="Активировать"
                              aria-label="Активировать"
                            >
                              <i className="fa-solid fa-user-check" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {showAddGoalForm && (
                <tr>
                  <td>
                    <input
                      type="text"
                      className="input input--compact field--full"
                      placeholder="Новая цель визита"
                      value={newGoalName}
                      onChange={(e) => setNewGoalName(e.target.value)}
                    />
                  </td>
                  <td>
                    <div className="table__actions table__actions--nowrap">
                      <button
                        className="icon-action-button icon-action-button--primary"
                        onClick={handleCreateGoal}
                        disabled={goalsLoading || !newGoalName.trim()}
                        title="Сохранить"
                        aria-label="Сохранить"
                      >
                        <i className="fa-solid fa-check" aria-hidden="true" />
                      </button>
                      <button
                        className="icon-action-button"
                        onClick={cancelAddGoalForm}
                        title="Отмена"
                        aria-label="Отмена"
                      >
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const cancelAddReasonForm = () => {
    setShowAddReasonForm(false)
    setNewReasonName('')
    setError(null)
  }

  const renderVisitReasonsSection = (wrapItem = false) => (
    <div key="reasons" className={`panel section${wrapItem ? ' section-group__item' : ''}`}>
      <header className="section__header section__header--between">
        <h3 className="panel__title">Результаты и причины</h3>
        <button
          className={`button button--primary button--small${showAddReasonForm ? ' action--hidden' : ''}`}
          onClick={() => {
            setShowAddReasonForm(true)
            setError(null)
          }}
          disabled={reasonsLoading}
          tabIndex={showAddReasonForm ? -1 : 0}
          aria-hidden={showAddReasonForm}
        >
          + Добавить
        </button>
      </header>
      <div className="section__body section__body--scroll-x">
        <div className="visit-reasons">
          <table className="table visit-reasons__table">
            <thead>
              <tr>
                <th>Название причины</th>
                {REASON_STATES.map(({ value, label }) => (
                  <th key={value} title={label} className="visit-reasons__state-th">{value}</th>
                ))}
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {reasonsLoading ? (
                <tr>
                  <td colSpan={2 + REASON_STATES.length} className="text text--muted">
                    Загрузка...
                  </td>
                </tr>
              ) : allReasons.length === 0 && !showAddReasonForm ? (
                <tr>
                  <td colSpan={2 + REASON_STATES.length} className="text text--muted">
                    Причин пока нет
                  </td>
                </tr>
              ) : (
                <>
                  {allReasons.map((reason) => (
                    <tr
                      key={reason.id}
                      className={!reason.is_active ? 'visit-reasons__row--inactive' : undefined}
                    >
                      {editingReasonId === reason.id ? (
                        <>
                          <td>
                            <input
                              type="text"
                              className="input input--compact field--full"
                              value={editingReasonName}
                              onChange={(e) => setEditingReasonName(e.target.value)}
                            />
                          </td>
                          {REASON_STATES.map(({ value }) => (
                            <td key={value} className="visit-reasons__check-col">
                              <input
                                type="checkbox"
                                checked={allowedReasonIdsByState[value]?.has(reason.id) ?? false}
                                onChange={() => handleToggleAllowed(reason.id, value)}
                                className="visit-reasons__check"
                              />
                            </td>
                          ))}
                          <td>
                            <div className="table__actions table__actions--nowrap">
                              <button
                                className="icon-action-button icon-action-button--primary"
                                onClick={() => handleUpdateReasonName(reason.id)}
                                disabled={reasonsLoading}
                                title="Сохранить"
                                aria-label="Сохранить"
                              >
                                <i className="fa-solid fa-check" aria-hidden="true" />
                              </button>
                              <button
                                className="icon-action-button"
                                onClick={cancelEditReason}
                                title="Отмена"
                                aria-label="Отмена"
                              >
                                <i className="fa-solid fa-xmark" aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{reason.name}</td>
                          {REASON_STATES.map(({ value }) => (
                            <td key={value} className="visit-reasons__check-col">
                              <input
                                type="checkbox"
                                checked={allowedReasonIdsByState[value]?.has(reason.id) ?? false}
                                onChange={() => handleToggleAllowed(reason.id, value)}
                                className="visit-reasons__check"
                              />
                            </td>
                          ))}
                          <td>
                            <div className="table__actions table__actions--nowrap">
                              <button
                                className="icon-action-button icon-action-button--primary"
                                onClick={() => startEditReason(reason)}
                                disabled={!reason.is_active}
                                title={reason.is_active ? 'Редактировать' : 'Редактирование недоступно'}
                                aria-label="Редактировать"
                              >
                                <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                              </button>
                              {reason.is_active ? (
                                <button
                                  className="icon-action-button icon-action-button--danger"
                                  onClick={() => handleToggleReason(reason.id, false)}
                                  disabled={reasonsLoading}
                                  title="Деактивировать"
                                  aria-label="Деактивировать"
                                >
                                  <i className="fa-solid fa-user-minus" aria-hidden="true" />
                                </button>
                              ) : (
                                <button
                                  className="icon-action-button icon-action-button--success"
                                  onClick={() => handleToggleReason(reason.id, true)}
                                  disabled={reasonsLoading}
                                  title="Активировать"
                                  aria-label="Активировать"
                                >
                                  <i className="fa-solid fa-user-check" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {showAddReasonForm && (
                    <tr>
                      <td>
                        <input
                          type="text"
                          className="input input--compact field--full"
                          placeholder="Новая причина результата"
                          value={newReasonName}
                          onChange={(e) => setNewReasonName(e.target.value)}
                        />
                      </td>
                      {REASON_STATES.map(({ value }) => (
                        <td key={value} className="visit-reasons__check-col" />
                      ))}
                      <td>
                        <div className="table__actions table__actions--nowrap">
                          <button
                            className="icon-action-button icon-action-button--primary"
                            onClick={handleCreateReason}
                            disabled={reasonsLoading || !newReasonName.trim()}
                            title="Сохранить"
                            aria-label="Сохранить"
                          >
                            <i className="fa-solid fa-check" aria-hidden="true" />
                          </button>
                          <button
                            className="icon-action-button"
                            onClick={cancelAddReasonForm}
                            title="Отмена"
                            aria-label="Отмена"
                          >
                            <i className="fa-solid fa-xmark" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <footer className="section__footer section__footer--end">
        <button
          className="button button--small"
          onClick={handleCancelReasons}
          disabled={allowedLoading || !isReasonsDirty}
        >
          Отмена
        </button>
        <button
          className="button button--small button--primary"
          onClick={handleSaveAllowed}
          disabled={allowedLoading || !isReasonsDirty}
        >
          {allowedLoading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </footer>
    </div>
  )

  if (section === 'visit-dictionaries') {
    return (
      <div className="section-stack">
        {error && <div className="error-message section-block-end">{error}</div>}
        {renderVisitGoalsSection(false)}
        {renderVisitReasonsSection(false)}
      </div>
    );
  }

  return (
    <div>
      <div className={`${panelClassName} section`}>
        <header className="panel__header section__header section__header--between">
          <h2 className="panel__title">{SECTION_TITLES[section] || SECTION_TITLES.all}</h2>
          {showHeaderSave && (
            <button
              className="button button--primary button--small"
              onClick={handleSave}
              disabled={loading || calendarActionLoading || !isFormValid()}
            >
              {loading ? 'Сохранение...' : calendarActionLoading ? 'Операция с календарем...' : 'Сохранить'}
            </button>
          )}
        </header>

        <div className="section__body section-content">
          {error && <div className="error-message section-block-end">{error}</div>}

          {showNotifications && (
          <>
            <div className="section notify section-group__item">
              <header className="section__header section__header--start">
                <h3 className="panel__title">MAX</h3>
              </header>
              <div className="section__body">
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={form.notifications.providers.max_via_green_api.enabled}
                    onChange={(e) => toggleProviderEnabled('max_via_green_api', e.target.checked)}
                  />
                  <span className="text">Использовать</span>
                </label>
                <label className="notify__field">
                  <span className="text text--muted">Базовый URL:</span>
                  <input
                    type="text"
                    className="input text text--down notify__input"
                    value={form.notifications.providers.max_via_green_api.base_url}
                    onChange={(e) => updateProviderConfig('max_via_green_api', 'base_url', e.target.value)}
                    disabled={!form.notifications.providers.max_via_green_api.enabled}
                    placeholder="https://3100.api.green-api.com/v3"
                  />
                </label>
                <label className="notify__field">
                  <span className="text text--muted">Instance ID:</span>
                  <input
                    type="text"
                    className="input text text--down notify__input"
                    value={form.notifications.providers.max_via_green_api.instance_id}
                    onChange={(e) => updateProviderConfig('max_via_green_api', 'instance_id', e.target.value)}
                    disabled={!form.notifications.providers.max_via_green_api.enabled}
                    placeholder="110000"
                  />
                </label>
                <label className="notify__field">
                  <span className="text text--muted">API Token:</span>
                  <input
                    type="password"
                    className="input text text--down notify__input"
                    value={form.notifications.providers.max_via_green_api.api_token}
                    onChange={(e) => updateProviderConfig('max_via_green_api', 'api_token', e.target.value)}
                    disabled={!form.notifications.providers.max_via_green_api.enabled}
                    placeholder="token123"
                  />
                </label>
                <label className="notify__field">
                  <span className="text text--muted">Chat ID:</span>
                  <input
                    type="text"
                    className="input text text--down notify__input"
                    value={form.notifications.providers.max_via_green_api.chat_id}
                    onChange={(e) => updateProviderConfig('max_via_green_api', 'chat_id', e.target.value)}
                    disabled={!form.notifications.providers.max_via_green_api.enabled}
                    placeholder="chat123"
                  />
                </label>
              </div>
              <footer className="section__footer section__footer--end">
                <button
                  className="button button--small"
                  onClick={handleCancelNotifications}
                  disabled={loading || calendarActionLoading || !isNotificationsDirty}
                >
                  Отмена
                </button>
                <button
                  className="button button--small button--primary"
                  onClick={handleSave}
                  disabled={loading || calendarActionLoading || !isFormValid() || !isNotificationsDirty}
                >
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </footer>
            </div>

            <div className="section notify section-group__item">
              <header className="section__header section__header--start">
                <h3 className="panel__title">Telegram</h3>
              </header>
              <div className="section__body">
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={form.notifications.providers.telegram.enabled}
                    onChange={(e) => toggleProviderEnabled('telegram', e.target.checked)}
                  />
                  <span className="text">Использовать</span>
                </label>
                <label className="notify__field">
                  <span className="text text--muted">Bot Token:</span>
                  <input
                    type="password"
                    className="input text text--down notify__input"
                    value={form.notifications.providers.telegram.bot_token}
                    onChange={(e) => updateProviderConfig('telegram', 'bot_token', e.target.value)}
                    disabled={!form.notifications.providers.telegram.enabled}
                    placeholder="token123"
                  />
                </label>
                <label className="notify__field">
                  <span className="text text--muted">Chat ID:</span>
                  <input
                    type="text"
                    className="input text text--down notify__input"
                    value={form.notifications.providers.telegram.chat_id}
                    onChange={(e) => updateProviderConfig('telegram', 'chat_id', e.target.value)}
                    disabled={!form.notifications.providers.telegram.enabled}
                    placeholder="chat456"
                  />
                </label>
              </div>
              <footer className="section__footer section__footer--end">
                <button
                  className="button button--small"
                  onClick={handleCancelNotifications}
                  disabled={loading || calendarActionLoading || !isNotificationsDirty}
                >
                  Отмена
                </button>
                <button
                  className="button button--small button--primary"
                  onClick={handleSave}
                  disabled={loading || calendarActionLoading || !isFormValid() || !isNotificationsDirty}
                >
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </footer>
            </div>

            <div className="section notify section-group__item">
              <header className="section__header section__header--start">
                <h3 className="panel__title">Типы уведомлений</h3>
              </header>
              <div className="section__body">
                <div className="notify__types">
                  {availableTypes.map((type) => (
                    <label
                      key={type.code}
                      className="notify__type-item"
                    >
                      <input
                        type="checkbox"
                        checked={form.notifications.enabled_notification_types.includes(type.code)}
                        onChange={() => toggleNotificationType(type.code)}
                      />
                      <span>{type.title}</span>
                    </label>
                  ))}
                </div>
              </div>
              <footer className="section__footer section__footer--end">
                <button
                  className="button button--small"
                  onClick={handleCancelNotifications}
                  disabled={loading || calendarActionLoading || !isNotificationsDirty}
                >
                  Отмена
                </button>
                <button
                  className="button button--small button--primary"
                  onClick={handleSave}
                  disabled={loading || calendarActionLoading || !isFormValid() || !isNotificationsDirty}
                >
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </footer>
            </div>
          </>
          )}

          {showCalendar && (
          <div
            className={`section-group${
              section === 'production-calendar' ? ' section-group--compact-bottom' : ''
            }`}
          >
            {section === 'all' && (
              <h3 className="text text--up text--bold section-group__title">
                Производственный календарь
              </h3>
            )}

            <div className="section calendar">
              <div className="section__body">
                <label className="check-row">
                <input
                  type="checkbox"
                  checked={!!form.production_calendar?.enabled}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      production_calendar: {
                        ...(prev.production_calendar || {}),
                        enabled: e.target.checked,
                      },
                    }))
                  }
                />
                  <span className="text">Использовать производственный календарь</span>
                </label>

                <div
                  className={`text text--down calendar__status${
                    isProductionCalendarLoaded
                      ? ' calendar__status--loaded'
                      : ' calendar__status--missing'
                  }`}
                >
                  {productionCalendarStatusText}
                </div>
                <div className="text text--down text--muted calendar__meta">
                  {productionCalendarMetaText}
                </div>

                <div className="calendar__actions">
                  <button
                    className="button button--small button--primary"
                    onClick={handleLoadProductionCalendar}
                    disabled={loading || calendarActionLoading}
                  >
                    {calendarActionLoading ? 'Выполняется...' : `Загрузить ${currentYear}`}
                  </button>
                  <button
                    className="button button--small"
                    onClick={handleClearProductionCalendar}
                    disabled={loading || calendarActionLoading}
                  >
                    {calendarActionLoading ? 'Выполняется...' : `Очистить ${currentYear}`}
                  </button>
                </div>
              </div>

              {section === 'production-calendar' && (
                <div className="calendar__footer section__footer section__footer--end">
                  <button
                    className="button button--small"
                    onClick={handleCancelProductionCalendar}
                    disabled={loading || calendarActionLoading || !isCalendarDirty}
                  >
                    Отменить
                  </button>
                  <button
                    className="button button--primary button--small"
                    onClick={handleSave}
                    disabled={loading || calendarActionLoading || !isCalendarDirty}
                  >
                    Сохранить
                  </button>
                </div>
              )}
            </div>
          </div>
          )}

          {showPasses && (
            <div className="panel section section-group__item">
              <header className="section__header section__header--start">
                <h3 className="panel__title">Заказ пропусков (интеграция)</h3>
              </header>
              <div className="section__body">
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={form.pass_integration.enabled}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pass_integration: {
                          ...prev.pass_integration,
                          enabled: e.target.checked,
                        },
                      }))
                    }
                  />
                  <span className="text">Использовать</span>
                </label>
                <label className="notify__field">
                  <span className="text text--muted">API URL:</span>
                  <input
                    type="text"
                    className="input text text--down notify__input"
                    value={form.pass_integration.base_url}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pass_integration: {
                          ...prev.pass_integration,
                          base_url: e.target.value,
                        },
                      }))
                    }
                    disabled={!form.pass_integration.enabled}
                    placeholder="https://example.local/api"
                  />
                </label>
                <label className="notify__field">
                  <span className="text text--muted">Логин:</span>
                  <input
                    type="text"
                    className="input text text--down notify__input"
                    value={form.pass_integration.login}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pass_integration: {
                          ...prev.pass_integration,
                          login: e.target.value,
                        },
                      }))
                    }
                    disabled={!form.pass_integration.enabled}
                    placeholder="login"
                  />
                </label>
                <label className="notify__field">
                  <span className="text text--muted">Пароль:</span>
                  <input
                    type="password"
                    className="input text text--down notify__input"
                    value={form.pass_integration.password}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pass_integration: {
                          ...prev.pass_integration,
                          password: e.target.value,
                        },
                      }))
                    }
                    disabled={!form.pass_integration.enabled}
                    placeholder="password"
                  />
                </label>
                <label className="notify__field">
                  <span className="text text--muted">Object:</span>
                  <input
                    type="text"
                    className="input text text--down notify__input"
                    value={form.pass_integration.object}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pass_integration: {
                          ...prev.pass_integration,
                          object: e.target.value,
                        },
                      }))
                    }
                    disabled={!form.pass_integration.enabled}
                    placeholder="1"
                  />
                </label>
                <label className="notify__field">
                  <span className="text text--muted">Corpa:</span>
                  <input
                    type="text"
                    className="input text text--down notify__input"
                    value={form.pass_integration.corpa}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pass_integration: {
                          ...prev.pass_integration,
                          corpa: e.target.value,
                        },
                      }))
                    }
                    disabled={!form.pass_integration.enabled}
                    placeholder="Название организации"
                  />
                </label>
              </div>
              <footer className="section__footer section__footer--end">
                <button
                  className="button button--small"
                  onClick={handleCancelPasses}
                  disabled={loading || calendarActionLoading || !isPassesDirty}
                >
                  Отмена
                </button>
                <button
                  className="button button--small button--primary"
                  onClick={handleSave}
                  disabled={loading || calendarActionLoading || !isFormValid() || !isPassesDirty}
                >
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </footer>
            </div>
          )}

          {showVisitDictionaries && (
            <>
              {renderVisitGoalsSection(true)}
              {renderVisitReasonsSection(true)}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
