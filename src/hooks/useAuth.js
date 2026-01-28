import { useState, useEffect } from 'react'
import { apiPost, apiGet, setAuthToken, getAuthToken } from '../utils/api'

const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Проверить авторизацию при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken()
      if (!token) {
        setLoading(false)
        return
      }

      try {
        // Принудительно получаем свежие данные пользователя без кеша
        const userData = await apiGet('/auth/me', {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
        setUser(userData)
      } catch (err) {
        // Токен невалидный, удаляем его и очищаем все данные
        setAuthToken(null)
        localStorage.clear()
        sessionStorage.clear()
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Логин
  const login = async (username, password) => {
    try {
      setError(null)
      const response = await apiPost('/auth/login', { username, password })
      // Сохраняем токен ПЕРЕД установкой user, чтобы он был доступен для последующих запросов
      setAuthToken(response.access_token)
      // Небольшая задержка чтобы токен точно сохранился в localStorage
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Перезагружаем страницу после логина чтобы полностью очистить состояние React
      // и избежать проблем с кешем при переключении между пользователями
      window.location.href = '/'
      
      return response
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  // Выход
  const logout = () => {
    setAuthToken(null)
    setUser(null)
    setError(null)
    
    // Очищаем все данные браузера
    try {
      // Очищаем localStorage
      localStorage.clear()
      
      // Очищаем sessionStorage
      sessionStorage.clear()
      
      // Очищаем кеш через Cache API (если используется)
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name)
          })
        })
      }
      
      // Перезагружаем страницу для полной очистки состояния
      window.location.href = '/'
    } catch (err) {
      console.error('Ошибка при очистке данных:', err)
      // В любом случае перезагружаем страницу
      window.location.href = '/'
    }
  }

  return {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
  }
}

export default useAuth
