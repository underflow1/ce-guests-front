import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  apiPost, 
  apiGet, 
  setAccessToken, 
  getAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearTokens,
  refreshAccessToken as apiRefreshAccessToken,
  setLogoutCallback
} from '../utils/api'
import { useToast } from '../components/ToastProvider'

const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const refreshTimerRef = useRef(null)
  const isSchedulingRef = useRef(false)
  const { pushToast } = useToast()

  // Выход
  const handleLogout = useCallback(async () => {
    const refreshToken = getRefreshToken()
    
    // Останавливаем таймер обновления
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
    isSchedulingRef.current = false

    // Вызываем logout на бэкенде
    if (refreshToken) {
      try {
        await apiPost('/auth/logout', { refresh_token: refreshToken })
      } catch (err) {
        // Игнорируем ошибки при logout
        console.error('Ошибка при logout:', err)
      }
    }

    // Очищаем токены
    clearTokens()
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
  }, [pushToast])

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }
  }, [])

  // Установить callback для logout из api.js
  useEffect(() => {
    setLogoutCallback(() => {
      handleLogout()
    })
  }, [handleLogout])

  // Функция для планирования автоматического обновления токена
  const scheduleTokenRefresh = useCallback((expiresIn) => {
    // Защита от повторных вызовов
    if (isSchedulingRef.current) {
      return
    }

    // Очищаем предыдущий таймер если есть
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }

    // Правильный расчет задержки:
    // - Если expires_in > 60 секунд: обновляем за 1 минуту до истечения
    // - Если expires_in <= 60 секунд: обновляем за 10 секунд до истечения (минимум 10 секунд)
    let delay
    if (expiresIn > 60) {
      delay = (expiresIn - 60) * 1000
    } else {
      // Если осталось меньше 60 секунд, обновляем за 10 секунд до истечения
      delay = Math.max(expiresIn * 1000 - 10000, 10000) // Минимум 10 секунд
    }
    
    isSchedulingRef.current = true
    
    refreshTimerRef.current = setTimeout(async () => {
      isSchedulingRef.current = false
      try {
        const refreshData = await apiRefreshAccessToken()
        // Таймер для следующего обновления установится автоматически через refreshAccessToken
        // Но нам нужно установить его здесь тоже
        scheduleTokenRefresh(refreshData.expires_in)
      } catch (err) {
        // Если не удалось обновить, показываем сообщение и вызываем logout
        console.error('Ошибка автоматического обновления токена:', err)
        pushToast({ 
          type: 'error', 
          title: 'Сессия истекла', 
          message: 'Пожалуйста войдите снова' 
        })
        handleLogout()
      }
    }, delay)
  }, [handleLogout, pushToast])

  // Функция для обновления access token
  const refreshAccessToken = useCallback(async () => {
    try {
      const refreshData = await apiRefreshAccessToken()
      scheduleTokenRefresh(refreshData.expires_in)
      return refreshData
    } catch (err) {
      // Если refresh не удался, показываем сообщение и вызываем logout
      pushToast({ 
        type: 'error', 
        title: 'Сессия истекла', 
        message: 'Пожалуйста войдите снова' 
      })
      handleLogout()
      throw err
    }
  }, [scheduleTokenRefresh, handleLogout, pushToast])

  // Проверить авторизацию при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        setLoading(false)
        return
      }

      try {
        // Пытаемся обновить токен при загрузке приложения
        const refreshData = await apiRefreshAccessToken()
        scheduleTokenRefresh(refreshData.expires_in)
        
        // Получаем данные пользователя
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
        clearTokens()
        localStorage.clear()
        sessionStorage.clear()
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Запускаем только один раз при монтировании компонента

  // Логин
  const login = async (username, password) => {
    try {
      setError(null)
      const response = await apiPost('/auth/login', { username, password })
      
      // Сохраняем токены
      setAccessToken(response.access_token)
      setRefreshToken(response.refresh_token)
      
      // Устанавливаем таймер для автоматического обновления
      scheduleTokenRefresh(response.expires_in)
      
      // Небольшая задержка чтобы токены точно сохранились
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

  // Публичный метод logout
  const logout = useCallback(() => {
    handleLogout()
  }, [handleLogout])

  return {
    user,
    loading,
    error,
    login,
    logout,
    refreshAccessToken,
    isAuthenticated: !!user,
  }
}

export default useAuth
