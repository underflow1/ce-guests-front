import { useState } from 'react'
import { apiDelete, apiGet, apiPost, apiPut } from '../utils/api'

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

  const loadProductionCalendarCurrentYear = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiPost('/settings/production-calendar/load-current-year', {})
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const clearProductionCalendarCurrentYear = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiDelete('/settings/production-calendar/current-year')
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
    loadProductionCalendarCurrentYear,
    clearProductionCalendarCurrentYear,
  }
}

export default useSettings
