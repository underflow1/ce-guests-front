export const buildVisitMenuItems = ({
  person,
  dateKey,
  todayKey,
  reasonsByState = {},
  canMarkArrived = false,
  canUnmarkArrived = false,
  canMarkCancelled = false,
  canUnmarkCancelled = false,
  canSetMeetingResult = false,
  canChangeMeetingResult = false,
  canMarkPass = false,
  canRevokePass = false,
  canRollbackMeetingResult = false,
  onSetEntryState,
  onToggleArrived,
  onToggleCancelled,
  onOrderPass,
  onRevokePass,
  onRollbackMeetingResult,
}) => {
  const state = Number(person?.state)
  const statusLabels = {
    20: 'Визит отменен',
    30: 'Гость прибыл',
    40: 'Отказ',
    50: 'Не трудоустроен',
    60: 'Трудоустроен',
  }

  const transitionTargetsByState = {
    10: [20, 30, 40, 50, 60],
    30: [40, 50, 60],
  }

  const canSetResultFromState = (currentState) => {
    if (currentState === 30 || currentState === 50) return canSetMeetingResult
    if (currentState === 40 || currentState === 60) return canChangeMeetingResult
    return false
  }

  const canSetTargetState = (targetState) => {
    if (state === 10 && targetState === 30) return canMarkArrived
    if (state === 10 && targetState === 20) return canMarkCancelled
    if (state === 10 && [40, 50, 60].includes(targetState)) return canSetMeetingResult
    if ([30, 40, 50, 60].includes(state) && [40, 50, 60].includes(targetState)) {
      return canSetResultFromState(state)
    }
    return false
  }

  const buildStatusAction = (targetState, reasonId = null) => () => {
    if (targetState === 30 && state === 10 && !reasonId) {
      onToggleArrived?.(person.id, dateKey, true, { forceReadOnlyAfterAction: true })
      return
    }
    if (targetState === 20 && state === 10 && !reasonId) {
      onToggleCancelled?.(person.id, dateKey, true, { forceReadOnlyAfterAction: true })
      return
    }
    onSetEntryState?.(
      person.id,
      dateKey,
      targetState,
      reasonId,
      { forceReadOnlyAfterAction: true },
    )
  }

  const statusChildren = (transitionTargetsByState[state] || [])
    .filter((targetState) => targetState !== state)
    .map((targetState) => {
      const enabled = canSetTargetState(targetState)
      const reasons = reasonsByState?.[String(targetState)] || []
      const needsReasonSubmenu = enabled && reasons.length > 0

      if (needsReasonSubmenu) {
        return {
          key: `status-${targetState}`,
          label: statusLabels[targetState] || `Статус ${targetState}`,
          enabled: true,
          children: reasons.map((reason) => ({
            key: `status-${targetState}-reason-${reason.id}`,
            label: reason.name,
            enabled: true,
            action: buildStatusAction(targetState, reason.id),
          })),
        }
      }

      return {
        key: `status-${targetState}`,
        label: statusLabels[targetState] || `Статус ${targetState}`,
        enabled,
        action: buildStatusAction(targetState),
      }
    })

  const status = {
    key: 'status',
    label: 'Статус',
    enabled: statusChildren.length > 0,
    children: statusChildren,
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

  const canRollback =
    (state === 20 && canUnmarkCancelled) ||
    (state === 30 && canUnmarkArrived) ||
    (state === 50) ||
    ((state === 40 || state === 60) && canRollbackMeetingResult)

  const rollback = {
    key: 'rollback',
    label: 'Откатить',
    enabled: canRollback,
    action: () => {
      if (state === 20) onToggleCancelled?.(person.id, dateKey, false, { forceReadOnlyAfterAction: true })
      if (state === 30) onToggleArrived?.(person.id, dateKey, false, { forceReadOnlyAfterAction: true })
      if (state === 40 || state === 50 || state === 60) {
        onRollbackMeetingResult?.(person.id, dateKey, { forceReadOnlyAfterAction: true })
      }
    },
  }

  return [status, rollback, pass].filter((item) => item.enabled || item.hint)
}
