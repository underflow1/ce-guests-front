import { useEffect, useRef, useState } from 'react'
import { useToast } from './ToastProvider'

const LoginForm = ({ onLogin }) => {
  const { pushToast } = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const lastErrorRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Заполните все поля')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await onLogin(username.trim(), password)
      // После успешного логина useAuth обновит состояние, App перерендерится
    } catch (err) {
      setError(err.message || 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  const displayError = error

  useEffect(() => {
    if (!displayError) {
      lastErrorRef.current = null
      return
    }

    if (displayError === lastErrorRef.current) {
      return
    }

    pushToast({ type: 'error', title: 'Ошибка входа', message: displayError })
    lastErrorRef.current = displayError
  }, [displayError, pushToast])

  return (
    <div className="login">
      <div className="panel login__panel">
        <div className="login__header">
          <div className="text text--up text--bold">Вход в систему</div>
        </div>

        <form onSubmit={handleSubmit} className="login__form">
          <label className="login__field">
            <span className="text text--muted">Имя пользователя</span>
            <input
              type="text"
              className="input text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </label>

          <label className="login__field">
            <span className="text text--muted">Пароль</span>
            <input
              type="password"
              className="input text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </label>

          <button type="submit" disabled={loading} className="button button--primary login__submit text">
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginForm
