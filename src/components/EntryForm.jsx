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
  editingEntry,
  allResponsibles = [],
  canEditEntry = true,
  canDeleteEntry = false,
  visitGoals = [],
  meetingResults = [],
  meetingResultReasons = [],
  meetingResultReasonsLoading = false,
  canMarkPass = false,
  canRevokePass = false,
  canSetMeetingResult = false,
  labelTextClassName,
  interfaceType = 'user',
  isFormActive = true,
  onOrderPass,
  onRevokePass,
  onDeleteEntry,
  onExitEdit,
}) => {
  const { suggestions, isLoading, showDropdown, setShowDropdown } = useResponsibleAutocomplete(form.responsible)
  const [showAllResponsiblesDropdown, setShowAllResponsiblesDropdown] = useState(false)
  const autocompleteRef = useRef(null)
  const responsibleInputRef = useRef(null)
  const isUser = interfaceType === 'user'
  const editingDateKey = form.editingDateKey
  const entry = editingEntry
  const isEditingActive = Boolean(isEditing && entry && editingDateKey)
  const isCancelled = Boolean(entry?.is_cancelled)
  const isCompleted = Boolean(entry?.is_completed)
  const isFormLocked = isUser && !isFormActive
  const isEntryLocked = isEditingActive && (isCancelled || isCompleted)
  const isFieldDisabled = isFormLocked || isEntryLocked || (isEditing && !canEditEntry)
  const isMeetingResultVisible = isEditingActive && isCompleted
  const canEditMeetingResult = isMeetingResultVisible && canSetMeetingResult && !isFormLocked
  const isMeetingResultDisabled = !canEditMeetingResult
  const meetingResultRequiresReason = isMeetingResultVisible && (meetingResultReasons || []).length > 0
  const isSubmitLocked = isFormLocked || isCancelled || (isCompleted && !canSetMeetingResult)
  const passStatus = entry?.pass_status || null
  const passAction = passStatus === 'ordered' ? 'revoke' : 'order'
  const canPassAction = passAction === 'order' ? canMarkPass : canRevokePass
  const isPastEntry = Boolean(isEditingActive && editingDateKey && editingDateKey < todayKey)
  const isPassOrderingDisabled = passAction === 'order' && isPastEntry
  const passState =
    passStatus === 'ordered'
      ? 'ordered'
      : passStatus === 'failed'
      ? 'failed'
      : 'none'
  const passTitle =
    passStatus === 'ordered'
      ? 'Пропуск заказан'
      : passStatus === 'failed'
      ? 'Ошибка заказа пропуска'
      : 'Пропуск не заказан'
  const passPastDateTitle = 'Заказ пропуска недоступен для прошлых дат'
  const passActionTitle = passAction === 'order' ? 'Заказать пропуск' : 'Отозвать пропуск'
  const passDisabled = !isEditingActive || isCancelled || isCompleted || !canPassAction || isPassOrderingDisabled
  const passButtonTitle = isPassOrderingDisabled
    ? `${passTitle}. ${passPastDateTitle}`
    : `${passTitle}. ${passActionTitle}`

  const deleteDisabled = !isEditingActive || isCancelled || isCompleted || !canDeleteEntry

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

  const toggleVisitGoal = (goalId) => {
    setForm((prev) => {
      const selected = prev.visitGoalIds || []
      const isSelected = selected.includes(goalId)
      return {
        ...prev,
        visitGoalIds: isSelected
          ? selected.filter((id) => id !== goalId)
          : [...selected, goalId],
      }
    })
  }

  const handleMeetingResultSelect = (resultId) => {
    if (isMeetingResultDisabled) return
    setForm((prev) => ({
      ...prev,
      meetingResultId: resultId,
      meetingResultReasonId: null,
    }))
  }

  const handleMeetingReasonSelect = (reasonId) => {
    if (isMeetingResultDisabled) return
    setForm((prev) => ({
      ...prev,
      meetingResultReasonId: reasonId,
    }))
  }

  return (
  <form
    className={[
      'form',
      'panel__content',
      'text',
      isUser ? 'form--stacked' : '',
      isFormLocked ? 'form--inactive' : '',
    ].join(' ')}
    onSubmit={onSubmit}
    onKeyDown={(event) => {
      if (event.key === 'Escape' && isUser && isEditing) {
        event.preventDefault()
        event.stopPropagation()
        onExitEdit?.()
      }
    }}
  >
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
          disabled={isFieldDisabled}
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
          disabled={isFieldDisabled}
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

    <div className="form__field">
      <span className={['form__label', labelTextClassName || 'text text--down text--muted'].join(' ')}>
        Цель визита
      </span>
      <div className="form__control">
        <div className="visit-goals">
          {visitGoals.length === 0 ? (
            <span className="text text--muted">Нет активных целей</span>
          ) : (
            visitGoals.map((goal) => {
              const isSelected = (form.visitGoalIds || []).includes(goal.id)
              return (
                <button
                  key={goal.id}
                  type="button"
                  className={`visit-goal-chip text text--thin text--down${isSelected ? ' visit-goal-chip--selected' : ''}`}
                  onClick={() => toggleVisitGoal(goal.id)}
                  disabled={isFieldDisabled}
                  aria-pressed={isSelected}
                >
                  {goal.name}
                </button>
              )
            })
          )}
        </div>
        {!isFieldDisabled && (form.visitGoalIds || []).length === 0 && (
          <div className="visit-goals__hint text text--down text--muted">Выберите хотя бы одну цель</div>
        )}
      </div>
    </div>

    {isMeetingResultVisible && (
    <div className="form__field">
      <span className={['form__label', labelTextClassName || 'text text--down text--muted'].join(' ')}>
        Результат встречи
      </span>
      <div className="form__control">
        <div className="visit-goals">
          {(() => {
            // Показываем только статусы с code > 0 (статусы с code <= 0 - служебные, не для выбора)
            // Также исключаем статус "Встреча не состоялась" по названию (на случай если code еще не установлен)
            const filteredResults = meetingResults.filter(
              (result) => {
                // Исключаем по названию
                if (result.name.toLowerCase() === 'встреча не состоялась') return false
                // Показываем только с code > 0 или code == null (для обратной совместимости)
                return result.code == null || result.code > 0
              }
            )
            return filteredResults.length === 0 ? (
              <span className="text text--muted">Нет доступных результатов</span>
            ) : (
              filteredResults.map((result) => {
              const isSelected = form.meetingResultId === result.id
              return (
                <button
                  key={result.id}
                  type="button"
                  className={`visit-goal-chip text text--thin text--down${isSelected ? ' visit-goal-chip--selected' : ''}`}
                  onClick={() => handleMeetingResultSelect(result.id)}
                  disabled={isMeetingResultDisabled}
                  aria-pressed={isSelected}
                >
                  {result.name}
                </button>
              )
            })
            )
          })()}
        </div>
        {isMeetingResultDisabled && (
          <div className="visit-goals__hint text text--down text--muted">Нет прав на изменение результата</div>
        )}
        {!isMeetingResultDisabled && !form.meetingResultId && (
          <div className="visit-goals__hint text text--down text--muted">Выберите результат встречи</div>
        )}
      </div>

      {form.meetingResultId && (meetingResultRequiresReason || meetingResultReasonsLoading) && (
      <div className="form__control" style={{ marginTop: 'var(--space-2)' }}>
        {!isMeetingResultDisabled && meetingResultRequiresReason && (
          <div className="visit-goals__hint text text--down text--muted">Выберите причину</div>
        )}
        <div className="visit-goals">
          {meetingResultReasonsLoading ? (
            <span className="text text--muted">Загрузка причин...</span>
          ) : meetingResultReasons.length === 0 ? (
            <span className="text text--muted">Причины не требуются</span>
          ) : (
            meetingResultReasons.map((reason) => {
              const isSelected = form.meetingResultReasonId === reason.id
              return (
                <button
                  key={reason.id}
                  type="button"
                  className={`visit-goal-chip text text--thin text--down${isSelected ? ' visit-goal-chip--selected' : ''}`}
                  onClick={() => handleMeetingReasonSelect(reason.id)}
                  disabled={isMeetingResultDisabled}
                  aria-pressed={isSelected}
                >
                  {reason.name}
                </button>
              )
            })
          )}
        </div>
      </div>
      )}
    </div>
    )}

    <div className="form__submit-row" style={{ gap: 'var(--space-2)' }}>
      {isEditing && (
        <button
          className="button text"
          type="button"
          onClick={onExitEdit}
        >
          Отмена
        </button>
      )}
      <button
        className="button button--primary text form__submit"
        type="submit"
        disabled={isSubmitDisabled || isSubmitLocked}
      >
        {isEditing ? 'Сохранить' : 'Создать'}
      </button>
    </div>

    {!isUser && (
    <label className="form__field">
      <span className={['form__label', labelTextClassName || 'text text--down text--muted'].join(' ')}>Время</span>
      <div className="form__control">
        <select
          className="select"
          value={form.time}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, time: event.target.value }))
          }
          disabled={isFieldDisabled}
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
    )}

    {!isUser && (
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
              disabled={isFieldDisabled}
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
              disabled={isFieldDisabled}
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
              disabled={isFieldDisabled}
            />
            <span className="text">Другой день</span>
          </label>
        </div>
      </div>
    </div>
    )}

    {!isUser && (
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
          disabled={isFieldDisabled || form.target !== 'other'}
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
    )}

    <div className="form__bottom-actions">
      <button
        type="button"
        className="button text"
        title={passButtonTitle}
        aria-label={passButtonTitle}
        disabled={passDisabled}
        onClick={() => {
          if (passDisabled) return
          if (passAction === 'order') onOrderPass?.(entry.id, editingDateKey)
          if (passAction === 'revoke') onRevokePass?.(entry.id, editingDateKey)
        }}
      >
        {passActionTitle}
      </button>
      <button
        type="button"
        className="button button--danger text"
        title="Удалить запись"
        aria-label="Удалить запись"
        disabled={deleteDisabled}
        onClick={() => {
          if (deleteDisabled) return
          onDeleteEntry?.(entry.id, editingDateKey)
        }}
      >
        Удалить
      </button>
    </div>
  </form>
  )
}

export default EntryForm
