/**
 * Утилиты для работы с результатами встречи
 */

/**
 * Получить иконку для статуса результата (по state)
 * @param {number|null|undefined} state - состояние записи (40/50/60, 20=отменена)
 * @returns {string|null} - класс иконки FontAwesome или null
 */
export function getMeetingResultIcon(state) {
  const s = Number(state)
  if (s === 20) return 'fa-xmark'
  if (s === 50) return 'fa-spinner' // Не оформлен
  if (s === 60) return 'fa-check-double' // Трудоустроен
  if (s === 40) return 'fa-ban' // Отказ
  return null
}

/**
 * Получить вариант для CSS классов (по state)
 * @param {number|null|undefined} state - состояние записи
 * @returns {string|null} - вариант (pending/employed/cancelled) или null
 */
export function getMeetingResultVariant(state) {
  const s = Number(state)
  if (s === 20) return 'cancelled'
  if (s === 50) return 'pending' // Не оформлен
  if (s === 60) return 'employed' // Трудоустроен
  if (s === 40) return 'cancelled' // Отказ
  return null
}

/**
 * Получить текст для tooltip (по state)
 * @param {number|null|undefined} state - состояние записи
 * @returns {string} - текст подсказки
 */
export function getMeetingResultTitle(state) {
  const s = Number(state)
  if (s === 20) return 'Визит отменен'
  if (s === 50) return 'В процессе'
  if (s === 60) return 'Трудоустроен'
  if (s === 40) return 'Отказ'
  return ''
}
