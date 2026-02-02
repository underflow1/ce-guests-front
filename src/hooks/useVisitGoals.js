import { useState, useCallback } from 'react'
import { apiGet, apiPost, apiPatch } from '../utils/api'

const useVisitGoals = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const getActiveGoals = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet('/visit-goals')
      return response?.goals || []
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getAllGoals = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet('/visit-goals/all')
      return response?.goals || []
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const createGoal = useCallback(async (name) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiPost('/visit-goals', { name })
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateGoal = useCallback(async (goalId, data) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiPatch(`/visit-goals/${goalId}`, data)
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getActiveGoals,
    getAllGoals,
    createGoal,
    updateGoal,
  }
}

export default useVisitGoals
