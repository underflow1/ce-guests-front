import { API_BASE_URL, REFRESH_TOKEN_KEY } from '../config'

// Хранение access token в памяти (не в localStorage)
let accessToken = null

// Флаг для защиты от race conditions при refresh
let isRefreshing = false
let refreshPromise = null

// Callback для logout (будет установлен из useAuth)
let onLogoutCallback = null

// Установить callback для logout
export const setLogoutCallback = (callback) => {
  onLogoutCallback = callback
}

// Получить access token из памяти
export const getAccessToken = () => {
  return accessToken
}

// Установить access token в память
export const setAccessToken = (token) => {
  accessToken = token
}

// Получить refresh token из localStorage
export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

// Установить refresh token в localStorage
export const setRefreshToken = (token) => {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

// Очистить все токены
export const clearTokens = () => {
  accessToken = null
  setRefreshToken(null)
}

// Функция для обновления access token через refresh token
export const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken()
  
  if (!refreshToken) {
    throw new Error('No refresh token')
  }

  // Если уже идет refresh, возвращаем существующий промис
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  // Устанавливаем флаг и создаем промис для refresh
  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const url = `${API_BASE_URL}/auth/refresh`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
        cache: 'no-store',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: `HTTP ${response.status}: ${response.statusText}`,
        }))
        throw new Error(errorData.detail || 'Ошибка обновления токена')
      }

      const data = await response.json()
      
      // Обновляем токены
      accessToken = data.access_token
      setRefreshToken(data.refresh_token) // Новый refresh token (rotation)
      
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
      }
    } finally {
      // Сбрасываем флаг и промис
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// Базовый fetch с авторизацией и автоматическим refresh при 401
export const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`
  
  // Функция для выполнения запроса
  const makeRequest = async (token) => {
    const headers = {
      'Content-Type': 'application/json',
      // Принудительно отключаем кеш для всех запросов
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...options.headers,
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
      // Принудительно отключаем кеш браузера
      cache: 'no-store',
    })

    return response
  }

  // Выполняем запрос с текущим access token
  let response = await makeRequest(accessToken)

  // Если получили 401 и это не запрос на refresh/login/logout
  if (response.status === 401 && 
      !endpoint.includes('/auth/refresh') && 
      !endpoint.includes('/auth/login') && 
      !endpoint.includes('/auth/logout')) {
    
    try {
      // Пытаемся обновить токен
      const refreshData = await refreshAccessToken()
      
      // Повторяем исходный запрос с новым токеном
      response = await makeRequest(refreshData.access_token)
    } catch (refreshError) {
      // Refresh не удался - очищаем токены и вызываем logout
      clearTokens()
      if (onLogoutCallback) {
        onLogoutCallback()
      }
      throw new Error('Сессия истекла, пожалуйста войдите снова')
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      detail: `HTTP ${response.status}: ${response.statusText}`,
    }))
    
    // При 401 или 403 ошибке (если это не refresh/login/logout)
    if ((response.status === 401 || response.status === 403) && 
        !endpoint.includes('/auth/refresh') && 
        !endpoint.includes('/auth/login') && 
        !endpoint.includes('/auth/logout')) {
      // Проверяем, был ли пользователь авторизован (есть ли токен)
      const hadToken = !!accessToken || !!getRefreshToken()
      clearTokens()
      // Вызываем logout только если пользователь был авторизован
      if (hadToken && onLogoutCallback) {
        onLogoutCallback()
      }
      // Для 403 добавляем понятное сообщение
      if (response.status === 403) {
        throw new Error(errorData.detail || 'Доступ запрещен. Пользователь деактивирован.')
      }
    }
    
    throw new Error(errorData.detail || 'Ошибка запроса')
  }

  return response.json()
}

// GET запрос
export const apiGet = (endpoint, options = {}) => {
  return apiFetch(endpoint, { ...options, method: 'GET' })
}

// POST запрос
export const apiPost = (endpoint, data, options = {}) => {
  return apiFetch(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// PUT запрос
export const apiPut = (endpoint, data, options = {}) => {
  return apiFetch(endpoint, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// PATCH запрос
export const apiPatch = (endpoint, data, options = {}) => {
  return apiFetch(endpoint, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// DELETE запрос
export const apiDelete = (endpoint, options = {}) => {
  return apiFetch(endpoint, { ...options, method: 'DELETE' })
}

// Автокомплит для поля "Ответственный"
export const getResponsibleAutocomplete = async (query) => {
  if (!query || query.length < 3) {
    return { suggestions: [] }
  }
  
  const params = new URLSearchParams({ q: query })
  const response = await apiGet(`/entries/responsible-autocomplete?${params.toString()}`)
  return response
}
