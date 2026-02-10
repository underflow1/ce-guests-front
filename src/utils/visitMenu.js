export const buildVisitMenuItems = ({
  person,
  dateKey,
  todayKey,
  canMarkCompleted = false,
  canUnmarkCompleted = false,
  canMarkCancelled = false,
  canUnmarkCancelled = false,
  canMarkPass = false,
  canRevokePass = false,
  onToggleCompleted,
  onToggleCancelled,
  onOrderPass,
  onRevokePass,
}) => {
  const state = Number(person?.state)

  const accept = {
    key: 'accept',
    label: state === 30 ? 'Снять «гость принят»' : 'Гость принят',
    enabled: state === 10 ? canMarkCompleted : state === 30 ? canUnmarkCompleted : false,
    action: () => {
      if (state === 10) onToggleCompleted?.(person.id, dateKey, true)
      if (state === 30) onToggleCompleted?.(person.id, dateKey, false)
    },
  }

  const cancel = {
    key: 'cancel',
    label: state === 20 ? 'Снять отмену' : 'Встреча отменена',
    enabled: state === 10 ? canMarkCancelled : state === 20 ? canUnmarkCancelled : false,
    action: () => {
      if (state === 10) onToggleCancelled?.(person.id, dateKey, true)
      if (state === 20) onToggleCancelled?.(person.id, dateKey, false)
    },
  }

  const passStatus = person?.pass_status || null
  const passAction = passStatus === 'ordered' ? 'revoke' : 'order'
  const canPassAction = passAction === 'order' ? canMarkPass : canRevokePass
  const isPassForbiddenByState = passAction === 'order' && (state === 20 || state === 40)
  const isPastEntry = Boolean(dateKey && todayKey && dateKey < todayKey)
  const isPassOrderingDisabled = passAction === 'order' && isPastEntry
  const passEnabled = Boolean(canPassAction && !isPassForbiddenByState && !isPassOrderingDisabled)
  const passHint = isPassOrderingDisabled ? 'Заказ пропуска недоступен для прошлых дат' : undefined

  const pass = {
    key: 'pass',
    label: passAction === 'order' ? 'Заказать пропуск' : 'Отозвать пропуск',
    enabled: passEnabled,
    hint: passHint,
    action: () => {
      if (passAction === 'order') onOrderPass?.(person.id, dateKey)
      if (passAction === 'revoke') onRevokePass?.(person.id, dateKey)
    },
  }

  return [accept, cancel, pass].filter((item) => item.enabled || item.hint)
}
