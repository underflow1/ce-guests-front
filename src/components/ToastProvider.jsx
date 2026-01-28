import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import ToastHost from './ToastHost'

const ToastContext = createContext(null)
const EXIT_ANIMATION_MS = 200

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1)
  const closeTimers = useRef(new Map())

  const removeToast = useCallback((id) => {
    const timer = closeTimers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      closeTimers.current.delete(id)
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const startClose = useCallback(
    (id) => {
      if (closeTimers.current.has(id)) return
      setToasts((prev) =>
        prev.map((toast) => (toast.id === id ? { ...toast, isClosing: true } : toast))
      )
      const timer = setTimeout(() => {
        closeTimers.current.delete(id)
        removeToast(id)
      }, EXIT_ANIMATION_MS)
      closeTimers.current.set(id, timer)
    },
    [removeToast]
  )

  const pushToast = useCallback(
    ({ type = 'info', title, message, duration = 7500 }) => {
      const id = nextId.current++
      setToasts((prev) => [...prev, { id, type, title, message, duration, isClosing: false }])

      if (duration > 0) {
        setTimeout(() => {
          startClose(id)
        }, duration)
      }

      return id
    },
    [startClose]
  )

  const value = useMemo(() => ({ pushToast, removeToast: startClose }), [pushToast, startClose])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost toasts={toasts} onClose={startClose} />
    </ToastContext.Provider>
  )
}

const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export { ToastProvider, useToast }
