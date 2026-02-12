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
    <div className="layout">
      <div className="layout__shell panel section">
        <header className="panel__header layout__header section__header section__header--between">
          <h2 className="panel__title">Настройки</h2>
          <button className="button button--small" onClick={onBack}>
            ← К записям
          </button>
        </header>

        <div className="layout__body">
          <aside className="layout__nav">
            <div className="layout__list">
              {NAV_ITEMS.filter((item) => sections[item.key]).map((item) => (
                <button
                  key={item.key}
                  className={`layout__item${
                    activeSection === item.key ? ' layout__item--active' : ''
                  }`}
                  onClick={() => setActiveSection(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </aside>

          <section className="layout__content">{currentSection}</section>
        </div>
      </div>
    </div>
  )
}

export default SettingsWorkspace
