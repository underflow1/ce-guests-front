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

  const [activeReasonState, setActiveReasonState] = useState(50) // 50=Не оформлен, 40=Отказ
  const [allowedReasonIds, setAllowedReasonIds] = useState(new Set())
  const [allowedLoading, setAllowedLoading] = useState(false)
  const [visitDictionaryTab, setVisitDictionaryTab] = useState('goals')
  const [productionCalendarInitialEnabled, setProductionCalendarInitialEnabled] = useState(false)

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
          setProductionCalendarInitialEnabled(!!productionCalendar.enabled)
        }
      } catch (err) {
        // Если настройки не найдены, используем значения по умолчанию
        console.log('Настройки не найдены, используем значения по умолчанию')
        setNotificationsInitial(cloneNotifications(createDefaultNotifications()))
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

  const loadAllowedReasons = async (state) => {
    const s = Number(state)
    if (![40, 50].includes(s)) return
    try {
      setAllowedLoading(true)
      const res = await apiGet(`/states/${s}/reasons/all`)
      const list = res?.reasons || []
      // Важно: разрешённые причины храним только в allowedReasonIds (галки).
      // Ранее тут был вызов setAllowedReasons(list), но такого state не существовало,
      // из-за чего переключение 40/50 ломалось и казалось, что списки "одинаковые".
      // Защита от гонки: применяем результат только если state не успел смениться.
      if (Number(activeReasonState) === s) {
        setAllowedReasonIds(new Set(list.map((r) => r.id)))
      }
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
    loadAllowedReasons(activeReasonState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReasonState])

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

  useEffect(() => {
    setReasonEdits({})
    setNewReasonName('')
  }, [activeReasonState])

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
      // если причина сейчас разрешена для выбранного state — просто перезагрузим список
      await loadAllowedReasons(activeReasonState)
      pushToast({
        type: 'success',
        title: 'Готово',
        message: nextActive ? 'Причина восстановлена' : 'Причина скрыта',
      })
    } catch (err) {
      setError(err.message || 'Ошибка при обновлении причины')
    }
  }

  const handleUpdateReasonName = async (reasonId) => {
    const original = allReasons.find((item) => item.id === reasonId)
    const nextName = (reasonEdits[reasonId] ?? original?.name ?? '').trim()
    if (!nextName) {
      setError('Название причины не может быть пустым')
      return
    }
    if (nextName === original?.name) return

    try {
      setError(null)
      await apiPatch(`/reasons/${reasonId}`, { name: nextName })
      await loadAllReasons()
      await loadAllowedReasons(activeReasonState)
      setReasonEdits((prev) => {
        const next = { ...prev }
        delete next[reasonId]
        return next
      })
      pushToast({ type: 'success', title: 'Готово', message: 'Причина обновлена' })
    } catch (err) {
      setError(err.message || 'Ошибка при обновлении причины')
    }
  }

  const handleToggleAllowed = (reasonId) => {
    setAllowedReasonIds((prev) => {
      const next = new Set(prev)
      if (next.has(reasonId)) next.delete(reasonId)
      else next.add(reasonId)
      return next
    })
  }

  const handleSaveAllowed = async () => {
    try {
      setError(null)
      const ids = Array.from(allowedReasonIds)
      await apiPut(`/states/${Number(activeReasonState)}/reasons`, { reason_ids: ids })
      await loadAllowedReasons(activeReasonState)
      pushToast({ type: 'success', title: 'Готово', message: 'Список причин сохранён' })
    } catch (err) {
      setError(err.message || 'Ошибка при сохранении списка причин')
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
            </div>
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
          <div className="section-block-end">
            <h3 className="text text--up text--bold section-title">
              Заказ пропусков (интеграция)
            </h3>

            <div className="section-card section-card__body">
              <label className="text check-inline">
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
                <span>Включить интеграцию</span>
              </label>

              <div className="field-stack">
                <label className="text text--muted field-label">
                  API URL:
                </label>
                <input
                  type="text"
                  className="input text text--down input--wide"
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
              </div>

              <div className="field-stack">
                <label className="text text--muted field-label">
                  Логин:
                </label>
                <input
                  type="text"
                  className="input text text--down input--wide"
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
              </div>

              <div className="field-stack">
                <label className="text text--muted field-label">
                  Пароль:
                </label>
                <input
                  type="password"
                  className="input text text--down input--wide"
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
              </div>

              <div className="field-stack">
                <label className="text text--muted field-label">
                  Object:
                </label>
                <input
                  type="text"
                  className="input text text--down input--wide"
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
              </div>

              <div className="field-stack">
                <label className="text text--muted field-label">
                  Corpa:
                </label>
                <input
                  type="text"
                  className="input text text--down input--wide"
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
              </div>
            </div>
          </div>
          )}

          {showVisitDictionaries && (
          <div className="section-block-start">
            <div className="row-wrap section-block-end">
              <button
                className={`button button--small${visitDictionaryTab === 'goals' ? ' button--primary' : ''}`}
                onClick={() => setVisitDictionaryTab('goals')}
              >
                Цели визита
              </button>
              <button
                className={`button button--small${visitDictionaryTab === 'reasons' ? ' button--primary' : ''}`}
                onClick={() => setVisitDictionaryTab('reasons')}
              >
                Результаты и причины
              </button>
            </div>

            {visitDictionaryTab === 'goals' ? (
              <div>
                <div className="section-card section-card__body row-wrap section-block-end">
                  <input
                    type="text"
                    className="input text text--down input--grow"
                    value={newGoalName}
                    onChange={(e) => setNewGoalName(e.target.value)}
                    placeholder="Новая цель визита"
                  />
                  <button
                    className="button button--primary button--small"
                    onClick={handleCreateGoal}
                    disabled={goalsLoading}
                  >
                    Добавить
                  </button>
                </div>

                <div className="column-stack">
                  {visitGoals.length === 0 ? (
                    <div className="text text--muted">Целей визита пока нет</div>
                  ) : (
                    visitGoals.map((goal) => (
                      <div
                        key={goal.id}
                        className="list-row"
                      >
                        <div>
                          <div className="text">{goal.name}</div>
                          <div className="text text--down text--muted">
                            {goal.is_active ? 'Активна' : 'Неактивна'}
                          </div>
                        </div>
                        <button
                          className={`button button--small${goal.is_active ? '' : ' button--primary'}`}
                          onClick={() => handleToggleGoal(goal.id, !goal.is_active)}
                          disabled={goalsLoading}
                        >
                          {goal.is_active ? 'Скрыть' : 'Восстановить'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="section-card section-card__body section-block-end">
                  <div className="text text--down text--muted section-label">
                    Где используются причины
                  </div>
                  <div className="row-wrap">
                    <button
                      className={`button button--small${Number(activeReasonState) === 50 ? ' button--primary' : ''}`}
                      onClick={() => setActiveReasonState(50)}
                    >
                      Не оформлен (50)
                    </button>
                    <button
                      className={`button button--small${Number(activeReasonState) === 40 ? ' button--primary' : ''}`}
                      onClick={() => setActiveReasonState(40)}
                    >
                      Отказ (40)
                    </button>
                  </div>
                </div>

                <div className="section-card section-card__body row-wrap section-block-end">
                  <input
                    type="text"
                    className="input text text--down input--grow"
                    value={newReasonName}
                    onChange={(e) => setNewReasonName(e.target.value)}
                    placeholder="Новая причина результата"
                  />
                  <button
                    className="button button--primary button--small"
                    onClick={handleCreateReason}
                    disabled={reasonsLoading}
                  >
                    Добавить
                  </button>
                </div>

                <div className="list-grid">
                  <div>
                    <div className="text text--down text--muted section-label">
                      Все причины
                    </div>
                    <div className="column-stack">
                      {reasonsLoading ? (
                        <div className="text text--muted">Загрузка...</div>
                      ) : allReasons.length === 0 ? (
                        <div className="text text--muted">Причин пока нет</div>
                      ) : (
                        allReasons.map((reason) => {
                          const editValue = reasonEdits[reason.id] ?? reason.name
                          const isNameChanged = editValue.trim() && editValue.trim() !== reason.name
                          return (
                            <div key={reason.id} className="list-row">
                              <div className="list-row__main">
                                <input
                                  type="text"
                                  className="input text text--down input--wide"
                                  value={editValue}
                                  onChange={(e) =>
                                    setReasonEdits((prev) => ({
                                      ...prev,
                                      [reason.id]: e.target.value,
                                    }))
                                  }
                                />
                                <div className="text text--down text--muted list-row__meta">
                                  {reason.is_active ? 'Активна' : 'Неактивна'}
                                </div>
                              </div>
                              <div className="column-stack">
                                <button
                                  className="button button--small"
                                  onClick={() => handleUpdateReasonName(reason.id)}
                                  disabled={!isNameChanged}
                                >
                                  Сохранить
                                </button>
                                <button
                                  className={`button button--small${reason.is_active ? '' : ' button--primary'}`}
                                  onClick={() => handleToggleReason(reason.id, !reason.is_active)}
                                  disabled={reasonsLoading}
                                >
                                  {reason.is_active ? 'Скрыть' : 'Восстановить'}
                                </button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text text--down text--muted section-label">
                      Разрешены для state={Number(activeReasonState)}
                    </div>
                    <div className="section-label">
                      <button
                        className="button button--small button--primary"
                        onClick={handleSaveAllowed}
                        disabled={allowedLoading}
                      >
                        Сохранить список
                      </button>
                    </div>
                    <div className="list-checklist">
                      {allowedLoading ? (
                        <div className="text text--muted">Загрузка...</div>
                      ) : allReasons.length === 0 ? (
                        <div className="text text--muted">Сначала добавьте причины</div>
                      ) : (
                        allReasons.map((reason) => {
                          const checked = allowedReasonIds.has(reason.id)
                          return (
                            <label
                              key={reason.id}
                              className="text text--down check-inline"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleToggleAllowed(reason.id)}
                              />
                              <span className={reason.is_active ? '' : 'item--inactive'}>{reason.name}</span>
                            </label>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
