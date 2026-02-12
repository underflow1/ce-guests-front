import { useState } from 'react'
import { apiDelete } from '../utils/api'
import { useToast } from './ToastProvider'

const MaintenancePanel = ({ today, onBack, onSuccess, embedded = false }) => {
  const [loading, setLoading] = useState(false)
  const { pushToast } = useToast()

  const handleClearDatabase = async () => {
    const confirmed = window.confirm(
      'ВНИМАНИЕ! ЖЕСТКОЕ УДАЛЕНИЕ!\n\n' +
      'Вы уверены, что хотите полностью очистить базу данных от всех событий?\n\n' +
      'Это действие НЕОБРАТИМО и отменить его НЕВОЗМОЖНО!\n\n' +
      'Все события будут удалены навсегда!'
    )
    
    if (!confirmed) return

    try {
      setLoading(true)
      const response = await apiDelete('/entries/all')
      pushToast({
        type: 'success',
        title: 'Готово',
        message: `Успешно удалено ${response.deleted_count || 0} записей`,
      })
      
      // Обновляем данные если есть callback
      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 1000)
      }
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Ошибка',
        message: err.message || 'Ошибка при очистке базы данных',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: embedded ? 0 : 'var(--space-6)' }}>
      {!embedded && onBack && (
        <button
          className="button"
          onClick={onBack}
          style={{ marginBottom: '1rem' }}
        >
          ← Назад к записям
        </button>
      )}

      <div className="panel" style={{ maxWidth: embedded ? '100%' : '66.666%', margin: '0 auto' }}>
        <header className="panel__header settings-bar">
          <h2 className="panel__title">Очистка базы данных от событий</h2>
        </header>

        <div className="panel__content panel__content--flush-top">
          <div className="settings-section-shell settings-maintenance">
            <div className="settings-section-shell__body">
              <p className="text settings-maintenance__description">
                Жесткое удаление всех событий из базы данных. Это действие необратимо и отменить его невозможно!
              </p>
              <button
                className="button button--danger"
                onClick={handleClearDatabase}
                disabled={loading}
              >
                {loading ? 'Очистка...' : 'Очистить базу данных от событий'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MaintenancePanel
