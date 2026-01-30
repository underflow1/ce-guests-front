import { useState, useRef, useEffect } from 'react'
import { addDays, toDateKey } from '../utils/date'
import useResponsibleAutocomplete from '../hooks/useResponsibleAutocomplete'

const EntryForm = ({
  form,
  setForm,
  onSubmit,
  isSubmitDisabled,
  nameInputRef,
  dateInputRef,
  today,
  todayKey,
  isEditing,
  allResponsibles = [],
  canEditEntry = true,
  labelTextClassName,
}) => {
  const { suggestions, isLoading, showDropdown, setShowDropdown } = useResponsibleAutocomplete(form.responsible)
  const [showAllResponsiblesDropdown, setShowAllResponsiblesDropdown] = useState(false)
  const autocompleteRef = useRef(null)
  const responsibleInputRef = useRef(null)

  // Закрываем дропдаун при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Не закрываем, если клик был на элементе автокомплита
      if (event.target.closest('.autocomplete__dropdown')) {
        return
      }
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowDropdown(false)
        setShowAllResponsiblesDropdown(false)
      }
    }

    if (showDropdown || showAllResponsiblesDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown, showAllResponsiblesDropdown, setShowDropdown])

  const handleSuggestionClick = (suggestion, event) => {
    event.preventDefault()
    event.stopPropagation()
    setForm((prev) => ({ ...prev, responsible: suggestion }))
    setShowDropdown(false)
    setShowAllResponsiblesDropdown(false)
    if (responsibleInputRef.current) {
      responsibleInputRef.current.focus()
    }
  }

  const handleDoubleClick = (event) => {
    // Если поле пустое, показываем дропдаун со всеми ответственными
    if (!form.responsible || form.responsible.trim() === '') {
      if (allResponsibles.length > 0) {
        setShowAllResponsiblesDropdown(true)
        setShowDropdown(false)
      }
    }
  }

  return (
  <form className="form panel__content text" onSubmit={onSubmit}>
    <label className="form__field">
      <span className={['form__label', labelTextClassName || 'text text--down text--muted'].join(' ')}>ФИО</span>
      <div className="form__control">
        <input
          ref={nameInputRef}
          className="input"
          type="text"
          value={form.name}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, name: event.target.value }))
          }
          placeholder="Например, Иван Петров"
          disabled={isEditing && !canEditEntry}
        />
      </div>
    </label>

    <label className="form__field">
      <span className={['form__label', labelTextClassName || 'text text--down text--muted'].join(' ')}>Ответственный</span>
      <div className="form__control" ref={autocompleteRef} style={{ position: 'relative' }}>
        <input
          ref={responsibleInputRef}
          className="input"
          type="text"
          value={form.responsible}
          onChange={(event) => {
            setForm((prev) => ({
              ...prev,
              responsible: event.target.value,
            }))
            // Закрываем дропдаун со всеми ответственными при вводе
            setShowAllResponsiblesDropdown(false)
          }}
          onDoubleClick={handleDoubleClick}
          onFocus={() => {
            if (suggestions.length > 0 && form.responsible.length >= 3) {
              setShowDropdown(true)
            }
          }}
          placeholder="Например, Анна Соколова"
          disabled={isEditing && !canEditEntry}
        />
        {showAllResponsiblesDropdown && allResponsibles.length > 0 && (
          <div className="autocomplete__dropdown">
            {allResponsibles.map((responsible, index) => (
              <div
                key={index}
                className="autocomplete__item"
                onMouseDown={(e) => handleSuggestionClick(responsible, e)}
              >
                {responsible}
              </div>
            ))}
          </div>
        )}
        {showDropdown && !showAllResponsiblesDropdown && (
          <div className="autocomplete__dropdown">
            {isLoading ? (
              <div className="autocomplete__item autocomplete__item--loading">Загрузка...</div>
            ) : suggestions.length > 0 ? (
              suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="autocomplete__item"
                  onMouseDown={(e) => handleSuggestionClick(suggestion, e)}
                >
                  {suggestion}
                </div>
              ))
            ) : (
              <div className="autocomplete__item autocomplete__item--empty">Нет вариантов</div>
            )}
          </div>
        )}
      </div>
    </label>

    <label className="form__field">
      <span className={['form__label', labelTextClassName || 'text text--down text--muted'].join(' ')}>Время</span>
      <div className="form__control">
        <select
          className="select"
          value={form.time}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, time: event.target.value }))
          }
        >
          {Array.from({ length: 10 }, (_, idx) => {
            const hour = String(9 + idx).padStart(2, '0')
            return ['00', '30'].map((minute) => {
              const time = `${hour}:${minute}`
              return (
                <option value={time} key={time}>
                  {time}
                </option>
              )
            })
          })}
        </select>
      </div>
    </label>

    <div className="form__field">
      <span className={['form__label', labelTextClassName || 'text text--down text--muted'].join(' ')}>Куда добавить</span>
      <div className="form__control">
        <div className="form__options">
          <label className="form__option">
            <input
              type="radio"
              name="target"
              value="today"
              checked={form.target === 'today'}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  target: event.target.value,
                }))
              }
            />
            <span className="text">Сегодня</span>
          </label>
          <label className="form__option">
            <input
              type="radio"
              name="target"
              value="next_workday"
              checked={form.target === 'next_workday'}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  target: event.target.value,
                }))
              }
            />
            <span className="text">Следующий рабочий день</span>
          </label>
          <label className="form__option">
            <input
              type="radio"
              name="target"
              value="other"
              checked={form.target === 'other'}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  target: event.target.value,
                  otherDate:
                    event.target.value === 'other' && !prev.otherDate
                      ? toDateKey(addDays(today, 2))
                      : prev.otherDate,
                }))
              }
            />
            <span className="text">Другой день</span>
          </label>
        </div>
      </div>
    </div>

    <label className="form__field">
      <span className={['form__label', labelTextClassName || 'text text--down text--muted'].join(' ')}>Дата</span>
      <div
        className="form__control"
        onClick={(event) => {
          if (
            form.target === 'other' &&
            dateInputRef.current &&
            event.target !== dateInputRef.current
          ) {
            dateInputRef.current.focus()
            setTimeout(() => {
              if (dateInputRef.current?.showPicker) {
                dateInputRef.current.showPicker()
              }
            }, 0)
          }
        }}
        style={{ cursor: form.target === 'other' ? 'pointer' : 'default' }}
      >
        <input
          ref={dateInputRef}
          className="input"
          type="date"
          value={form.otherDate}
          min={todayKey}
          disabled={form.target !== 'other'}
          onClick={(event) => {
            if (form.target === 'other' && dateInputRef.current?.showPicker) {
              event.preventDefault()
              dateInputRef.current.showPicker()
            }
          }}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              otherDate: event.target.value,
            }))
          }
        />
      </div>
    </label>

    <button className="button button--primary text" type="submit" disabled={isSubmitDisabled}>
      {isEditing ? 'Сохранить' : 'Создать'}
    </button>
  </form>
  )
}

export default EntryForm
