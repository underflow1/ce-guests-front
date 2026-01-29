import { useState } from 'react'
import { apiDelete } from '../utils/api'
import { useToast } from './ToastProvider'

const MaintenancePanel = ({ today, onBack, onSuccess }) => {
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
    <div style={{ padding: 'var(--space-6)' }}>
      <button
        className="button"
        onClick={onBack}
        style={{ marginBottom: '1rem' }}
      >
        ← Назад к записям
      </button>

      <div className="panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <header className="panel__header">
          <h2 className="panel__title">Обслуживание</h2>
        </header>

        <div className="panel__content">
          <div>
            <h3 style={{ marginBottom: 'var(--space-2)', fontSize: '14px', fontWeight: 600 }}>
              Очистка базы данных от событий
            </h3>
            <p style={{ marginBottom: 'var(--space-3)', fontSize: '13px', color: 'var(--color-text-muted)' }}>
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
  )
}

export default MaintenancePanel
