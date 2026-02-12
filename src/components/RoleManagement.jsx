import { useEffect, useMemo, useRef, useState } from 'react'
import useRoles from '../hooks/useRoles'
import { DEFAULT_INTERFACE_TYPE, INTERFACE_OPTIONS, resolveInterfaceType, toApiInterfaceType } from '../constants/interfaces'
import { useToast } from './ToastProvider'

const RoleManagement = ({ embedded = false }) => {
  const { getRoles, getPermissions, createRole, updateRole, deleteRole, loading, error: apiError } = useRoles()
  const { pushToast } = useToast()
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loadingRoles, setLoadingRoles] = useState(true)
  const [error, setError] = useState(null)
  const lastErrorRef = useRef(null)

  const [modal, setModal] = useState({ open: false, mode: null, roleId: null }) // mode: 'create' | 'edit'
  const [form, setForm] = useState({
    name: '',
    description: '',
    interface_type: DEFAULT_INTERFACE_TYPE,
    permission_ids: [],
  })
  const fromApiInterfaceType = (value) => resolveInterfaceType(value)

  // Загрузить список ролей и прав
  const loadData = async () => {
    try {
      setLoadingRoles(true)
      setError(null)
      const [rolesList, permissionsList] = await Promise.all([
        getRoles(),
        getPermissions(),
      ])
      setRoles(rolesList)
      setPermissions(permissionsList)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingRoles(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const closeModal = () => {
    setModal({ open: false, mode: null, roleId: null })
    setError(null)
  }

  const openCreate = () => {
    setModal({ open: true, mode: 'create', roleId: null })
    setForm({ name: '', description: '', interface_type: DEFAULT_INTERFACE_TYPE, permission_ids: [] })
    setError(null)
  }

  const openEdit = (role) => {
    setModal({ open: true, mode: 'edit', roleId: role.id })
    setForm({
      name: role.name,
      description: role.description || '',
      interface_type: fromApiInterfaceType(role.interface_type),
      permission_ids: role.permission_ids || role.permissions?.map((p) => p.id) || [],
    })
    setError(null)
  }

  useEffect(() => {
    if (!modal.open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeModal()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modal.open])

  const isUiPermission = (perm) => {
    const code = perm?.code || ''
    return code.endsWith('_ui')
  }

  const permissionGroups = useMemo(() => {
    const ui = []
    const other = []
    for (const p of permissions) {
      if (isUiPermission(p)) ui.push(p)
      else other.push(p)
    }
    ui.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    other.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    return { ui, other }
  }, [permissions])

  const selectedPermissionSet = useMemo(() => new Set(form.permission_ids), [form.permission_ids])

  const togglePermission = (permissionId) => {
    setForm((prev) => {
      const exists = prev.permission_ids.includes(permissionId)
      return {
        ...prev,
        permission_ids: exists
          ? prev.permission_ids.filter((id) => id !== permissionId)
          : [...prev.permission_ids, permissionId],
      }
    })
  }

  const setAllInGroup = (permList, enabled) => {
    const ids = permList.map((p) => p.id)
    setForm((prev) => {
      const current = new Set(prev.permission_ids)
      if (enabled) {
        for (const id of ids) current.add(id)
      } else {
        for (const id of ids) current.delete(id)
      }
      return { ...prev, permission_ids: Array.from(current) }
    })
  }

  const validateForm = () => {
    if (!form.name.trim()) return 'Введите название роли'
    if (form.permission_ids.length === 0) return 'Выберите хотя бы одно право'
    return null
  }

  // Создать / обновить роль
  const handleSubmit = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setError(null)

      if (modal.mode === 'create') {
        await createRole({
          name: form.name.trim(),
          description: form.description.trim() || null,
          interface_type: toApiInterfaceType(form.interface_type),
          permission_ids: form.permission_ids,
        })
        closeModal()
        await loadData()
        pushToast({ type: 'success', title: 'Успех', message: 'Роль создана' })
        return
      }

      // edit mode
      const roleId = modal.roleId
      const originalRole = roles.find((r) => r.id === roleId)
      if (!originalRole) {
        throw new Error('Роль не найдена')
      }

      const updateData = {}
      if (form.name !== originalRole.name) updateData.name = form.name.trim()
      if (form.description !== (originalRole.description || '')) updateData.description = form.description.trim() || null
      const apiInterfaceType = toApiInterfaceType(form.interface_type)
      if (apiInterfaceType !== originalRole.interface_type) updateData.interface_type = apiInterfaceType

      const originalPermIds = originalRole.permission_ids || originalRole.permissions?.map((p) => p.id) || []
      const permIdsChanged =
        JSON.stringify([...form.permission_ids].sort()) !== JSON.stringify([...originalPermIds].sort())
      if (permIdsChanged) updateData.permission_ids = form.permission_ids

      if (Object.keys(updateData).length === 0) {
        closeModal()
        return
      }

      await updateRole(roleId, updateData)
      closeModal()
      await loadData()
      pushToast({ type: 'success', title: 'Успех', message: 'Роль обновлена' })
    } catch (err) {
      setError(err.message)
    }
  }

  // Сохранить изменения
  const handleUpdate = async (roleId) => {
    if (!editForm.name.trim()) {
      setError('Введите название роли')
      return
    }

    if (editForm.permission_ids.length === 0) {
      setError('Выберите хотя бы одно право')
      return
    }

    const updateData = {}
    
    const originalRole = roles.find(r => r.id === roleId)
    if (editForm.name !== originalRole.name) {
      updateData.name = editForm.name.trim()
    }
    if (editForm.description !== (originalRole.description || '')) {
      updateData.description = editForm.description.trim() || null
    }
    if (editForm.interface_type !== originalRole.interface_type) {
      updateData.interface_type = editForm.interface_type
    }
    
    const originalPermIds = originalRole.permission_ids || originalRole.permissions?.map(p => p.id) || []
    const permIdsChanged = JSON.stringify(editForm.permission_ids.sort()) !== JSON.stringify(originalPermIds.sort())
    if (permIdsChanged) {
      updateData.permission_ids = editForm.permission_ids
    }

    if (Object.keys(updateData).length === 0) {
      setEditingRole(null)
      return
    }

    try {
      setError(null)
      await updateRole(roleId, updateData)
      setEditingRole(null)
      await loadData()
      pushToast({ type: 'success', title: 'Успех', message: 'Роль обновлена' })
    } catch (err) {
      setError(err.message)
    }
  }

  // Удалить роль
  const handleDelete = async (roleId) => {
    const role = roles.find(r => r.id === roleId)
    if (!role) return

    const confirmed = window.confirm(
      `Вы уверены, что хотите удалить роль "${role.name}"?\n\nЭто действие нельзя отменить!`
    )

    if (!confirmed) return

    try {
      setError(null)
      await deleteRole(roleId)
      await loadData()
      pushToast({ type: 'success', title: 'Успех', message: 'Роль удалена' })
    } catch (err) {
      setError(err.message)
    }
  }

  const displayError = error || apiError

  useEffect(() => {
    if (!displayError) {
      lastErrorRef.current = null
      return
    }

    if (displayError === lastErrorRef.current) {
      return
    }

    pushToast({ type: 'error', title: 'Ошибка', message: displayError })
    lastErrorRef.current = displayError
  }, [displayError, pushToast])

  return (
    <div
      className="panel role-management"
      style={embedded ? { width: '100%' } : { maxWidth: '66.666%', margin: '0 auto' }}
    >
      <header className="panel__header settings-headbar">
        <h2 className="panel__title">Управление ролями</h2>
        <button
          className="button button--primary button--small settings-headbar__action"
          onClick={openCreate}
          disabled={loading}
          title="Добавить роль"
          aria-label="Добавить роль"
        >
          + Добавить роль
        </button>
      </header>

      {loadingRoles ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка...</div>
      ) : (
        <div className="panel__content" style={{ overflowX: 'auto' }}>
          <div className="role-list">
            {roles.length === 0 ? (
              <div className="role-list__empty">Роли не найдены</div>
            ) : (
              <table className="table role-management__table">
                <thead>
                  <tr>
                    <th>Роль</th>
                    <th>Описание</th>
                    <th>Права</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => {
                    const rolePerms = Array.isArray(role.permissions) ? role.permissions : []
                    const uiCount = rolePerms.filter((p) => isUiPermission(p)).length
                    const otherCount = rolePerms.length - uiCount

                    return (
                      <tr key={role.id}>
                        <td title={role.name}>{role.name}</td>
                        <td title={role.description || ''}>
                          {role.description || 'Описание роли не указано'}
                        </td>
                        <td title={`UI: ${uiCount}, Backend: ${otherCount}`}>
                          UI: {uiCount}, Backend: {otherCount}
                        </td>
                        <td>
                          <div className="table__actions">
                            <button
                              className="icon-action-button icon-action-button--primary"
                              onClick={() => openEdit(role)}
                              title="Редактировать роль"
                              aria-label="Редактировать роль"
                            >
                              <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                            </button>
                            <button
                              className="icon-action-button icon-action-button--danger"
                              onClick={() => handleDelete(role.id)}
                              disabled={loading}
                              title="Удалить роль"
                              aria-label="Удалить роль"
                            >
                              <i className="fa-solid fa-trash" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {modal.open && (
            <div className="role-modal-overlay" aria-hidden="true">
              <section
                className="role-modal text"
                role="dialog"
                aria-modal="true"
                aria-label={modal.mode === 'create' ? 'Создание роли' : 'Редактирование роли'}
              >
                <header className="role-modal__header panel__header settings-headbar">
                  <h3 className="role-modal__title panel__title">
                    {modal.mode === 'create' ? 'Создать роль' : 'Редактировать роль'}
                  </h3>
                  <button
                    type="button"
                    className="icon-action-button settings-headbar__action"
                    onClick={closeModal}
                    title="Закрыть"
                    aria-label="Закрыть"
                  >
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                  </button>
                </header>

                <div className="role-modal__body">
                  <div className="role-modal__layout">
                    <section className="role-modal__card">
                      <div className="role-modal__card-title text text--bold">
                        Параметры роли
                      </div>
                      <div className="role-modal__fields">
                        <label className="role-modal__field">
                          <span className="role-modal__label text">Название *</span>
                          <input
                            type="text"
                            className="input text"
                            value={form.name}
                            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                          />
                        </label>

                        <label className="role-modal__field">
                          <span className="role-modal__label text">Описание</span>
                          <textarea
                            className="input text"
                            rows={3}
                            value={form.description}
                            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                          />
                        </label>

                        <label className="role-modal__field">
                          <span className="role-modal__label text">Интерфейс</span>
                          <select
                            className="input text"
                            value={form.interface_type}
                            onChange={(e) => setForm((p) => ({ ...p, interface_type: e.target.value }))}
                          >
                            {INTERFACE_OPTIONS.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </section>

                    <section className="role-modal__card">
                      <header className="role-modal__perm-head">
                        <div className="text text--bold">UI-права</div>
                        <div className="role-modal__perm-actions">
                          <button
                            type="button"
                            className="button button--small"
                            onClick={() => setAllInGroup(permissionGroups.ui, true)}
                            disabled={permissionGroups.ui.length === 0}
                          >
                            Выбрать все
                          </button>
                          <button
                            type="button"
                            className="button button--small"
                            onClick={() => setAllInGroup(permissionGroups.ui, false)}
                            disabled={permissionGroups.ui.length === 0}
                          >
                            Снять все
                          </button>
                        </div>
                      </header>
                      <div className="role-modal__perm-list">
                        {permissionGroups.ui.length === 0 ? (
                          <div className="text text--down text--muted">UI-прав нет</div>
                        ) : (
                          permissionGroups.ui.map((perm) => (
                            <label className="role-modal__perm-item" key={perm.id}>
                              <input
                                type="checkbox"
                                checked={selectedPermissionSet.has(perm.id)}
                                onChange={() => togglePermission(perm.id)}
                              />
                              <span className="role-modal__perm-text">
                                <span className="text">{perm.name}</span>
                                <span className="text text--down text--subtle">{perm.code}</span>
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    </section>

                    <section className="role-modal__card">
                      <header className="role-modal__perm-head">
                        <div className="text text--bold">Backend-права</div>
                        <div className="role-modal__perm-actions">
                          <button
                            type="button"
                            className="button button--small"
                            onClick={() => setAllInGroup(permissionGroups.other, true)}
                            disabled={permissionGroups.other.length === 0}
                          >
                            Выбрать все
                          </button>
                          <button
                            type="button"
                            className="button button--small"
                            onClick={() => setAllInGroup(permissionGroups.other, false)}
                            disabled={permissionGroups.other.length === 0}
                          >
                            Снять все
                          </button>
                        </div>
                      </header>
                      <div className="role-modal__perm-list">
                        {permissionGroups.other.length === 0 ? (
                          <div className="text text--down text--muted">Прав нет</div>
                        ) : (
                          permissionGroups.other.map((perm) => (
                            <label className="role-modal__perm-item" key={perm.id}>
                              <input
                                type="checkbox"
                                checked={selectedPermissionSet.has(perm.id)}
                                onChange={() => togglePermission(perm.id)}
                              />
                              <span className="role-modal__perm-text">
                                <span className="text">{perm.name}</span>
                                <span className="text text--down text--subtle">{perm.code}</span>
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    </section>
                  </div>
                </div>

                <footer className="role-modal__footer settings-bottombar">
                  <button className="button button--small" onClick={closeModal}>
                    Отмена
                  </button>
                  <button
                    className="button button--primary button--small"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? '...' : modal.mode === 'create' ? 'Создать' : 'Сохранить'}
                  </button>
                </footer>
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default RoleManagement
