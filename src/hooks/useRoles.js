import { useState } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'

const useRoles = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Получить список ролей
  const getRoles = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet('/roles')
      return response.roles
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Получить список прав
  const getPermissions = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet('/permissions')
      return response.permissions
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Получить роль по ID
  const getRole = async (roleId) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet(`/roles/${roleId}`)
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Создать роль
  const createRole = async (roleData) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiPost('/roles', roleData)
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Обновить роль
  const updateRole = async (roleId, roleData) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiPut(`/roles/${roleId}`, roleData)
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Удалить роль
  const deleteRole = async (roleId) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiDelete(`/roles/${roleId}`)
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
    getRoles,
    getPermissions,
    getRole,
    createRole,
    updateRole,
    deleteRole,
  }
}

export default useRoles
