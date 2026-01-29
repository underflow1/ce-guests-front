import { useState } from 'react'
import { apiGet, apiPut } from '../utils/api'

const useSettings = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Получить настройки
  const getSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet('/settings')
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Обновить настройки
  const updateSettings = async (settingsData) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiPut('/settings', settingsData)
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    getSettings,
    updateSettings,
  }
}

export default useSettings
