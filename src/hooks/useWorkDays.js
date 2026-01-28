import { useEffect, useState } from 'react'
import { apiGet } from '../utils/api'
import { parseDateFromKey } from '../utils/date'

const useWorkDays = (today) => {
  const [tomorrow, setTomorrow] = useState(null)
  const [nextMonday, setNextMonday] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Не загружаем данные если today не передан (пользователь не авторизован)
    if (!today) {
      setLoading(false)
      return
    }

    let active = true

    const loadDateRange = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const data = await apiGet('/utils/date-range')
        
        if (!active) return

        // Преобразуем строки дат в объекты Date
        setTomorrow(parseDateFromKey(data.tomorrow))
        setNextMonday(parseDateFromKey(data.next_monday))
      } catch (err) {
        if (!active) return
        setError(err.message)
        console.error('Ошибка загрузки диапазона дат:', err)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadDateRange()

    return () => {
      active = false
    }
  }, [today])

  return { tomorrow, nextMonday, loading, error }
}

export default useWorkDays
