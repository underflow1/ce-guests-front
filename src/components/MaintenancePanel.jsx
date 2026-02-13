import { useState } from 'react'
import { apiDelete } from '../utils/api'
import { useToast } from './ToastProvider'

const MaintenancePanel = ({ onSuccess }) => {
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
    <div>
      <div className="panel section">
        <header className="panel__header section__header section__header--start">
          <h2 className="panel__title">Очистка базы данных от событий</h2>
        </header>

        <div className="section__body">
          <div className="section maintenance">
            <div className="section__body">
              <p className="text maintenance__description">
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
