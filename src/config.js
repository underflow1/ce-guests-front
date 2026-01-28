// Конфигурация API
// Используется переменная окружения VITE_API_BASE_URL из .env.production
// Если не задана, используется плейсхолдер (замените на реальный URL)
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://example.com/api/v1'

// Ключ для хранения токена в localStorage
export const AUTH_TOKEN_KEY = 'ce_guests_auth_token'
