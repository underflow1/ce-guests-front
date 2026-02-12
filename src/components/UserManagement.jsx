import { useState, useEffect, useRef } from 'react'
import useUsers from '../hooks/useUsers'
import useRoles from '../hooks/useRoles'
import { useToast } from './ToastProvider'

const UserManagement = ({ embedded = false }) => {
  const { getUsers, createUser, updateUser, activateUser, deactivateUser, loading, error: apiError } = useUsers()
  const { getRoles, loading: rolesLoading } = useRoles()
  const { pushToast } = useToast()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const lastErrorRef = useRef(null)

  // Форма создания
  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    is_admin: false,
    role_id: '',
  })

  // Форма редактирования
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    is_admin: false,
    is_active: true,
    role_id: '',
    enablePassword: false,
  })

  // Загрузить список пользователей
  const loadUsers = async () => {
    try {
      setLoadingUsers(true)
      setError(null)
      const usersList = await getUsers()
      setUsers(usersList)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingUsers(false)
    }
  }

  // Загрузить список ролей
  const loadRoles = async () => {
    try {
      const rolesList = await getRoles()
      setRoles(rolesList)
    } catch (err) {
      console.error('Ошибка загрузки ролей:', err)
    }
  }

  useEffect(() => {
    loadUsers()
    loadRoles()
  }, [])

  // Создать пользователя
  const handleCreate = async () => {
    if (!createForm.username.trim() || !createForm.password.trim()) {
      setError('Заполните обязательные поля (логин и пароль)')
      return
    }

    if (createForm.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      return
    }

    // Валидация: если не админ, то роль обязательна
    if (!createForm.is_admin && !createForm.role_id) {
      setError('Для не-админа необходимо выбрать роль')
      return
    }

    try {
      setError(null)
      await createUser({
        username: createForm.username.trim(),
        email: createForm.email.trim() || null,
        full_name: createForm.full_name.trim() || null,
        password: createForm.password,
        is_admin: createForm.is_admin,
        role_id: createForm.is_admin ? null : createForm.role_id || null,
      })
      setShowCreateForm(false)
      setCreateForm({
        username: '',
        email: '',
        full_name: '',
        password: '',
        is_admin: false,
        role_id: '',
      })
      await loadUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  const cancelCreate = () => {
    setShowCreateForm(false)
    setCreateForm({
      username: '',
      email: '',
      full_name: '',
      password: '',
      is_admin: false,
      role_id: '',
    })
    setError(null)
  }

  // Начать редактирование
  const startEdit = (user) => {
    setEditingUser(user.id)
    setEditForm({
      username: user.username,
      email: user.email || '',
      full_name: user.full_name || '',
      password: '',
      is_admin: user.is_admin,
      is_active: user.is_active,
      role_id: user.role_id || '',
      enablePassword: false,
    })
    setError(null)
  }

  const cancelEdit = () => {
    setEditingUser(null)
    setError(null)
  }

  // Сохранить изменения
  const handleUpdate = async (userId) => {
    const updateData = {}
    
    if (editForm.username !== users.find(u => u.id === userId)?.username) {
      updateData.username = editForm.username.trim()
    }
    if (editForm.email !== users.find(u => u.id === userId)?.email) {
      updateData.email = editForm.email.trim() || null
    }
    if (editForm.full_name !== users.find(u => u.id === userId)?.full_name) {
      updateData.full_name = editForm.full_name.trim() || null
    }
    if (editForm.enablePassword && editForm.password) {
      if (editForm.password.length < 6) {
        setError('Пароль должен содержать минимум 6 символов')
        return
      }
      updateData.password = editForm.password
    }
    if (editForm.is_admin !== users.find(u => u.id === userId)?.is_admin) {
      updateData.is_admin = editForm.is_admin
    }
    if (editForm.is_active !== users.find(u => u.id === userId)?.is_active) {
      updateData.is_active = editForm.is_active
    }
    if (editForm.role_id !== users.find(u => u.id === userId)?.role_id) {
      updateData.role_id = editForm.is_admin ? null : (editForm.role_id || null)
    }

    // Валидация: если не админ, то роль обязательна
    if (!editForm.is_admin && !editForm.role_id) {
      setError('Для не-админа необходимо выбрать роль')
      return
    }

    if (Object.keys(updateData).length === 0) {
      setEditingUser(null)
      return
    }

    try {
      setError(null)
      await updateUser(userId, updateData)
      setEditingUser(null)
      await loadUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  // Активировать пользователя
  const handleActivate = async (userId) => {
    try {
      setError(null)
      await activateUser(userId)
      await loadUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  // Деактивировать пользователя
  const handleDeactivate = async (userId) => {
    try {
      setError(null)
      await deactivateUser(userId)
      await loadUsers()
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

  useEffect(() => {
    if (!showCreateForm && !editingUser) return

    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return
      e.preventDefault()

      if (editingUser) {
        cancelEdit()
        return
      }

      if (showCreateForm) {
        cancelCreate()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editingUser, showCreateForm])

  return (
    <div className="panel" style={{ maxWidth: embedded ? '100%' : '66.666%', margin: '0 auto' }}>
      <header className="panel__header">
        <h2 className="panel__title">Управление пользователями</h2>
        <button
          className="button button--primary button--small"
          onClick={() => {
            setShowCreateForm(true)
            setEditingUser(null)
            setError(null)
          }}
          disabled={loading}
          tabIndex={showCreateForm ? -1 : 0}
          aria-hidden={showCreateForm}
          style={{
            gridColumn: 3,
            visibility: showCreateForm ? 'hidden' : 'visible',
            pointerEvents: showCreateForm ? 'none' : 'auto',
          }}
        >
          + Добавить пользователя
        </button>
      </header>

      {loadingUsers ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка...</div>
      ) : (
        <div className="panel__content" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Логин</th>
                <th>Email</th>
                <th>Фамилия Имя</th>
                <th>Админ</th>
                <th>Активен</th>
                <th>Роль</th>
                <th>Пароль</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  {editingUser === user.id ? (
                    <>
                      <td>
                        <input
                          type="text"
                          className="input input--compact"
                          value={editForm.username}
                          onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                          style={{ width: '100%' }}
                        />
                      </td>
                      <td>
                        <input
                          type="email"
                          className="input input--compact"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          style={{ width: '100%' }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="input input--compact"
                          value={editForm.full_name}
                          onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                          style={{ width: '100%' }}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={editForm.is_admin}
                          onChange={(e) => {
                            const isAdmin = e.target.checked
                            setEditForm({ ...editForm, is_admin: isAdmin, role_id: isAdmin ? '' : editForm.role_id })
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={editForm.is_active}
                          onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                        />
                      </td>
                      <td>
                        {editForm.is_admin ? (
                          <span className="text text--muted">-</span>
                        ) : (
                          <select
                            className="select select--compact"
                            value={editForm.role_id}
                            onChange={(e) => setEditForm({ ...editForm, role_id: e.target.value })}
                            style={{ width: '100%' }}
                            required={!editForm.is_admin}
                          >
                            <option value="" disabled hidden>
                              Выберите роль
                            </option>
                            {roles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="password"
                            className="input input--compact"
                            placeholder="Новый пароль"
                            value={editForm.password}
                            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                            disabled={!editForm.enablePassword}
                            style={{ flex: '1' }}
                          />
                          <label
                            className="text text--down text--muted"
                            style={{ display: 'flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap', cursor: 'pointer' }}
                          >
                            <input
                              type="checkbox"
                              checked={editForm.enablePassword}
                              onChange={(e) => setEditForm({ ...editForm, enablePassword: e.target.checked })}
                              style={{ margin: 0 }}
                            />
                            <span>Изм.</span>
                          </label>
                        </div>
                      </td>
                      <td>
                        <div className="table__actions" style={{ flexWrap: 'nowrap', alignItems: 'center', gap: 'var(--space-1)' }}>
                          <button
                            className="button button--primary button--small"
                            onClick={() => handleUpdate(user.id)}
                            disabled={loading}
                            style={{ whiteSpace: 'nowrap', width: '100px' }}
                          >
                            Сохранить
                          </button>
                          <button
                            className="button button--small"
                            onClick={cancelEdit}
                            style={{ whiteSpace: 'nowrap', width: '110px' }}
                          >
                            Отмена
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{user.username}</td>
                      <td>{user.email || '-'}</td>
                      <td>{user.full_name || '-'}</td>
                      <td>{user.is_admin ? 'Да' : 'Нет'}</td>
                      <td className={user.is_active ? 'table__status-active' : 'table__status-inactive'}>
                        {user.is_active ? 'Да' : 'Нет'}
                      </td>
                      <td>{user.role ? user.role.name : '-'}</td>
                      <td>
                        <input
                          type="password"
                          className="input input--compact"
                          value="••••••••"
                          disabled
                          style={{ width: '100%' }}
                        />
                      </td>
                      <td>
                        <div className="table__actions" style={{ flexWrap: 'nowrap', alignItems: 'center', gap: 'var(--space-1)' }}>
                          <button
                            className="button button--primary button--small"
                            onClick={() => startEdit(user)}
                            style={{ whiteSpace: 'nowrap', width: '100px' }}
                          >
                            Редактировать
                          </button>
                          {user.is_active ? (
                            <button
                              className="button button--small button--danger"
                              onClick={() => handleDeactivate(user.id)}
                              disabled={loading}
                              style={{ whiteSpace: 'nowrap', width: '110px' }}
                            >
                              Деактивировать
                            </button>
                          ) : (
                            <button
                              className="button button--small button--success"
                              onClick={() => handleActivate(user.id)}
                              disabled={loading}
                              style={{ whiteSpace: 'nowrap', width: '110px' }}
                            >
                              Активировать
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {showCreateForm && (
                <tr>
                  <td>
                    <input
                      type="text"
                      className="input input--compact"
                      placeholder="Логин *"
                      value={createForm.username}
                      onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                      style={{ width: '100%' }}
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="email"
                      className="input input--compact"
                      placeholder="Email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input input--compact"
                      placeholder="Фамилия Имя"
                      value={createForm.full_name}
                      onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={createForm.is_admin}
                      onChange={(e) => {
                        const isAdmin = e.target.checked
                        setCreateForm({ ...createForm, is_admin: isAdmin, role_id: isAdmin ? '' : createForm.role_id })
                      }}
                    />
                  </td>
                  <td>
                    <span className="text text--muted">-</span>
                  </td>
                  <td>
                    {createForm.is_admin ? (
                      <span className="text text--muted">-</span>
                    ) : (
                      <select
                        className="select select--compact"
                        value={createForm.role_id}
                        onChange={(e) => setCreateForm({ ...createForm, role_id: e.target.value })}
                        style={{ width: '100%' }}
                        required={!createForm.is_admin}
                      >
                        <option value="" disabled hidden>
                          Выберите роль
                        </option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>
                    <input
                      type="password"
                      className="input input--compact"
                      placeholder="Пароль *"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      style={{ width: '100%' }}
                      required
                      minLength={6}
                    />
                  </td>
                  <td>
                    <div className="table__actions" style={{ flexWrap: 'nowrap', alignItems: 'center', gap: 'var(--space-1)' }}>
                      <button
                        type="button"
                        className="button button--primary button--small"
                        onClick={handleCreate}
                        disabled={loading || !createForm.username.trim() || !createForm.password.trim()}
                        style={{ whiteSpace: 'nowrap', width: '100px' }}
                      >
                        {loading ? '...' : 'Создать'}
                      </button>
                      <button
                        type="button"
                        className="button button--small"
                        onClick={cancelCreate}
                        style={{ whiteSpace: 'nowrap', width: '110px' }}
                      >
                        Отмена
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default UserManagement
