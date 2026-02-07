import { useMemo } from 'react'
import { DEFAULT_INTERFACE_TYPE, resolveInterfaceType } from '../constants/interfaces'

/**
 * Хук для проверки прав пользователя
 * @param {Object} user - Объект пользователя из useAuth
 * @returns {Object} Объект с функциями проверки прав и информацией о роли
 */
const usePermissions = (user) => {

  const permissions = useMemo(() => {
    if (!user) return new Set()
    
    // Админ имеет все права (проверяем как булево значение или число 1)
    // В базе is_admin хранится как INTEGER (0/1), но API возвращает как bool
    const isAdmin = !!user.is_admin || user.is_admin === 1 || user.is_admin === '1'
    
    if (isAdmin) {
      // Админ автоматически получает все UI-права
      return new Set([
        'can_move_ui',
        'can_mark_completed_ui',
        'can_unmark_completed_ui',
        'can_mark_cancelled_ui',
        'can_unmark_cancelled_ui',
        'can_mark_pass_ui',
        'can_revoke_pass_ui',
        'can_edit_entry_ui',
        'can_delete_ui',
        'can_set_meeting_result_ui',
        'can_change_meeting_result_ui',
        'can_rollback_meeting_result_ui',
      ])
    }
    // Обычный пользователь - права из роли (только UI-права, бэкенд-права не отдаются на фронт)
    if (user.permissions && Array.isArray(user.permissions)) {
      return new Set(user.permissions)
    }
    return new Set()
  }, [user])

  const hasPermission = (permissionCode) => {
    return permissions.has(permissionCode)
  }

  // UI-права для управления интерфейсом
  const canMoveUi = () => hasPermission('can_move_ui')
  const canMarkCompletedUi = () => hasPermission('can_mark_completed_ui')
  const canUnmarkCompletedUi = () => hasPermission('can_unmark_completed_ui')
  const canMarkCancelledUi = () => hasPermission('can_mark_cancelled_ui')
  const canUnmarkCancelledUi = () => hasPermission('can_unmark_cancelled_ui')
  const canMarkPassUi = () => hasPermission('can_mark_pass_ui')
  const canRevokePassUi = () => hasPermission('can_revoke_pass_ui')
  const canEditEntryUi = () => hasPermission('can_edit_entry_ui')
  const canDeleteUi = () => hasPermission('can_delete_ui')
  const canSetMeetingResultUi = () => hasPermission('can_set_meeting_result_ui')
  const canChangeMeetingResultUi = () => hasPermission('can_change_meeting_result_ui')
  const canRollbackMeetingResultUi = () => hasPermission('can_rollback_meeting_result_ui')

  // Проверяем is_admin как булево значение или число 1
  const isAdmin = useMemo(() => {
    if (!user) return false
    // В базе is_admin хранится как INTEGER (0/1), но API возвращает как bool
    return !!user.is_admin || user.is_admin === 1 || user.is_admin === '1'
  }, [user])

  const interfaceType = useMemo(() => {
    if (!user) return DEFAULT_INTERFACE_TYPE
    return resolveInterfaceType(user.role?.interface_type)
  }, [user])

  return {
    permissions,
    hasPermission,
    canMoveUi,
    canMarkCompletedUi,
    canUnmarkCompletedUi,
    canMarkCancelledUi,
    canUnmarkCancelledUi,
    canMarkPassUi,
    canRevokePassUi,
    canEditEntryUi,
    canDeleteUi,
    canSetMeetingResultUi,
    canChangeMeetingResultUi,
    canRollbackMeetingResultUi,
    interfaceType,
    isAdmin,
  }
}

export default usePermissions
