import { useState, useEffect, useRef } from 'react'
import useSettings from '../hooks/useSettings'
import useVisitGoals from '../hooks/useVisitGoals'
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
  const { pushToast } = useToast()
  const [error, setError] = useState(null)
  const lastErrorRef = useRef(null)
  const [visitGoals, setVisitGoals] = useState([])
  const [newGoalName, setNewGoalName] = useState('')

  // Типы уведомлений (fallback, если metadata отсутствует)
  const fallbackNotificationTypes = [
    { code: 'entry_created', title: 'Создание записи' },
    { code: 'entry_updated', title: 'Обновление записи' },
    { code: 'entry_completed', title: 'Гость отмечен как пришедший' },
    { code: 'entry_uncompleted', title: 'Гость отмечен как не пришедший' },
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

  // Обработка ошибок
  const displayError = error || apiError || goalsError
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
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
