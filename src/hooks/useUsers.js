import { useState } from 'react'
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../utils/api'

const useUsers = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Получить список пользователей
  const getUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet('/users')
      return response.users
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Создать пользователя
  const createUser = async (userData) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiPost('/users', userData)
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Обновить пользователя
  const updateUser = async (userId, userData) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiPut(`/users/${userId}`, userData)
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Активировать пользователя
  const activateUser = async (userId) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiPatch(`/users/${userId}/activate`, {})
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Деактивировать пользователя
  const deactivateUser = async (userId) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiPatch(`/users/${userId}/deactivate`, {})
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Удалить пользователя (деактивировать)
  const deleteUser = async (userId) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiDelete(`/users/${userId}`)
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
    getUsers,
    createUser,
    updateUser,
    activateUser,
    deactivateUser,
    deleteUser,
  }
}

export default useUsers
