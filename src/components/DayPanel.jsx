import PeopleList from './PeopleList'

const DayPanel = ({
  title,
  dateLabel,
  titleAs: TitleTag = 'h2',
  titleTextClassName,
  dateTextClassName,
  peopleTypographyVariant,
  peopleVariant = 'full',
  people,
  visitGoals,
  showVisitGoals = false,
  dateKey,
  compact = false,
  activeEntryId,
  isFormActive,
  onDragStart,
  onDrop,
  onDoubleClick,
  onSingleClick,
  onEmptyRowDoubleClick,
  onToggleCompleted,
  onToggleCancelled,
  onOrderPass,
  onRevokePass,
  onRollbackMeetingResult,
  onDeleteEntry,
  canDelete = false,
  canMarkCompleted = false,
  canUnmarkCompleted = false,
  canMarkCancelled = false,
  canUnmarkCancelled = false,
  canMarkPass = false,
  canRevokePass = false,
  canRollbackMeetingResult = false,
  canMove = false,
}) => (
  <section className={`panel panel--day ${compact ? 'panel--compact' : ''}`}>
    <header className="panel__header">
      <TitleTag
        className={[
          'panel__title',
          titleTextClassName || 'text text--up text--bold',
        ].join(' ')}
      >
        {title}
      </TitleTag>
      {dateLabel && (
        <div className={['panel__date', dateTextClassName || 'text text--down text--muted'].join(' ')}>
          {dateLabel}
        </div>
      )}
    </header>
    <div className="panel__content text">
      <PeopleList
        people={people}
        visitGoals={visitGoals}
        showVisitGoals={showVisitGoals}
        dateKey={dateKey}
        compact={compact}
        typographyVariant={peopleTypographyVariant}
        itemVariant={peopleVariant}
        activeEntryId={activeEntryId}
        isFormActive={isFormActive}
        onDragStart={onDragStart}
        onDrop={onDrop}
        onDoubleClick={onDoubleClick}
        onSingleClick={onSingleClick}
        onEmptyRowDoubleClick={onEmptyRowDoubleClick}
        onToggleCompleted={onToggleCompleted}
        onToggleCancelled={onToggleCancelled}
        onOrderPass={onOrderPass}
        onRevokePass={onRevokePass}
        onRollbackMeetingResult={onRollbackMeetingResult}
        onDeleteEntry={onDeleteEntry}
        canDelete={canDelete}
        canMarkCompleted={canMarkCompleted}
        canUnmarkCompleted={canUnmarkCompleted}
        canMarkCancelled={canMarkCancelled}
        canUnmarkCancelled={canUnmarkCancelled}
        canMarkPass={canMarkPass}
        canRevokePass={canRevokePass}
        canRollbackMeetingResult={canRollbackMeetingResult}
        canMove={canMove}
      />
    </div>
  </section>
)

export default DayPanel
