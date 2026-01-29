export const addDays = (date, days) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

export const getNextMonday = (date) => {
  const day = date.getDay()
  const daysToMonday = day === 0 ? 1 : (8 - day) % 7 || 7
  return addDays(date, daysToMonday)
}

export const formatWeekdayWithDate = (() => {
  const formatter = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  })

  return (date) => {
    const text = formatter.format(date)
    return text.charAt(0).toUpperCase() + text.slice(1)
  }
})()

export const formatShortDate = (() => {
  const formatter = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  })

  return (date) => formatter.format(date)
})()

export const toDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getNextSaturday = (date) => {
  const day = date.getDay()
  const daysToSaturday = (6 - day + 7) % 7
  return addDays(date, daysToSaturday)
}

// Преобразовать строку даты (YYYY-MM-DD) в объект Date
export const parseDateFromKey = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Преобразовать datetime (YYYY-MM-DDTHH:MM:SS) в объект Date
export const parseDateTime = (datetime) => {
  return new Date(datetime)
}

// Преобразовать объект Date в datetime строку (YYYY-MM-DDTHH:MM:SS)
export const formatDateTime = (date, time) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const timeStr = time || '00:00:00'
  // Если time уже в формате HH:MM:SS, используем как есть, иначе добавляем :00
  const timeParts = timeStr.split(':')
  const hours = timeParts[0].padStart(2, '0')
  const minutes = (timeParts[1] || '00').padStart(2, '0')
  const seconds = (timeParts[2] || '00').padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

// Извлечь дату (YYYY-MM-DD) из datetime
export const extractDateFromDateTime = (datetime) => {
  if (!datetime) return ''
  return datetime.split('T')[0]
}

// Извлечь время (HH:MM) из datetime
export const extractTimeFromDateTime = (datetime) => {
  if (!datetime) return '00:00'
  const timePart = datetime.split('T')[1]
  if (!timePart) return '00:00'
  return timePart.substring(0, 5) // Берем только HH:MM
}

// Маппинг английских названий дней недели на русские
const weekdayMap = {
  'Monday': 'Понедельник',
  'Tuesday': 'Вторник',
  'Wednesday': 'Среда',
  'Thursday': 'Четверг',
  'Friday': 'Пятница',
  'Saturday': 'Суббота',
  'Sunday': 'Воскресенье',
}

// Локализовать день недели (английский → русский)
export const localizeWeekday = (weekday) => {
  return weekdayMap[weekday] || weekday
}

// Форматировать день недели и дату для панелей
export const formatWeekdayAndDate = (weekday, dateKey) => {
  if (!weekday || !dateKey) return ''
  const localizedWeekday = localizeWeekday(weekday)
  const date = parseDateFromKey(dateKey)
  const dateStr = formatShortDate(date)
  return `${localizedWeekday}, ${dateStr}`
}
