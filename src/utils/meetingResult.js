/**
 * Утилиты для работы с результатами встречи
 */

/**
 * Получить иконку для статуса результата встречи
 * @param {number|null|undefined} code - код статуса (1=pending, 2=employed, 3=rejected)
 * @param {boolean} isCancelled - отменена ли встреча
 * @returns {string|null} - класс иконки FontAwesome или null
 */
export function getMeetingResultIcon(code, isCancelled = false) {
  // Если встреча отменена, показываем крестик
  if (isCancelled) return 'fa-xmark'
  
  if (code === 1) return 'fa-spinner'      // pending (Не оформлен)
  if (code === 2) return 'fa-check-double' // employed (Трудоустроен)
  if (code === 3) return 'fa-xmark'         // rejected (Отказ)
  return null
}

/**
 * Получить вариант для CSS классов
 * @param {number|null|undefined} code - код статуса
 * @param {boolean} isCancelled - отменена ли встреча
 * @returns {string|null} - вариант (pending/employed/cancelled) или null
 */
export function getMeetingResultVariant(code, isCancelled = false) {
  // Если встреча отменена, показываем как cancelled
  if (isCancelled) return 'cancelled'
  
  if (code === 1) return 'pending'   // Не оформлен
  if (code === 2) return 'employed'  // Трудоустроен
  if (code === 3) return 'cancelled' // Отказ
  return null
}

/**
 * Получить текст для tooltip
 * @param {number|null|undefined} code - код статуса
 * @param {boolean} isCancelled - отменена ли встреча
 * @returns {string} - текст подсказки
 */
export function getMeetingResultTitle(code, isCancelled = false) {
  // Если встреча отменена
  if (isCancelled) return 'Встреча отменена'
  
  if (code === 1) return 'В процессе'
  if (code === 2) return 'Трудоустроен'
  if (code === 3) return 'Отказ'
  return ''
}
