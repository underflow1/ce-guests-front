import { useState, useEffect, useRef } from 'react'
import useSettings from '../hooks/useSettings'
import useVisitGoals from '../hooks/useVisitGoals'
import useMeetingResults from '../hooks/useMeetingResults'
import { useToast } from './ToastProvider'

const SettingsPanel = ({ onBack }) => {
  const { getSettings, updateSettings, loading, error: apiError } = useSettings()
  const {
    getAllGoals,
    createGoal,
    updateGoal,
    loading: goalsLoading,
    error: goalsError,
  } = useVisitGoals()
  const {
    getAllResults,
    createResult,
    updateResult,
    getAllReasons,
    createReason,
    updateReason,
    loading: meetingResultsLoading,
    error: meetingResultsError,
  } = useMeetingResults()
  const { pushToast } = useToast()
  const [error, setError] = useState(null)
  const lastErrorRef = useRef(null)
  const [visitGoals, setVisitGoals] = useState([])
  const [newGoalName, setNewGoalName] = useState('')
  const [meetingResults, setMeetingResults] = useState([])
  const [meetingResultReasons, setMeetingResultReasons] = useState([])
  const [selectedMeetingResultId, setSelectedMeetingResultId] = useState(null)
  const [newMeetingResultName, setNewMeetingResultName] = useState('')
  const [newMeetingReasonName, setNewMeetingReasonName] = useState('')
  const [meetingResultEdits, setMeetingResultEdits] = useState({})
  const [meetingReasonEdits, setMeetingReasonEdits] = useState({})

  // Типы уведомлений (fallback, если metadata отсутствует)
  const fallbackNotificationTypes = [
    { code: 'entry_created', title: 'Создание записи' },
    { code: 'entry_updated', title: 'Обновление записи' },
    { code: 'entry_completed', title: 'Гость отмечен как пришедший' },
    { code: 'entry_uncompleted', title: 'Гость отмечен как не пришедший' },
    { code: 'meeting_result_set', title: 'Результат встречи установлен' },
    { code: 'visit_cancelled', title: 'Визит отменен' },
    { code: 'visit_uncancelled', title: 'Отмена визита снята' },
    { code: 'entry_moved', title: 'Перенос записи' },
    { code: 'entry_deleted', title: 'Удаление записи' },
    { code: 'entries_deleted_all', title: 'Удаление всех записей' },
    { code: 'pass_ordered', title: 'Пропуск заказан' },
    { code: 'pass_order_failed', title: 'Не удалось заказать пропуск' },
    { code: 'pass_revoked', title: 'Пропуск отозван' },
  ]
  const [availableTypes, setAvailableTypes] = useState(fallbackNotificationTypes)

  // Форма настроек
  const [form, setForm] = useState({
    notifications: {
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
    },
    pass_integration: {
      enabled: false,
      base_url: '',
      login: '',
      password: '',
    },
  })

  // Загрузить настройки при монтировании
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getSettings()
        if (settings) {
          const notifications = settings.notifications || {}
          const passIntegration = settings.pass_integration || {}
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

          setForm({
            notifications: {
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
            },
            pass_integration: {
              enabled: !!passIntegration.enabled,
              base_url: passIntegration.base_url || '',
              login: passIntegration.login || '',
              password: passIntegration.password || '',
            },
          })
        }
      } catch (err) {
        // Если настройки не найдены, используем значения по умолчанию
        console.log('Настройки не найдены, используем значения по умолчанию')
      }
    }
    loadSettings()
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

  useEffect(() => {
    const loadMeetingResults = async () => {
      try {
        const results = await getAllResults()
        setMeetingResults(results)
        if (results.length > 0) {
          setSelectedMeetingResultId((prev) => prev || results[0].id)
        }
      } catch (err) {
        console.log('Не удалось загрузить результаты встреч', err)
      }
    }
    loadMeetingResults()
  }, [])

  useEffect(() => {
    const loadMeetingReasons = async () => {
      if (!selectedMeetingResultId) {
        setMeetingResultReasons([])
        return
      }
      try {
        const reasons = await getAllReasons(selectedMeetingResultId)
        setMeetingResultReasons(reasons)
      } catch (err) {
        console.log('Не удалось загрузить причины результата', err)
      }
    }
    loadMeetingReasons()
  }, [selectedMeetingResultId])

  useEffect(() => {
    setMeetingReasonEdits({})
    setNewMeetingReasonName('')
  }, [selectedMeetingResultId])

  // Обработка ошибок
  const displayError = error || apiError || goalsError || meetingResultsError
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
    }

    return true
  }

  // Сохранение настроек
  const handleSave = async () => {
    if (!isFormValid()) {
      setError('Заполните все обязательные поля')
      return
    }

    try {
      setError(null)
      const settingsData = {
        notifications: form.notifications,
        pass_integration: form.pass_integration,
      }
      await updateSettings(settingsData)
      pushToast({
        type: 'success',
        title: 'Готово',
        message: 'Настройки успешно сохранены',
      })
    } catch (err) {
      setError(err.message || 'Ошибка при сохранении настроек')
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

  const handleCreateMeetingResult = async () => {
    const name = newMeetingResultName.trim()
    if (!name) {
      setError('Введите название результата встречи')
      return
    }

    try {
      setError(null)
      const created = await createResult(name)
      const updatedResults = await getAllResults()
      setMeetingResults(updatedResults)
      setSelectedMeetingResultId(created?.id || null)
      setNewMeetingResultName('')
      pushToast({
        type: 'success',
        title: 'Готово',
        message: 'Результат встречи добавлен',
      })
    } catch (err) {
      setError(err.message || 'Ошибка при добавлении результата встречи')
    }
  }

  const handleToggleMeetingResult = async (resultId, nextActive) => {
    try {
      setError(null)
      await updateResult(resultId, { is_active: nextActive })
      const updatedResults = await getAllResults()
      setMeetingResults(updatedResults)
      pushToast({
        type: 'success',
        title: 'Готово',
        message: nextActive ? 'Результат встречи восстановлен' : 'Результат встречи скрыт',
      })
    } catch (err) {
      setError(err.message || 'Ошибка при обновлении результата встречи')
    }
  }

  const handleUpdateMeetingResultName = async (resultId) => {
    const original = meetingResults.find((item) => item.id === resultId)
    const nextName = (meetingResultEdits[resultId] ?? original?.name ?? '').trim()
    if (!nextName) {
      setError('Название результата встречи не может быть пустым')
      return
    }
    if (nextName === original?.name) return

    try {
      setError(null)
      await updateResult(resultId, { name: nextName })
      const updatedResults = await getAllResults()
      setMeetingResults(updatedResults)
      setMeetingResultEdits((prev) => {
        const next = { ...prev }
        delete next[resultId]
        return next
      })
      pushToast({
        type: 'success',
        title: 'Готово',
        message: 'Результат встречи обновлен',
      })
    } catch (err) {
      setError(err.message || 'Ошибка при обновлении результата встречи')
    }
  }

  const handleCreateMeetingReason = async () => {
    if (!selectedMeetingResultId) return
    const name = newMeetingReasonName.trim()
    if (!name) {
      setError('Введите название причины результата')
      return
    }

    try {
      setError(null)
      await createReason(selectedMeetingResultId, name)
      const updatedReasons = await getAllReasons(selectedMeetingResultId)
      setMeetingResultReasons(updatedReasons)
      setNewMeetingReasonName('')
      pushToast({
        type: 'success',
        title: 'Готово',
        message: 'Причина результата добавлена',
      })
    } catch (err) {
      setError(err.message || 'Ошибка при добавлении причины результата')
    }
  }

  const handleToggleMeetingReason = async (reasonId, nextActive) => {
    try {
      setError(null)
      await updateReason(reasonId, { is_active: nextActive })
      const updatedReasons = await getAllReasons(selectedMeetingResultId)
      setMeetingResultReasons(updatedReasons)
      pushToast({
        type: 'success',
        title: 'Готово',
        message: nextActive ? 'Причина результата восстановлена' : 'Причина результата скрыта',
      })
    } catch (err) {
      setError(err.message || 'Ошибка при обновлении причины результата')
    }
  }

  const handleUpdateMeetingReasonName = async (reasonId) => {
    const original = meetingResultReasons.find((item) => item.id === reasonId)
    const nextName = (meetingReasonEdits[reasonId] ?? original?.name ?? '').trim()
    if (!nextName) {
      setError('Название причины не может быть пустым')
      return
    }
    if (nextName === original?.name) return

    try {
      setError(null)
      await updateReason(reasonId, { name: nextName })
      const updatedReasons = await getAllReasons(selectedMeetingResultId)
      setMeetingResultReasons(updatedReasons)
      setMeetingReasonEdits((prev) => {
        const next = { ...prev }
        delete next[reasonId]
        return next
      })
      pushToast({
        type: 'success',
        title: 'Готово',
        message: 'Причина результата обновлена',
      })
    } catch (err) {
      setError(err.message || 'Ошибка при обновлении причины результата')
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

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <button className="button" onClick={onBack} style={{ marginBottom: '1rem' }}>
        ← Назад к записям
      </button>

      <div className="panel" style={{ maxWidth: '66.666%', margin: '0 auto' }}>
        <header className="panel__header">
          <h2 className="panel__title">Настройки</h2>
          <button
            className="button button--primary button--small"
            onClick={handleSave}
            disabled={loading || !isFormValid()}
            style={{
              gridColumn: 3,
            }}
          >
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </header>

        <div className="panel__content" style={{ maxHeight: '70vh' }}>
          {error && (
            <div className="error-message" style={{ marginBottom: 'var(--space-4)' }}>
              {error}
            </div>
          )}

          {/* Секция уведомлений */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h3 className="text text--up text--bold" style={{ marginBottom: 'var(--space-3)' }}>
              Уведомления
            </h3>

            <div
              style={{
                padding: 'var(--space-4)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface-muted)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <label className="text" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.notifications.providers.max_via_green_api.enabled}
                  onChange={(e) => toggleProviderEnabled('max_via_green_api', e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span>Мессенджер MAX (через Green API)</span>
              </label>

              <div style={{ marginTop: 'var(--space-3)' }}>
                <label className="text text--muted" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Базовый URL:
                </label>
                <input
                  type="text"
                  className="input text text--down"
                  value={form.notifications.providers.max_via_green_api.base_url}
                  onChange={(e) => updateProviderConfig('max_via_green_api', 'base_url', e.target.value)}
                  disabled={!form.notifications.providers.max_via_green_api.enabled}
                  placeholder="https://3100.api.green-api.com/v3"
                  style={{ width: '100%', padding: '4px 6px' }}
                />
              </div>

              <div style={{ marginTop: 'var(--space-3)' }}>
                <label className="text text--muted" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Instance ID:
                </label>
                <input
                  type="text"
                  className="input text text--down"
                  value={form.notifications.providers.max_via_green_api.instance_id}
                  onChange={(e) => updateProviderConfig('max_via_green_api', 'instance_id', e.target.value)}
                  disabled={!form.notifications.providers.max_via_green_api.enabled}
                  placeholder="110000"
                  style={{ width: '100%', padding: '4px 6px' }}
                />
              </div>

              <div style={{ marginTop: 'var(--space-3)' }}>
                <label className="text text--muted" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  API Token:
                </label>
                <input
                  type="text"
                  className="input text text--down"
                  value={form.notifications.providers.max_via_green_api.api_token}
                  onChange={(e) => updateProviderConfig('max_via_green_api', 'api_token', e.target.value)}
                  disabled={!form.notifications.providers.max_via_green_api.enabled}
                  placeholder="token123"
                  style={{ width: '100%', padding: '4px 6px' }}
                />
              </div>

              <div style={{ marginTop: 'var(--space-3)' }}>
                <label className="text text--muted" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Chat ID:
                </label>
                <input
                  type="text"
                  className="input text text--down"
                  value={form.notifications.providers.max_via_green_api.chat_id}
                  onChange={(e) => updateProviderConfig('max_via_green_api', 'chat_id', e.target.value)}
                  disabled={!form.notifications.providers.max_via_green_api.enabled}
                  placeholder="chat123"
                  style={{ width: '100%', padding: '4px 6px' }}
                />
              </div>
            </div>

            <div
              style={{
                padding: 'var(--space-4)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface-muted)',
              }}
            >
              <label className="text" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.notifications.providers.telegram.enabled}
                  onChange={(e) => toggleProviderEnabled('telegram', e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span>Telegram (Bot API)</span>
              </label>

              <div style={{ marginTop: 'var(--space-3)' }}>
                <label className="text text--muted" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Bot Token:
                </label>
                <input
                  type="text"
                  className="input text text--down"
                  value={form.notifications.providers.telegram.bot_token}
                  onChange={(e) => updateProviderConfig('telegram', 'bot_token', e.target.value)}
                  disabled={!form.notifications.providers.telegram.enabled}
                  placeholder="token123"
                  style={{ width: '100%', padding: '4px 6px' }}
                />
              </div>

              <div style={{ marginTop: 'var(--space-3)' }}>
                <label className="text text--muted" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Chat ID:
                </label>
                <input
                  type="text"
                  className="input text text--down"
                  value={form.notifications.providers.telegram.chat_id}
                  onChange={(e) => updateProviderConfig('telegram', 'chat_id', e.target.value)}
                  disabled={!form.notifications.providers.telegram.enabled}
                  placeholder="chat456"
                  style={{ width: '100%', padding: '4px 6px' }}
                />
              </div>
            </div>
          </div>

          {/* Секция интеграции пропусков */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h3 className="text text--up text--bold" style={{ marginBottom: 'var(--space-3)' }}>
              Заказ пропусков (интеграция)
            </h3>

            <div
              style={{
                padding: 'var(--space-4)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface-muted)',
              }}
            >
              <label className="text" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
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
                  style={{ cursor: 'pointer' }}
                />
                <span>Включить интеграцию</span>
              </label>

              <div style={{ marginTop: 'var(--space-3)' }}>
                <label className="text text--muted" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  API URL:
                </label>
                <input
                  type="text"
                  className="input text text--down"
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
                  style={{ width: '100%', padding: '4px 6px' }}
                />
              </div>

              <div style={{ marginTop: 'var(--space-3)' }}>
                <label className="text text--muted" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Логин:
                </label>
                <input
                  type="text"
                  className="input text text--down"
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
                  style={{ width: '100%', padding: '4px 6px' }}
                />
              </div>

              <div style={{ marginTop: 'var(--space-3)' }}>
                <label className="text text--muted" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Пароль:
                </label>
                <input
                  type="password"
                  className="input text text--down"
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
                  style={{ width: '100%', padding: '4px 6px' }}
                />
              </div>
            </div>
          </div>

          {/* Секция типов уведомлений */}
          <div>
            <h3 className="text text--up text--bold" style={{ marginBottom: 'var(--space-3)' }}>
              Типы уведомлений
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {availableTypes.map((type) => (
                <label
                  key={type.code}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.notifications.enabled_notification_types.includes(type.code)}
                    onChange={() => toggleNotificationType(type.code)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>{type.title}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Секция целей визита */}
          <div style={{ marginTop: 'var(--space-6)' }}>
            <h3 className="text text--up text--bold" style={{ marginBottom: 'var(--space-3)' }}>
              Цели визита
            </h3>

            <div
              style={{
                padding: 'var(--space-4)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface-muted)',
                display: 'flex',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-4)',
                flexWrap: 'wrap',
              }}
            >
              <input
                type="text"
                className="input text text--down"
                value={newGoalName}
                onChange={(e) => setNewGoalName(e.target.value)}
                placeholder="Новая цель визита"
                style={{ flex: '1 1 240px', minWidth: 200, padding: '4px 6px' }}
              />
              <button
                className="button button--primary button--small"
                onClick={handleCreateGoal}
                disabled={goalsLoading}
              >
                Добавить
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {visitGoals.length === 0 ? (
                <div className="text text--muted">Целей визита пока нет</div>
              ) : (
                visitGoals.map((goal) => (
                  <div
                    key={goal.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-2) var(--space-3)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-surface)',
                    }}
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

          {/* Секция результатов встреч */}
          <div style={{ marginTop: 'var(--space-6)' }}>
            <h3 className="text text--up text--bold" style={{ marginBottom: 'var(--space-3)' }}>
              Результаты встреч
            </h3>

            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 280px', minWidth: 260 }}>
                <div
                  style={{
                    padding: 'var(--space-4)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-surface-muted)',
                    display: 'flex',
                    gap: 'var(--space-2)',
                    marginBottom: 'var(--space-4)',
                    flexWrap: 'wrap',
                  }}
                >
                  <input
                    type="text"
                    className="input text text--down"
                    value={newMeetingResultName}
                    onChange={(e) => setNewMeetingResultName(e.target.value)}
                    placeholder="Новый результат"
                    style={{ flex: '1 1 240px', minWidth: 200, padding: '4px 6px' }}
                  />
                  <button
                    className="button button--primary button--small"
                    onClick={handleCreateMeetingResult}
                    disabled={meetingResultsLoading}
                  >
                    Добавить
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {meetingResults.length === 0 ? (
                    <div className="text text--muted">Результатов пока нет</div>
                  ) : (
                    meetingResults.map((result) => {
                      const editValue = meetingResultEdits[result.id] ?? result.name
                      const isSelected = selectedMeetingResultId === result.id
                      const isNameChanged = editValue.trim() && editValue.trim() !== result.name
                      return (
                        <div
                          key={result.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 'var(--space-3)',
                            padding: 'var(--space-2) var(--space-3)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: isSelected ? 'var(--color-surface-muted)' : 'var(--color-surface)',
                          }}
                        >
                          <div style={{ flex: '1 1 auto' }}>
                            <input
                              type="text"
                              className="input text text--down"
                              value={editValue}
                              onChange={(e) =>
                                setMeetingResultEdits((prev) => ({
                                  ...prev,
                                  [result.id]: e.target.value,
                                }))
                              }
                              style={{ width: '100%', padding: '4px 6px' }}
                            />
                            <div className="text text--down text--muted" style={{ marginTop: '4px' }}>
                              {result.is_active ? 'Активен' : 'Неактивен'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                            <button
                              className="button button--small"
                              onClick={() => setSelectedMeetingResultId(result.id)}
                            >
                              {isSelected ? 'Выбран' : 'Выбрать'}
                            </button>
                            <button
                              className="button button--small"
                              onClick={() => handleUpdateMeetingResultName(result.id)}
                              disabled={!isNameChanged}
                            >
                              Сохранить
                            </button>
                            <button
                              className={`button button--small${result.is_active ? '' : ' button--primary'}`}
                              onClick={() => handleToggleMeetingResult(result.id, !result.is_active)}
                              disabled={meetingResultsLoading}
                            >
                              {result.is_active ? 'Скрыть' : 'Восстановить'}
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div style={{ flex: '1 1 320px', minWidth: 280 }}>
                {!selectedMeetingResultId ? (
                  <div className="text text--muted">Выберите результат, чтобы редактировать причины</div>
                ) : (
                  <>
                    <div
                      style={{
                        padding: 'var(--space-4)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--color-surface-muted)',
                        display: 'flex',
                        gap: 'var(--space-2)',
                        marginBottom: 'var(--space-4)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <input
                        type="text"
                        className="input text text--down"
                        value={newMeetingReasonName}
                        onChange={(e) => setNewMeetingReasonName(e.target.value)}
                        placeholder="Новая причина"
                        style={{ flex: '1 1 240px', minWidth: 200, padding: '4px 6px' }}
                      />
                      <button
                        className="button button--primary button--small"
                        onClick={handleCreateMeetingReason}
                        disabled={meetingResultsLoading}
                      >
                        Добавить
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {meetingResultReasons.length === 0 ? (
                        <div className="text text--muted">Причин пока нет</div>
                      ) : (
                        meetingResultReasons.map((reason) => {
                          const editValue = meetingReasonEdits[reason.id] ?? reason.name
                          const isNameChanged = editValue.trim() && editValue.trim() !== reason.name
                          return (
                            <div
                              key={reason.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 'var(--space-3)',
                                padding: 'var(--space-2) var(--space-3)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'var(--color-surface)',
                              }}
                            >
                              <div style={{ flex: '1 1 auto' }}>
                                <input
                                  type="text"
                                  className="input text text--down"
                                  value={editValue}
                                  onChange={(e) =>
                                    setMeetingReasonEdits((prev) => ({
                                      ...prev,
                                      [reason.id]: e.target.value,
                                    }))
                                  }
                                  style={{ width: '100%', padding: '4px 6px' }}
                                />
                                <div className="text text--down text--muted" style={{ marginTop: '4px' }}>
                                  {reason.is_active ? 'Активна' : 'Неактивна'}
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                <button
                                  className="button button--small"
                                  onClick={() => handleUpdateMeetingReasonName(reason.id)}
                                  disabled={!isNameChanged}
                                >
                                  Сохранить
                                </button>
                                <button
                                  className={`button button--small${reason.is_active ? '' : ' button--primary'}`}
                                  onClick={() => handleToggleMeetingReason(reason.id, !reason.is_active)}
                                  disabled={meetingResultsLoading}
                                >
                                  {reason.is_active ? 'Скрыть' : 'Восстановить'}
                                </button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
