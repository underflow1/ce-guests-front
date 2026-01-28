import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import {
  addDays,
  getNextSaturday,
  toDateKey,
  parseDateFromKey,
  formatShortDate,
  extractDateFromDateTime,
  extractTimeFromDateTime,
  formatDateTime,
} from '../utils/date'
import { apiGet, apiPost, apiPut, apiPatch, apiDelete, getAuthToken } from '../utils/api'
import { API_BASE_URL } from '../config'
import { useToast } from '../components/ToastProvider'

const getBottomColumns = (today) => {
  const columns = []
  let workdays = 0
  let cursor = addDays(today, 2)
  let weekendAdded = false

  while (workdays < 5) {
    const day = cursor.getDay()

    if (day === 6) {
      columns.push({
        type: 'weekend',
        saturday: cursor,
        sunday: addDays(cursor, 1),
      })
      weekendAdded = true
      cursor = addDays(cursor, 2)
      continue
    }

    if (day === 0) {
      columns.push({
        type: 'weekend',
        saturday: addDays(cursor, -1),
        sunday: cursor,
      })
      weekendAdded = true
      cursor = addDays(cursor, 1)
      continue
    }

    columns.push({ type: 'workday', date: cursor })
    workdays += 1
    cursor = addDays(cursor, 1)
  }

  if (!weekendAdded) {
    const lastWorkday = columns[columns.length - 1].date
    const saturday = getNextSaturday(addDays(lastWorkday, 1))
    columns.push({
      type: 'weekend',
      saturday,
      sunday: addDays(saturday, 1),
    })
  }

  return columns
}

const useEntries = ({ today, tomorrow, nextMonday, nameInputRef, interfaceType = 'user' }) => {
  const { pushToast } = useToast()
  const todayKey = toDateKey(today)
  const tomorrowKey = tomorrow ? toDateKey(tomorrow) : null
  const nextMondayKey = nextMonday ? toDateKey(nextMonday) : null

  const [todayPeople, setTodayPeople] = useState([])
  const [tomorrowPeople, setTomorrowPeople] = useState([])
  const [bottomEntries, setBottomEntries] = useState({})
  const [allResponsibles, setAllResponsibles] = useState([]) // Все уникальные ответственные из загруженных записей
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const refetchTimerRef = useRef(null)
  const entriesByIdRef = useRef(new Map())

  const bottomColumns = useMemo(() => getBottomColumns(today), [today])

  const availableDateKeys = useMemo(() => {
    const keys = new Set()
    if (nextMondayKey) keys.add(nextMondayKey)
    bottomColumns.forEach((column) => {
      if (column.type === 'weekend') {
        keys.add(toDateKey(column.saturday))
        keys.add(toDateKey(column.sunday))
      } else {
        keys.add(toDateKey(column.date))
      }
    })
    return keys
  }, [bottomColumns, nextMondayKey])

  const loadEntries = useCallback(async () => {
    if (!tomorrow || !nextMonday) return

    try {
      setLoading(true)
      setError(null)

      // Получаем записи за период (от сегодня + 8 дней)
      const response = await apiGet(`/entries?today=${todayKey}`)
      const entries = response.entries || []
      entriesByIdRef.current = new Map(entries.map((entry) => [entry.id, entry]))

      // Группируем записи по датам (извлекаем дату из datetime)
      const entriesByDate = {}
      entries.forEach((entry) => {
        const dateKey = extractDateFromDateTime(entry.datetime)
        if (!entriesByDate[dateKey]) {
          entriesByDate[dateKey] = []
        }
        entriesByDate[dateKey].push(entry)
      })

      // Устанавливаем записи для сегодня и завтра
      setTodayPeople(entriesByDate[todayKey] || [])
      setTomorrowPeople(entriesByDate[tomorrowKey] || [])

      // Устанавливаем записи для нижнего ряда
      const bottomEntriesData = {}
      availableDateKeys.forEach((dateKey) => {
        bottomEntriesData[dateKey] = entriesByDate[dateKey] || []
      })
      setBottomEntries(bottomEntriesData)

      // Извлекаем все уникальные значения responsible из всех записей
      const responsiblesSet = new Set()
      entries.forEach((entry) => {
        if (entry.responsible && entry.responsible.trim()) {
          responsiblesSet.add(entry.responsible.trim())
        }
      })
      const responsiblesList = Array.from(responsiblesSet).sort()
      setAllResponsibles(responsiblesList)
    } catch (err) {
      setError(err.message)
      console.error('Ошибка загрузки записей:', err)
    } finally {
      setLoading(false)
    }
  }, [todayKey, tomorrowKey, tomorrow, nextMonday, availableDateKeys])

  const formatEntryDateLabel = useCallback((entry) => {
    const dateKey = entry?.datetime ? extractDateFromDateTime(entry.datetime) : ''
    if (!dateKey) return ''
    if (dateKey === todayKey) return 'Сегодня'
    if (dateKey === tomorrowKey) return 'Завтра'
    return formatShortDate(parseDateFromKey(dateKey))
  }, [todayKey, tomorrowKey])

  const formatEntryWeekday = useCallback((entry) => {
    const dateKey = entry?.datetime ? extractDateFromDateTime(entry.datetime) : ''
    if (!dateKey) return ''
    const date = parseDateFromKey(dateKey)
    const formatter = new Intl.DateTimeFormat('ru-RU', { weekday: 'long' })
    const text = formatter.format(date)
    return text.charAt(0).toUpperCase() + text.slice(1)
  }, [])

  const formatEntryLine = useCallback((entry) => {
    if (!entry) return 'Запись'
    const name = entry.name?.trim()
    const time = entry.datetime ? extractTimeFromDateTime(entry.datetime) : ''
    const dateLabel = formatEntryDateLabel(entry)
    const weekdayLabel = formatEntryWeekday(entry)
    const parts = []
    if (name) parts.push(name)
    if (weekdayLabel && dateLabel !== 'Сегодня' && dateLabel !== 'Завтра') parts.push(weekdayLabel)
    if (dateLabel) parts.push(dateLabel)
    if (time) parts.push(time)
    const base = parts.length ? parts.join(' · ') : 'Запись'
    const responsible = entry.responsible?.trim()
    return responsible ? `${base} / ${responsible}` : base
  }, [formatEntryDateLabel, formatEntryWeekday])

  const formatChangeValue = useCallback((value) => {
    const trimmed = typeof value === 'string' ? value.trim() : value
    return trimmed ? String(trimmed) : '—'
  }, [])

  const buildToastMessage = useCallback((label, entry, details = '') => {
    const entryLine = entry ? formatEntryLine(entry) : ''
    const base = entryLine ? `${label} · ${entryLine}` : label
    return details ? `${base}; ${details}` : base
  }, [formatEntryLine])

  const buildUpdateDetails = useCallback((prevEntry, nextEntry) => {
    if (!prevEntry || !nextEntry) return ''
    const details = []

    if (prevEntry.name !== nextEntry.name) {
      details.push(
        `Имя: ${formatChangeValue(prevEntry.name)} → ${formatChangeValue(nextEntry.name)}`
      )
    }

    if ((prevEntry.responsible || '') !== (nextEntry.responsible || '')) {
      details.push(
        `Ответственный: ${formatChangeValue(prevEntry.responsible)} → ${formatChangeValue(nextEntry.responsible)}`
      )
    }

    const prevDate = prevEntry.datetime ? extractDateFromDateTime(prevEntry.datetime) : ''
    const nextDate = nextEntry.datetime ? extractDateFromDateTime(nextEntry.datetime) : ''
    const prevDateLabel = formatEntryDateLabel(prevEntry) || prevDate
    const nextDateLabel = formatEntryDateLabel(nextEntry) || nextDate
    if (prevDate !== nextDate) {
      details.push(`Дата: ${formatChangeValue(prevDateLabel)} → ${formatChangeValue(nextDateLabel)}`)
    }

    const prevTime = prevEntry.datetime ? extractTimeFromDateTime(prevEntry.datetime) : ''
    const nextTime = nextEntry.datetime ? extractTimeFromDateTime(nextEntry.datetime) : ''
    if (prevTime !== nextTime) {
      details.push(`Время: ${formatChangeValue(prevTime)} → ${formatChangeValue(nextTime)}`)
    }

    return details.join('; ')
  }, [formatChangeValue, formatEntryDateLabel])

  // Загрузка записей с API
  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  useEffect(() => () => {
    clearTimeout(refetchTimerRef.current)
  }, [])

  const scheduleRefetch = useCallback(() => {
    if (refetchTimerRef.current) return
    refetchTimerRef.current = setTimeout(() => {
      refetchTimerRef.current = null
      loadEntries()
    }, 150)
  }, [loadEntries])

  // Проверка, нужно ли показывать попап для оперативного дежурного
  // Для оперативного дежурного показываем попапы только для записей с датой сегодня или старой (прошлой)
  // Для обычного интерфейса ВСЕГДА показываем попапы (без фильтрации)
  // ВАЖНО: Никакого кэширования попапов - каждый попап показывается независимо
  const shouldShowToast = useCallback((entry) => {
    // Если нет записи, не показываем попап
    if (!entry) {
      return false
    }
    
    // Для обычного интерфейса ВСЕГДА показываем попапы - никакой фильтрации
    // Это гарантирует что когда оперативный дежурный отмечает гостя, у всех остальных попапы показываются
    if (interfaceType !== 'operator') {
      return true
    }
    
    // Для оперативного дежурного показываем только если дата сегодня или старая
    if (!entry.datetime) {
      // Если нет даты, не показываем (для оперативного дежурного нужна дата)
      return false
    }
    
    const entryDateKey = extractDateFromDateTime(entry.datetime)
    if (!entryDateKey) {
      // Если не удалось извлечь дату, не показываем
      return false
    }
    
    // Показываем если дата <= todayKey (сегодня или старая)
    // Сравнение строк работает корректно для формата YYYY-MM-DD
    return entryDateKey <= todayKey
  }, [interfaceType, todayKey])

  useEffect(() => {
    let socket
    let reconnectTimer
    let shouldReconnect = true

    const connect = () => {
      const token = getAuthToken()
      if (!token) return

      const wsBase = API_BASE_URL.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '')
      const wsUrl = `${wsBase}/ws/entries?token=${encodeURIComponent(token)}`
      socket = new WebSocket(wsUrl)

      socket.onmessage = (event) => {
        let payload
        try {
          payload = JSON.parse(event.data)
        } catch {
          return
        }

        if (payload?.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }))
          return
        }

        if (payload?.type) {
          scheduleRefetch()
        }

        if (payload?.type === 'entry_created') {
          const entry = payload.entry
          if (!entry) return
          
          // Обновляем кэш записи (без кэширования - просто для отслеживания изменений)
          if (entry?.id) {
            entriesByIdRef.current.set(entry.id, entry)
          }
          
          // Показываем попап только если нужно (для оперативного дежурного фильтруем по дате)
          // Для обычного интерфейса попап показывается ВСЕГДА
          if (shouldShowToast(entry)) {
            pushToast({
              type: 'success',
              title: '',
              message: buildToastMessage('Добавлена запись', entry),
            })
          }
        } else if (payload?.type === 'entry_updated' || payload?.type === 'entry_completed') {
          // Обрабатываем entry_updated и entry_completed одинаково
          // entry_completed - устаревшее событие, должно быть заменено на entry_updated
          const entry = payload.entry
          if (!entry) return
          
          // Сохраняем предыдущее состояние ДО обновления кэша
          const prevEntry = entry?.id ? entriesByIdRef.current.get(entry.id) : null
          
          // Обновляем кэш записи (без кэширования - просто для отслеживания изменений)
          if (entry?.id) {
            entriesByIdRef.current.set(entry.id, entry)
          }
          
          // Всегда обновляем данные через refetch (без кэша)
          // Попап показываем только если нужно (для оперативного дежурного фильтруем по дате)
          // Для обычного интерфейса попап показывается ВСЕГДА
          if (shouldShowToast(entry)) {
            const details = buildUpdateDetails(prevEntry, entry)
            const statusChanged =
              prevEntry && Boolean(prevEntry.is_completed) !== Boolean(entry?.is_completed)
            const statusLabel = entry?.is_completed ? 'Гость принят' : 'Встреча возвращена'
            const label = statusChanged ? statusLabel : 'Обновлена запись'
            // Показываем попап - для обычного интерфейса всегда, для оперативного дежурного только если дата подходит
            // Каждый попап показывается независимо, без проверки на дубликаты
            pushToast({
              type: 'info',
              title: '',
              message: buildToastMessage(label, entry, details),
            })
          }
        } else if (payload?.type === 'entry_deleted') {
          const entry = payload.entry
          if (!entry) return
          
          // Удаляем из кэша (без кэширования - просто для отслеживания изменений)
          if (entry?.id) {
            entriesByIdRef.current.delete(entry.id)
          }
          
          // Показываем попап только если нужно (для оперативного дежурного фильтруем по дате)
          // Для обычного интерфейса попап показывается ВСЕГДА
          if (shouldShowToast(entry)) {
            pushToast({
              type: 'warning',
              title: '',
              message: buildToastMessage('Удалена запись', entry),
            })
          }
        } else if (payload?.type === 'entries_deleted_all') {
          pushToast({
            type: 'warning',
            title: 'Удалены все записи',
            message: 'Список очищен',
          })
        } else if (payload?.type === 'entries_deleted_future') {
          pushToast({
            type: 'warning',
            title: 'Удалены будущие записи',
            message: 'Список обновлен',
          })
        }
      }

      socket.onclose = (event) => {
        if (!shouldReconnect) return
        if (event?.code === 1008) return
        reconnectTimer = setTimeout(connect, 1500)
      }

      socket.onerror = () => {
        socket.close()
      }
    }

    connect()

    return () => {
      shouldReconnect = false
      clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [pushToast, scheduleRefetch, shouldShowToast])

  const getListForDateKey = (dateKey) => {
    if (dateKey === todayKey) return todayPeople
    if (dateKey === tomorrowKey) return tomorrowPeople
    return bottomEntries[dateKey] ?? []
  }

  const updateListForDateKey = (dateKey, newList) => {
    if (dateKey === todayKey) {
      setTodayPeople(newList)
    } else if (dateKey === tomorrowKey) {
      setTomorrowPeople(newList)
    } else {
      setBottomEntries((prev) => ({ ...prev, [dateKey]: newList }))
    }
  }

  const getTargetDateKey = () => {
    if (form.target === 'today') return todayKey
    if (form.target === 'tomorrow') return tomorrowKey
    if (form.target === 'monday') return nextMondayKey
    if (form.target === 'other') return form.otherDate
    return null
  }

  const resolveTarget = (dateKey) => {
    if (dateKey === todayKey) return { target: 'today', otherDate: '' }
    if (dateKey === tomorrowKey) return { target: 'tomorrow', otherDate: '' }
    if (dateKey === nextMondayKey) {
      return { target: 'monday', otherDate: nextMondayKey }
    }
    if (availableDateKeys.has(dateKey)) {
      return { target: 'other', otherDate: dateKey }
    }
    return { target: 'today', otherDate: '' }
  }

  const [form, setForm] = useState({
    name: '',
    responsible: '',
    time: '09:00',
    target: 'today',
    otherDate: '',
    editingEntryId: null,
    editingDateKey: null,
    isCompleted: false,
  })

  const handleDragStart = (event, entry, sourceDateKey) => {
    // Не позволяем перетаскивать принятых гостей
    if (entry.is_completed) {
      event.preventDefault()
      return
    }
    const payload = JSON.stringify({ id: entry.id, sourceDateKey })
    event.dataTransfer.setData('application/json', payload)
    event.dataTransfer.setData('text/plain', payload)
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = async (event, targetDateKey, targetHour) => {
    event.preventDefault()
    const payloadText =
      event.dataTransfer.getData('application/json') ||
      event.dataTransfer.getData('text/plain')
    if (!payloadText) return

    let payload
    try {
      payload = JSON.parse(payloadText)
    } catch {
      return
    }

    if (!payload?.id || !payload?.sourceDateKey) return

    const sourceDateKey = payload.sourceDateKey
    const sourceList = getListForDateKey(sourceDateKey)
    const entry = sourceList.find((item) => item.id === payload.id)
    if (!entry) return

    const currentDate = parseDateFromKey(targetDateKey)
    const currentTime = entry.datetime ? extractTimeFromDateTime(entry.datetime) : (entry.time || '00:00')
    const newTime = targetHour === null ? currentTime : `${targetHour}:00`
    const newDateTime = formatDateTime(currentDate, newTime)

    // Если дата и время не изменились, ничего не делаем
    if (entry.datetime === newDateTime) {
      return
    }

    try {
      // Обновляем запись через API
      const updatedEntry = await apiPut(`/entries/${entry.id}`, {
        name: entry.name,
        responsible: entry.responsible || '',
        datetime: newDateTime,
        is_completed: entry.is_completed || false,
      })

      // Обновляем локальное состояние
      const nextSourceList = sourceList.filter((item) => item.id !== entry.id)
      updateListForDateKey(sourceDateKey, nextSourceList)

      if (sourceDateKey !== targetDateKey) {
        const targetList = getListForDateKey(targetDateKey)
        updateListForDateKey(targetDateKey, [...targetList, updatedEntry])
      } else {
        // Если дата не изменилась, просто обновляем время
        updateListForDateKey(targetDateKey, [...nextSourceList, updatedEntry])
      }
    } catch (err) {
      console.error('Ошибка при перемещении записи:', err)
      setError(err.message)
    }
  }

  const handleToggleCompleted = async (entryId, dateKey, isCompleted) => {
    const list = getListForDateKey(dateKey)
    const entry = list.find((item) => item.id === entryId)
    if (!entry) return

    try {
      // Отдельный PATCH для отметки "пришел" (меняем только is_completed)
      const updatedEntry = await apiPatch(`/entries/${entryId}/completed`, {
        is_completed: Boolean(isCompleted),
      })

      // Обновляем локальное состояние
      const updatedList = list.map((item) =>
        item.id === entryId ? updatedEntry : item
      )
      updateListForDateKey(dateKey, updatedList)
    } catch (err) {
      console.error('Ошибка при обновлении статуса записи:', err)
      setError(err.message)
    }
  }

  const handleDeleteEntry = async (entryId, dateKey) => {
    const list = getListForDateKey(dateKey)
    const entry = list.find((item) => item.id === entryId)
    if (!entry) return

    const confirmed = window.confirm(
      `Вы уверены, что хотите удалить запись "${entry.name}"?\n\nЭто действие нельзя отменить!`
    )

    if (!confirmed) return

    try {
      // Удаляем запись через API (мягкое удаление)
      await apiDelete(`/entries/${entryId}`)

      // Удаляем из локального состояния
      const updatedList = list.filter((item) => item.id !== entryId)
      updateListForDateKey(dateKey, updatedList)
    } catch (err) {
      console.error('Ошибка при удалении записи:', err)
      setError(err.message)
    }
  }

  const handleDoubleClick = (entry, dateKey) => {
    const { target, otherDate } = resolveTarget(dateKey)
    const entryTime = entry.datetime ? extractTimeFromDateTime(entry.datetime) : (entry.time || '00:00')

    setForm({
      name: entry.name,
      responsible: entry.responsible || '',
      time: entryTime,
      target,
      otherDate,
      editingEntryId: entry.id,
      editingDateKey: dateKey,
      isCompleted: entry.is_completed || false,
    })

    setTimeout(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }, 0)
  }

  const handleEmptyRowDoubleClick = (dateKey, hour) => {
    const { target, otherDate } = resolveTarget(dateKey)

    setForm({
      name: '',
      responsible: '',
      time: `${hour}:00`,
      target,
      otherDate,
      editingEntryId: null,
      editingDateKey: null,
      isCompleted: false,
    })

    setTimeout(() => {
      nameInputRef.current?.focus()
    }, 0)
  }

  const handleWeekendEmptyRowDoubleClick = (dateKey) => {
    const { target, otherDate } = resolveTarget(dateKey)

    setForm({
      name: '',
      responsible: '',
      time: '09:00',
      target,
      otherDate,
      editingEntryId: null,
      editingDateKey: null,
      isCompleted: false,
    })

    setTimeout(() => {
      nameInputRef.current?.focus()
    }, 0)
  }

  const isSubmitDisabled =
    form.name.trim().length === 0 ||
    form.time.trim().length === 0 ||
    (form.target === 'other' && form.otherDate.trim().length === 0)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitDisabled) return

    const targetDateKey = getTargetDateKey()
    if (!targetDateKey) return

    const isEditing = form.editingEntryId && form.editingDateKey

    try {
      const targetDate = parseDateFromKey(targetDateKey)
      const datetime = formatDateTime(targetDate, form.time.trim())

      if (isEditing) {
        // Обновление существующей записи
        const updatedEntry = await apiPut(`/entries/${form.editingEntryId}`, {
          name: form.name.trim(),
          responsible: form.responsible.trim(),
          datetime,
          is_completed: form.isCompleted || false,
        })

        const sourceDateKey = form.editingDateKey
        const sourceList = getListForDateKey(sourceDateKey)
        const nextSourceList = sourceList.filter(
          (item) => item.id !== form.editingEntryId,
        )

        updateListForDateKey(sourceDateKey, nextSourceList)

        if (sourceDateKey !== targetDateKey) {
          const targetList = getListForDateKey(targetDateKey)
          updateListForDateKey(targetDateKey, [...targetList, updatedEntry])
        } else {
          updateListForDateKey(targetDateKey, [...nextSourceList, updatedEntry])
        }
      } else {
        // Создание новой записи
        const newEntry = await apiPost('/entries', {
          name: form.name.trim(),
          responsible: form.responsible.trim(),
          datetime,
          is_completed: false,
        })

        const targetList = getListForDateKey(targetDateKey)
        updateListForDateKey(targetDateKey, [...targetList, newEntry])
      }

      // Сбрасываем форму
      setForm({
        name: '',
        responsible: '',
        time: '09:00',
        target: 'today',
        otherDate: '',
        editingEntryId: null,
        editingDateKey: null,
        isCompleted: false,
      })
    } catch (err) {
      console.error('Ошибка при сохранении записи:', err)
      setError(err.message)
    }
  }

  return {
    todayKey,
    tomorrowKey,
    nextMondayKey,
    todayPeople,
    tomorrowPeople,
    bottomColumns,
    bottomEntries,
    allResponsibles,
    form,
    setForm,
    isSubmitDisabled,
    loading,
    error,
    handleDragStart,
    handleDrop,
    handleDoubleClick,
    handleEmptyRowDoubleClick,
    handleWeekendEmptyRowDoubleClick,
    handleSubmit,
    handleToggleCompleted,
    handleDeleteEntry,
  }
}

export default useEntries
