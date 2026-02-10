import DayPanel from '../components/DayPanel'
import EntryForm from '../components/EntryForm'
import SimplePeopleList from '../components/SimplePeopleList'
import WeekendBlock from '../components/WeekendBlock'
import {
  formatWeekdayWithDate,
  formatWeekdayAndDate,
  localizeWeekday,
  parseDateFromKey,
  formatShortDate,
} from '../utils/date'

const UserInterface = ({
  previousWorkday,
  previousWorkdayKey,
  nextWorkday,
  nextWorkdayKey,
  calendarStructure,
  today,
  todayKey,
  weekOffset,
  todayPeople,
  previousWorkdayPeople,
  nextWorkdayPeople,
  bottomEntries,
  visitGoals,
  resultReasons,
  resultReasonsLoading,
  form,
  setForm,
  isFormActive,
  isSubmitDisabled,
  isBottomLoading,
  nameInputRef,
  dateInputRef,
  editingEntry,
  allResponsibles,
  canEditEntry,
  canDelete,
  canMarkCompleted,
  canUnmarkCompleted,
  canMarkCancelled,
  canUnmarkCancelled,
  canMarkPass,
  canRevokePass,
  canMove,
  canSetMeetingResult,
  canChangeMeetingResult,
  canRollbackMeetingResult,
  handleDragStart,
  handleDrop,
  handleDoubleClick,
  handleSingleClick,
  handleEmptyRowDoubleClick,
  handleWeekendEmptyRowDoubleClick,
  handleExitEdit,
  handleToggleCompleted,
  handleToggleCancelled,
  handleOrderPass,
  handleRevokePass,
  handleDeleteEntry,
  handleRollbackMeetingResult,
  handleSubmit,
  goToPreviousWeek,
  goToNextWeek,
  resetWeekOffset,
  interfaceType,
  isAdmin,
}) => {
  const parsedWeekOffset = Number(weekOffset)
  const currentWeekOffset = Number.isFinite(parsedWeekOffset) ? parsedWeekOffset : 0

  return (
    <div className="app__layout">
    <div className="app__top-row">
      {previousWorkday && previousWorkdayKey && (
        <DayPanel
          title="Предыдущий рабочий день"
          titleAs="div"
          titleTextClassName="text text--bold"
          dateTextClassName="text text--muted"
          peopleTypographyVariant="base"
          dateLabel={(() => {
            const item = calendarStructure.find(item => item.date === previousWorkdayKey)
            return item?.weekday
              ? formatWeekdayAndDate(item.weekday, previousWorkdayKey)
              : formatWeekdayWithDate(previousWorkday)
          })()}
          people={previousWorkdayPeople}
          visitGoals={visitGoals}
          showVisitGoals
          dateKey={previousWorkdayKey}
          activeEntryId={form.editingEntryId}
          isFormActive={isFormActive}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onDoubleClick={handleDoubleClick}
          onSingleClick={handleSingleClick}
          onEmptyRowDoubleClick={handleEmptyRowDoubleClick}
          onToggleCompleted={handleToggleCompleted}
          onToggleCancelled={handleToggleCancelled}
          onOrderPass={handleOrderPass}
          onRevokePass={handleRevokePass}
          onDeleteEntry={handleDeleteEntry}
          canDelete={canDelete}
          canMarkCompleted={canMarkCompleted}
          canUnmarkCompleted={canUnmarkCompleted}
          canMarkCancelled={canMarkCancelled}
          canUnmarkCancelled={canUnmarkCancelled}
          canMarkPass={canMarkPass}
          canRevokePass={canRevokePass}
          canMove={canMove}
        />
      )}

      <DayPanel
        title="Сегодня"
        titleAs="div"
        titleTextClassName="text text--bold"
        dateTextClassName="text text--muted"
        peopleTypographyVariant="base"
        dateLabel={formatWeekdayWithDate(today)}
        people={todayPeople}
        visitGoals={visitGoals}
        showVisitGoals
        dateKey={todayKey}
        activeEntryId={form.editingEntryId}
        isFormActive={isFormActive}
        onDragStart={handleDragStart}
        onDrop={handleDrop}
        onDoubleClick={handleDoubleClick}
        onSingleClick={handleSingleClick}
        onEmptyRowDoubleClick={handleEmptyRowDoubleClick}
        onToggleCompleted={handleToggleCompleted}
        onToggleCancelled={handleToggleCancelled}
        onOrderPass={handleOrderPass}
        onRevokePass={handleRevokePass}
        onDeleteEntry={handleDeleteEntry}
        canDelete={canDelete}
        canMarkCompleted={canMarkCompleted}
        canUnmarkCompleted={canUnmarkCompleted}
        canMarkCancelled={canMarkCancelled}
        canUnmarkCancelled={canUnmarkCancelled}
        canMarkPass={canMarkPass}
        canRevokePass={canRevokePass}
        canMove={canMove}
      />

      {nextWorkday && nextWorkdayKey && (
        <DayPanel
          title="Следующий рабочий день"
          titleAs="div"
          titleTextClassName="text text--bold"
          dateTextClassName="text text--muted"
          peopleTypographyVariant="base"
          dateLabel={(() => {
            const item = calendarStructure.find(item => item.date === nextWorkdayKey)
            return item?.weekday
              ? formatWeekdayAndDate(item.weekday, nextWorkdayKey)
              : formatWeekdayWithDate(nextWorkday)
          })()}
          people={nextWorkdayPeople}
          visitGoals={visitGoals}
          showVisitGoals
          dateKey={nextWorkdayKey}
          activeEntryId={form.editingEntryId}
          isFormActive={isFormActive}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onDoubleClick={handleDoubleClick}
          onSingleClick={handleSingleClick}
          onEmptyRowDoubleClick={handleEmptyRowDoubleClick}
          onToggleCompleted={handleToggleCompleted}
          onToggleCancelled={handleToggleCancelled}
          onOrderPass={handleOrderPass}
          onRevokePass={handleRevokePass}
          onDeleteEntry={handleDeleteEntry}
          canDelete={canDelete}
          canMarkCompleted={canMarkCompleted}
          canUnmarkCompleted={canUnmarkCompleted}
          canMarkCancelled={canMarkCancelled}
          canUnmarkCancelled={canUnmarkCancelled}
          canMarkPass={canMarkPass}
          canRevokePass={canRevokePass}
          canMove={canMove}
        />
      )}

      <section className={`panel${!isFormActive ? ' panel--inactive' : ''}`}>
        <header className="panel__header text">
          <div className="text text--bold">
            {form.editingEntryId ? (isFormActive ? 'Редактирование записи' : 'Просмотр записи') : 'Новая запись'}
          </div>
        </header>
        <EntryForm
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          isSubmitDisabled={isSubmitDisabled}
          nameInputRef={nameInputRef}
          dateInputRef={dateInputRef}
          today={today}
          todayKey={todayKey}
          isEditing={Boolean(form.editingEntryId)}
          editingEntry={editingEntry}
          allResponsibles={allResponsibles}
          canEditEntry={canEditEntry}
          canMarkPass={canMarkPass}
          canRevokePass={canRevokePass}
          canUnmarkCancelled={canUnmarkCancelled}
          canUnmarkCompleted={canUnmarkCompleted}
          canDeleteEntry={canDelete}
          visitGoals={visitGoals}
          resultReasons={resultReasons}
          resultReasonsLoading={resultReasonsLoading}
          canSetMeetingResult={canSetMeetingResult}
          canChangeMeetingResult={canChangeMeetingResult}
          canRollbackMeetingResult={canRollbackMeetingResult}
          isAdmin={isAdmin}
          labelTextClassName="text text--muted"
          interfaceType={interfaceType}
          isFormActive={isFormActive}
          onOrderPass={handleOrderPass}
          onRevokePass={handleRevokePass}
          onToggleCancelled={handleToggleCancelled}
          onToggleCompleted={handleToggleCompleted}
          onDeleteEntry={handleDeleteEntry}
          onRollbackMeetingResult={handleRollbackMeetingResult}
          onExitEdit={handleExitEdit}
        />
      </section>
    </div>

    <div className={`app__bottom-row${isBottomLoading ? ' app__bottom-row--loading' : ''}`}>
      {(() => {
        const saturdayItem = calendarStructure.find(item => item.weekday === 'Saturday')
        const sundayItem = calendarStructure.find(item => item.weekday === 'Sunday')
        const weekendRendered = saturdayItem && sundayItem

        const bottomRowItems = []
        calendarStructure.forEach((item, index) => {
          if (item.weekday === 'Saturday' || item.weekday === 'Sunday') {
            if (item.weekday === 'Saturday' && weekendRendered) {
              bottomRowItems.push(
                <div className="weekend-stack" key={`weekend-stack-${index}`}>
                  <section className="panel panel--compact">
                    <header className="panel__header text">
                      <div className="text">Суббота</div>
                    </header>
                    <div className="panel__content text">
                      <SimplePeopleList
                        people={bottomEntries[saturdayItem.date] ?? []}
                        compact
                        dateKey={saturdayItem.date}
                        itemVariant="simple"
                        onDragStart={handleDragStart}
                        onDrop={handleDrop}
                        onDoubleClick={(entry) => handleDoubleClick?.(entry, saturdayItem.date)}
                        onSingleClick={(entry) => handleSingleClick?.(entry, saturdayItem.date)}
                        onEmptyRowDoubleClick={handleWeekendEmptyRowDoubleClick}
                        onToggleCompleted={handleToggleCompleted}
                        onToggleCancelled={handleToggleCancelled}
                        onOrderPass={handleOrderPass}
                        onRevokePass={handleRevokePass}
                        onDeleteEntry={handleDeleteEntry}
                        canDelete={canDelete}
                        canMarkCompleted={canMarkCompleted}
                        canUnmarkCompleted={canUnmarkCompleted}
                        canMarkCancelled={canMarkCancelled}
                        canUnmarkCancelled={canUnmarkCancelled}
                        canMarkPass={canMarkPass}
                        canRevokePass={canRevokePass}
                        canMove={canMove}
                        typographyVariant="base-light"
                      />
                    </div>
                  </section>

                  <section className="panel panel--compact">
                    <header className="panel__header text">
                      <div className="text">Воскресенье</div>
                    </header>
                    <div className="panel__content text">
                      <SimplePeopleList
                        people={bottomEntries[sundayItem.date] ?? []}
                        compact
                        dateKey={sundayItem.date}
                        itemVariant="simple"
                        onDragStart={handleDragStart}
                        onDrop={handleDrop}
                        onDoubleClick={(entry) => handleDoubleClick?.(entry, sundayItem.date)}
                        onSingleClick={(entry) => handleSingleClick?.(entry, sundayItem.date)}
                        onEmptyRowDoubleClick={handleWeekendEmptyRowDoubleClick}
                        onToggleCompleted={handleToggleCompleted}
                        onToggleCancelled={handleToggleCancelled}
                        onOrderPass={handleOrderPass}
                        onRevokePass={handleRevokePass}
                        onDeleteEntry={handleDeleteEntry}
                        canDelete={canDelete}
                        canMarkCompleted={canMarkCompleted}
                        canUnmarkCompleted={canUnmarkCompleted}
                        canMarkCancelled={canMarkCancelled}
                        canUnmarkCancelled={canUnmarkCancelled}
                        canMarkPass={canMarkPass}
                        canRevokePass={canRevokePass}
                        canMove={canMove}
                        typographyVariant="base-light"
                      />
                    </div>
                    <div className={`week-nav week-nav--embedded${isBottomLoading ? ' week-nav--loading' : ''}`}>
                      <span className="week-nav__label">Неделя:</span>
                      <button
                        type="button"
                        className="week-nav__control week-nav__arrow"
                        onClick={goToPreviousWeek}
                        disabled={isBottomLoading}
                        aria-label="Предыдущая неделя"
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        className={`week-nav__control week-nav__center${currentWeekOffset === 0 ? ' week-nav__center--current' : ' week-nav__center--offset'}`}
                        onClick={resetWeekOffset}
                        disabled={isBottomLoading || currentWeekOffset === 0}
                        title={currentWeekOffset === 0 ? 'Текущая неделя' : 'Вернуться к текущей неделе'}
                      >
                        {currentWeekOffset === 0
                          ? 'Тек.'
                          : (currentWeekOffset > 0 ? `+${currentWeekOffset}` : `${currentWeekOffset}`)}
                      </button>
                      <button
                        type="button"
                        className="week-nav__control week-nav__arrow"
                        onClick={goToNextWeek}
                        disabled={isBottomLoading}
                        aria-label="Следующая неделя"
                      >
                        ▶
                      </button>
                    </div>
                  </section>
                </div>
              )
            }
            return
          }

          bottomRowItems.push(
            <DayPanel
              key={item.date}
              title={localizeWeekday(item.weekday)}
              dateLabel={formatShortDate(parseDateFromKey(item.date))}
              titleAs="div"
              titleTextClassName="text"
              dateTextClassName="text text--thin text--muted"
              peopleVariant="simple"
              people={bottomEntries[item.date] ?? []}
              dateKey={item.date}
              compact
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onDoubleClick={handleDoubleClick}
              onSingleClick={handleSingleClick}
              onEmptyRowDoubleClick={handleEmptyRowDoubleClick}
              onToggleCompleted={handleToggleCompleted}
              onToggleCancelled={handleToggleCancelled}
              onOrderPass={handleOrderPass}
              onRevokePass={handleRevokePass}
              onDeleteEntry={handleDeleteEntry}
              canDelete={canDelete}
              canMarkCompleted={canMarkCompleted}
              canUnmarkCompleted={canUnmarkCompleted}
              canMarkCancelled={canMarkCancelled}
              canUnmarkCancelled={canUnmarkCancelled}
              canMarkPass={canMarkPass}
              canRevokePass={canRevokePass}
              canMove={canMove}
              peopleTypographyVariant="base-light"
              isAdmin={isAdmin}
            />
          )
        })
        return bottomRowItems
      })()}
    </div>
    </div>
  )
}

export default UserInterface
