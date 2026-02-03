import { useState, useCallback } from 'react'
import { apiGet, apiPost, apiPatch } from '../utils/api'

const useMeetingResults = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const getActiveResults = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet('/meeting-results')
      return response?.results || []
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getAllResults = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet('/meeting-results/all')
      return response?.results || []
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const createResult = useCallback(async (name) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiPost('/meeting-results', { name })
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateResult = useCallback(async (resultId, data) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiPatch(`/meeting-results/${resultId}`, data)
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getActiveReasons = useCallback(async (resultId) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet(`/meeting-results/${resultId}/reasons`)
      return response?.reasons || []
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getAllReasons = useCallback(async (resultId) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet(`/meeting-results/${resultId}/reasons/all`)
      return response?.reasons || []
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const createReason = useCallback(async (resultId, name) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiPost(`/meeting-results/${resultId}/reasons`, { name })
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateReason = useCallback(async (reasonId, data) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiPatch(`/meeting-result-reasons/${reasonId}`, data)
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
    getActiveResults,
    getAllResults,
    createResult,
    updateResult,
    getActiveReasons,
    getAllReasons,
    createReason,
    updateReason,
  }
}

export default useMeetingResults
