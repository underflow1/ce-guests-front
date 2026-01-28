import { useState } from 'react'
import { apiDelete } from '../utils/api'
import { toDateKey } from '../utils/date'
import { useToast } from './ToastProvider'

const MaintenancePanel = ({ today, onBack, onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const { pushToast } = useToast()

  const handleDeleteAll = async () => {
    const confirmed = window.confirm(
      'Вы уверены, что хотите удалить ВСЕ события из базы данных?\n\nЭто действие нельзя отменить!'
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
        message: err.message || 'Ошибка при удалении записей',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteFuture = async () => {
    const todayKey = toDateKey(today)
    const confirmed = window.confirm(
      `Вы уверены, что хотите удалить все события от ${todayKey} и в будущем?\n\nЭто действие нельзя отменить!`
    )
    
    if (!confirmed) return

    try {
      setLoading(true)
      const response = await apiDelete(`/entries/future?today=${todayKey}`)
      pushToast({
        type: 'success',
        title: 'Готово',
        message: `Успешно удалено ${response.deleted_count || 0} записей от ${todayKey} и в будущем`,
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
        message: err.message || 'Ошибка при удалении записей',
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <h3 style={{ marginBottom: 'var(--space-2)', fontSize: '14px', fontWeight: 600 }}>
                Очистить все события
              </h3>
              <p style={{ marginBottom: 'var(--space-3)', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Удаляет все события из базы данных (мягкое удаление). Это действие нельзя отменить.
              </p>
              <button
                className="button button--danger"
                onClick={handleDeleteAll}
                disabled={loading}
              >
                {loading ? 'Удаление...' : 'Очистить все события'}
              </button>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--space-4)' }}>
              <h3 style={{ marginBottom: 'var(--space-2)', fontSize: '14px', fontWeight: 600 }}>
                Очистить текущее и будущее
              </h3>
              <p style={{ marginBottom: 'var(--space-3)', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Удаляет все события от сегодняшнего дня и в будущем (мягкое удаление). Это действие нельзя отменить.
              </p>
              <button
                className="button button--danger"
                onClick={handleDeleteFuture}
                disabled={loading}
              >
                {loading ? 'Удаление...' : 'Очистить текущее и будущее'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MaintenancePanel
