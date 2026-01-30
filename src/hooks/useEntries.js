import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  toDateKey,
  parseDateFromKey,
  formatShortDate,
  extractDateFromDateTime,
  extractTimeFromDateTime,
  formatDateTime,
} from '../utils/date'
import { apiGet, apiPost, apiPut, apiPatch, apiDelete, getAccessToken } from '../utils/api'
import { API_BASE_URL } from '../config'
import { useToast } from '../components/ToastProvider'

const useEntries = ({ today, nameInputRef, interfaceType = 'user', isAuthenticated = false }) => {
  const { pushToast } = useToast()
  const todayKey = toDateKey(today)

  const [previousWorkday, setPreviousWorkday] = useState(null)
  const [nextWorkday, setNextWorkday] = useState(null)
  const [calendarStructure, setCalendarStructure] = useState([])
  const [todayPeople, setTodayPeople] = useState([])
  const [previousWorkdayPeople, setPreviousWorkdayPeople] = useState([])
  const [nextWorkdayPeople, setNextWorkdayPeople] = useState([])
  const [bottomEntries, setBottomEntries] = useState({})
  const [allResponsibles, setAllResponsibles] = useState([]) // Все уникальные ответственные из загруженных записей
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isWebSocketReady, setIsWebSocketReady] = useState(false)
  const entriesByIdRef = useRef(new Map())

  const previousWorkdayKey = previousWorkday ? toDateKey(previousWorkday) : null
  const nextWorkdayKey = nextWorkday ? toDateKey(nextWorkday) : null

  // Получаем все dateKey из calendar_structure для нижнего ряда
  const availableDateKeys = useMemo(() => {
    const keys = new Set()
    calendarStructure.forEach((item) => {
      if (item.date) {
        keys.add(item.date)
      }
    })
    return keys
  }, [calendarStructure])

  const loadEntries = useCallback(async () => {
    // Не загружаем данные если пользователь не авторизован
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Получаем записи за период (текущая неделя + предыдущий рабочий день)
      const response = await apiGet('/entries')
      const entries = response.entries || []
      entriesByIdRef.current = new Map(entries.map((entry) => [entry.id, entry]))

      // Парсим reference_dates
      let prevWorkday = null
      let nextWorkdayDate = null
      if (response.reference_dates) {
        if (response.reference_dates.previous_workday) {
          prevWorkday = parseDateFromKey(response.reference_dates.previous_workday)
          setPreviousWorkday(prevWorkday)
        }
        if (response.reference_dates.next_workday) {
          nextWorkdayDate = parseDateFromKey(response.reference_dates.next_workday)
          setNextWorkday(nextWorkdayDate)
        }
      }

      // Парсим calendar_structure
      const calendarStruct = response.calendar_structure || []
      setCalendarStructure(calendarStruct)

      // Группируем записи по датам (извлекаем дату из datetime)
      const entriesByDate = {}
      entries.forEach((entry) => {
        const dateKey = extractDateFromDateTime(entry.datetime)
        if (!entriesByDate[dateKey]) {
          entriesByDate[dateKey] = []
        }
        entriesByDate[dateKey].push(entry)
      })

      // Вычисляем ключи для рабочих дней
      const prevWorkdayKey = prevWorkday ? toDateKey(prevWorkday) : null
      const nextWorkdayKeyLocal = nextWorkdayDate ? toDateKey(nextWorkdayDate) : null

      // Получаем все dateKey из calendar_structure для нижнего ряда
      const dateKeys = new Set()
      calendarStruct.forEach((item) => {
        if (item.date) {
          dateKeys.add(item.date)
        }
      })

      // Устанавливаем записи для сегодня, предыдущего и следующего рабочего дня
      setTodayPeople(entriesByDate[todayKey] || [])
      if (prevWorkdayKey) {
        setPreviousWorkdayPeople(entriesByDate[prevWorkdayKey] || [])
      }
      if (nextWorkdayKeyLocal) {
        setNextWorkdayPeople(entriesByDate[nextWorkdayKeyLocal] || [])
      }

      // Устанавливаем записи для нижнего ряда (текущая неделя)
      const bottomEntriesData = {}
      dateKeys.forEach((dateKey) => {
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
      // Не устанавливаем ошибку если пользователь не авторизован (это нормально)
      if (isAuthenticated) {
        setError(err.message)
        console.error('Ошибка загрузки записей:', err)
      }
    } finally {
      setLoading(false)
    }
  }, [todayKey, isAuthenticated])

  const formatEntryDateLabel = useCallback((entry) => {
    const dateKey = entry?.datetime ? extractDateFromDateTime(entry.datetime) : ''
    if (!dateKey) return ''
    if (dateKey === todayKey) return 'Сегодня'
    if (dateKey === nextWorkdayKey) return 'Следующий рабочий день'
    if (dateKey === previousWorkdayKey) return 'Предыдущий рабочий день'
    return formatShortDate(parseDateFromKey(dateKey))
  }, [todayKey, nextWorkdayKey, previousWorkdayKey])

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
    if (weekdayLabel && dateLabel !== 'Сегодня' && dateLabel !== 'Следующий рабочий день' && dateLabel !== 'Предыдущий рабочий день') parts.push(weekdayLabel)
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


  // Функция для обновления локального состояния из данных WebSocket
  const updateStateFromWebSocketData = useCallback((data) => {
    if (!data) return

    const entries = data.entries || []
    entriesByIdRef.current = new Map(entries.map((entry) => [entry.id, entry]))

    // Парсим reference_dates
    let prevWorkday = null
    let nextWorkdayDate = null
    if (data.reference_dates) {
      if (data.reference_dates.previous_workday) {
        prevWorkday = parseDateFromKey(data.reference_dates.previous_workday)
        setPreviousWorkday(prevWorkday)
      }
      if (data.reference_dates.next_workday) {
        nextWorkdayDate = parseDateFromKey(data.reference_dates.next_workday)
        setNextWorkday(nextWorkdayDate)
      }
    }

    // Парсим calendar_structure
    const calendarStruct = data.calendar_structure || []
    setCalendarStructure(calendarStruct)

    // Группируем записи по датам (извлекаем дату из datetime)
    const entriesByDate = {}
    entries.forEach((entry) => {
      const dateKey = extractDateFromDateTime(entry.datetime)
      if (!entriesByDate[dateKey]) {
        entriesByDate[dateKey] = []
      }
      entriesByDate[dateKey].push(entry)
    })

    // Вычисляем ключи для рабочих дней
    const prevWorkdayKey = prevWorkday ? toDateKey(prevWorkday) : null
    const nextWorkdayKeyLocal = nextWorkdayDate ? toDateKey(nextWorkdayDate) : null

    // Получаем все dateKey из calendar_structure для нижнего ряда
    const dateKeys = new Set()
    calendarStruct.forEach((item) => {
      if (item.date) {
        dateKeys.add(item.date)
      }
    })

    // Устанавливаем записи для сегодня, предыдущего и следующего рабочего дня
    setTodayPeople(entriesByDate[todayKey] || [])
    if (prevWorkdayKey) {
      setPreviousWorkdayPeople(entriesByDate[prevWorkdayKey] || [])
    }
    if (nextWorkdayKeyLocal) {
      setNextWorkdayPeople(entriesByDate[nextWorkdayKeyLocal] || [])
    }

    // Устанавливаем записи для нижнего ряда (текущая неделя)
    const bottomEntriesData = {}
    dateKeys.forEach((dateKey) => {
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
  }, [todayKey])

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
    // Не подключаемся к WebSocket если пользователь не авторизован
    if (!isAuthenticated) {
      setIsWebSocketReady(false)
      return
    }

    let socket
    let reconnectTimer
    let shouldReconnect = true
    let wsReadyTimeout

    const connect = () => {
      const token = getAccessToken()
      if (!token) return

      const wsBase = API_BASE_URL.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '')
      const wsUrl = `${wsBase}/ws/entries?token=${encodeURIComponent(token)}`
      socket = new WebSocket(wsUrl)

      socket.onopen = () => {
        // WebSocket подключен, можно показывать интерфейс
        if (wsReadyTimeout) {
          clearTimeout(wsReadyTimeout)
          wsReadyTimeout = null
        }
        setIsWebSocketReady(true)
      }

      // Таймаут: если WebSocket не подключится за 3 секунды, все равно показываем интерфейс
      // (WebSocket будет подключаться в фоне и переподключаться при необходимости)
      wsReadyTimeout = setTimeout(() => {
        setIsWebSocketReady(true)
      }, 3000)

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

        // Обновляем локальное состояние из полных данных недели
        if (payload?.data) {
          updateStateFromWebSocketData(payload.data)
        }

        // Обрабатываем события и показываем тосты
        if (payload?.type === 'entry_created') {
          const entry = payload.change?.entry
          if (!entry) return
          
          if (shouldShowToast(entry)) {
            pushToast({
              type: 'success',
              title: '',
              message: buildToastMessage('Добавлена запись', entry),
            })
          }
        } else if (payload?.type === 'entry_updated') {
          const entry = payload.change?.entry
          if (!entry) return
          
          if (shouldShowToast(entry)) {
            pushToast({
              type: 'info',
              title: '',
              message: buildToastMessage('Обновлена запись', entry),
            })
          }
        } else if (payload?.type === 'entry_completed') {
          const entry = payload.change?.entry
          if (!entry) return
          
          if (shouldShowToast(entry)) {
            pushToast({
              type: 'info',
              title: '',
              message: buildToastMessage('Гость принят', entry),
            })
          }
        } else if (payload?.type === 'entry_uncompleted') {
          const entry = payload.change?.entry
          if (!entry) return
          
          if (shouldShowToast(entry)) {
            pushToast({
              type: 'info',
              title: '',
              message: buildToastMessage('Встреча возвращена', entry),
            })
          }
        } else if (payload?.type === 'visit_cancelled') {
          const entry = payload.change?.entry
          if (!entry) return

          if (shouldShowToast(entry)) {
            pushToast({
              type: 'info',
              title: '',
              message: buildToastMessage('Визит отменён', entry),
            })
          }
        } else if (payload?.type === 'visit_uncancelled') {
          const entry = payload.change?.entry
          if (!entry) return

          if (shouldShowToast(entry)) {
            pushToast({
              type: 'info',
              title: '',
              message: buildToastMessage('Отмена визита снята', entry),
            })
          }
        } else if (payload?.type === 'pass_ordered') {
          const entry = payload.change?.entry
          if (!entry) return

          if (shouldShowToast(entry)) {
            pushToast({
              type: 'info',
              title: '',
              message: buildToastMessage('Пропуск заказан', entry),
            })
          }
        } else if (payload?.type === 'pass_order_failed') {
          const entry = payload.change?.entry
          if (!entry) return

          if (shouldShowToast(entry)) {
            pushToast({
              type: 'error',
              title: '',
              message: buildToastMessage('Не удалось заказать пропуск', entry),
            })
          }
        } else if (payload?.type === 'pass_revoked') {
          const entry = payload.change?.entry
          if (!entry) return

          if (shouldShowToast(entry)) {
            pushToast({
              type: 'info',
              title: '',
              message: buildToastMessage('Пропуск отозван', entry),
            })
          }
        } else if (payload?.type === 'entry_moved') {
          const entry = payload.change?.entry
          if (!entry) return
          
          if (shouldShowToast(entry)) {
            pushToast({
              type: 'info',
              title: '',
              message: buildToastMessage('Перемещена запись', entry),
            })
          }
        } else if (payload?.type === 'entry_deleted') {
          const entry = payload.change?.entry
          if (!entry) return
          
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
            title: 'База данных очищена',
            message: 'Все события удалены',
          })
        }
      }

      socket.onclose = (event) => {
        setIsWebSocketReady(false)
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
      if (wsReadyTimeout) {
        clearTimeout(wsReadyTimeout)
      }
      socket?.close()
    }
  }, [pushToast, shouldShowToast, isAuthenticated, updateStateFromWebSocketData])

  const getListForDateKey = (dateKey) => {
    if (dateKey === todayKey) return todayPeople
    if (dateKey === previousWorkdayKey) return previousWorkdayPeople
    if (dateKey === nextWorkdayKey) return nextWorkdayPeople
    return bottomEntries[dateKey] ?? []
  }

  const updateListForDateKey = (dateKey, newList) => {
    if (dateKey === todayKey) {
      setTodayPeople(newList)
    } else if (dateKey === previousWorkdayKey) {
      setPreviousWorkdayPeople(newList)
    } else if (dateKey === nextWorkdayKey) {
      setNextWorkdayPeople(newList)
    } else {
      setBottomEntries((prev) => ({ ...prev, [dateKey]: newList }))
    }
  }

  const getTargetDateKey = () => {
    if (form.target === 'today') return todayKey
    if (form.target === 'next_workday') return nextWorkdayKey
    if (form.target === 'previous_workday') return previousWorkdayKey
    if (form.target === 'other') return form.otherDate
    return null
  }

  const resolveTarget = (dateKey) => {
    if (dateKey === todayKey) return { target: 'today', otherDate: '' }
    if (dateKey === nextWorkdayKey) return { target: 'next_workday', otherDate: '' }
    if (dateKey === previousWorkdayKey) return { target: 'previous_workday', otherDate: '' }
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
      // Обновляем запись через API (отдельный роут для drag&drop)
      const updatedEntry = await apiPatch(`/entries/${entry.id}/move`, {
        datetime: newDateTime,
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

  const handleToggleCancelled = async (entryId, dateKey, isCancelled) => {
    const list = getListForDateKey(dateKey)
    const entry = list.find((item) => item.id === entryId)
    if (!entry) return

    try {
      const updatedEntry = await apiPatch(`/entries/${entryId}/cancelled`, {
        is_cancelled: Boolean(isCancelled),
      })

      const updatedList = list.map((item) =>
        item.id === entryId ? updatedEntry : item
      )
      updateListForDateKey(dateKey, updatedList)
    } catch (err) {
      console.error('Ошибка при обновлении статуса отмены визита:', err)
      setError(err.message)
    }
  }

  const handleOrderPass = async (entryId, dateKey) => {
    const list = getListForDateKey(dateKey)
    const entry = list.find((item) => item.id === entryId)
    if (!entry) return

    try {
      const updatedEntry = await apiPut(`/entries/${entryId}/pass`, {})
      const updatedList = list.map((item) =>
        item.id === entryId ? updatedEntry : item
      )
      updateListForDateKey(dateKey, updatedList)
    } catch (err) {
      console.error('Ошибка при заказе пропуска:', err)
      setError(err.message)
    }
  }

  const handleRevokePass = async (entryId, dateKey) => {
    const list = getListForDateKey(dateKey)
    const entry = list.find((item) => item.id === entryId)
    if (!entry) return

    try {
      const updatedEntry = await apiDelete(`/entries/${entryId}/pass`)
      const updatedList = list.map((item) =>
        item.id === entryId ? updatedEntry : item
      )
      updateListForDateKey(dateKey, updatedList)
    } catch (err) {
      console.error('Ошибка при отзыве пропуска:', err)
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
    previousWorkday,
    previousWorkdayKey,
    nextWorkday,
    nextWorkdayKey,
    calendarStructure,
    todayPeople,
    previousWorkdayPeople,
    nextWorkdayPeople,
    bottomEntries,
    allResponsibles,
    form,
    setForm,
    isSubmitDisabled,
    loading,
    error,
    isWebSocketReady,
    handleDragStart,
    handleDrop,
    handleDoubleClick,
    handleEmptyRowDoubleClick,
    handleWeekendEmptyRowDoubleClick,
    handleSubmit,
    handleToggleCompleted,
    handleToggleCancelled,
    handleOrderPass,
    handleRevokePass,
    handleDeleteEntry,
  }
}

export default useEntries
