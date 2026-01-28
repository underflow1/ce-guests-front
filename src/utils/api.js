import { API_BASE_URL, AUTH_TOKEN_KEY } from '../config'

// Получить токен из localStorage
export const getAuthToken = () => {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

// Сохранить токен в localStorage
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY)
  }
}

// Базовый fetch с авторизацией
export const apiFetch = async (endpoint, options = {}) => {
  const token = getAuthToken()
  const url = `${API_BASE_URL}${endpoint}`

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

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      detail: `HTTP ${response.status}: ${response.statusText}`,
    }))
    
    // При 401 или 403 ошибке очищаем токен (сессия истекла, токен невалидный или пользователь деактивирован)
    if (response.status === 401 || response.status === 403) {
      setAuthToken(null)
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
