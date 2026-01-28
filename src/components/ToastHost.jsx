const TYPE_META = {
  error: { title: 'Ошибка', icon: '!' },
  success: { title: 'Успех', icon: 'v' },
  warning: { title: 'Внимание', icon: '!' },
  info: { title: 'Инфо', icon: 'i' },
}

const ToastHost = ({ toasts, onClose }) => (
  <div className="toast-host" role="region" aria-live="polite">
    {toasts.map((toast) => {
      const meta = TYPE_META[toast.type] || TYPE_META.info
      const title = toast.title ?? meta.title

      return (
        <div
          key={toast.id}
          className={`toast toast--${toast.type || 'info'}${toast.isClosing ? ' toast--closing' : ''}`}
          role="alert"
        >
          <div className="toast__icon" aria-hidden="true">
            {meta.icon}
          </div>
          <div className="toast__body">
            {title && <div className="toast__title">{title}</div>}
            {toast.message && <div className="toast__message">{toast.message}</div>}
          </div>
          <button className="toast__close" type="button" onClick={() => onClose(toast.id)}>
            x
          </button>
        </div>
      )
    })}
  </div>
)

export default ToastHost
