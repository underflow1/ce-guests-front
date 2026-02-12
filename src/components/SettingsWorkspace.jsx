import { useMemo, useState } from 'react'

const NAV_ITEMS = [
  { key: 'users', label: 'Пользователи' },
  { key: 'roles', label: 'Роли' },
  { key: 'maintenance', label: 'Обслуживание' },
  { key: 'notifications', label: 'Уведомления' },
  { key: 'passes', label: 'Пропуска' },
  { key: 'visitDictionaries', label: 'Справочники визитов' },
]

const SettingsWorkspace = ({ onBack, sections }) => {
  const availableKeys = useMemo(
    () => NAV_ITEMS.filter((item) => sections[item.key]).map((item) => item.key),
    [sections]
  )
  const [activeSection, setActiveSection] = useState(availableKeys[0] || 'users')

  const currentSection = sections[activeSection] || null

  return (
    <div className="settings-workspace">
      <div className="settings-workspace__shell panel">
        <header className="panel__header settings-workspace__shell-header">
          <h2 className="panel__title">Настройки</h2>
          <button className="button button--small" onClick={onBack}>
            ← К записям
          </button>
        </header>

        <div className="settings-workspace__shell-body">
          <aside className="settings-workspace__nav">
            <div className="settings-workspace__nav-list">
              {NAV_ITEMS.filter((item) => sections[item.key]).map((item) => (
                <button
                  key={item.key}
                  className={`settings-workspace__nav-item${
                    activeSection === item.key ? ' settings-workspace__nav-item--active' : ''
                  }`}
                  onClick={() => setActiveSection(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </aside>

          <section className="settings-workspace__content">{currentSection}</section>
        </div>
      </div>
    </div>
  )
}

export default SettingsWorkspace
