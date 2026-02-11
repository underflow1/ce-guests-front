export const buildVisitMenuItems = ({
  person,
  dateKey,
  todayKey,
  canMarkArrived = false,
  canUnmarkArrived = false,
  canMarkCancelled = false,
  canUnmarkCancelled = false,
  canMarkPass = false,
  canRevokePass = false,
  canRollbackMeetingResult = false,
  onToggleArrived,
  onToggleCancelled,
  onOrderPass,
  onRevokePass,
  onRollbackMeetingResult,
}) => {
  const state = Number(person?.state)

  const accept = {
    key: 'accept',
    label: state === 30 ? 'Снять отметку прибытия' : 'Гость прибыл',
    enabled: state === 10 ? canMarkArrived : state === 30 ? canUnmarkArrived : false,
    action: () => {
      if (state === 10) onToggleArrived?.(person.id, dateKey, true, { forceReadOnlyAfterAction: true })
      if (state === 30) onToggleArrived?.(person.id, dateKey, false, { forceReadOnlyAfterAction: true })
    },
  }

  const cancel = {
    key: 'cancel',
    label: state === 20 ? 'Снять отмену' : 'Встреча отменена',
    enabled: state === 10 ? canMarkCancelled : state === 20 ? canUnmarkCancelled : false,
    action: () => {
      if (state === 10) onToggleCancelled?.(person.id, dateKey, true, { forceReadOnlyAfterAction: true })
      if (state === 20) onToggleCancelled?.(person.id, dateKey, false, { forceReadOnlyAfterAction: true })
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
      if (passAction === 'order') onOrderPass?.(person.id, dateKey, { forceReadOnlyAfterAction: true })
      if (passAction === 'revoke') onRevokePass?.(person.id, dateKey, { forceReadOnlyAfterAction: true })
    },
  }

  const canRollbackViaResult = state === 40 || state === 50 || state === 60
  const shouldShowRollback = canRollbackViaResult

  const rollback = {
    key: 'rollback',
    label: 'Откатить',
    enabled:
      canRollbackViaResult && (state === 50 || canRollbackMeetingResult),
    action: () => {
      if (canRollbackViaResult) onRollbackMeetingResult?.(person.id, dateKey, { forceReadOnlyAfterAction: true })
    },
  }

  const items = [accept, cancel]
  if (shouldShowRollback) {
    items.push(rollback)
  }
  items.push(pass)
  return items.filter((item) => item.key === 'rollback' || item.enabled || item.hint)
}
