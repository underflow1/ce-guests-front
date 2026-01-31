import PeopleList from './PeopleList'

const DayPanel = ({
  title,
  dateLabel,
  titleAs: TitleTag = 'h2',
  titleTextClassName,
  dateTextClassName,
  peopleTypographyVariant,
  people,
  dateKey,
  compact = false,
  onDragStart,
  onDrop,
  onDoubleClick,
  onEmptyRowDoubleClick,
  onToggleCompleted,
  onToggleCancelled,
  onOrderPass,
  onRevokePass,
  onDeleteEntry,
  canDelete = false,
  canMarkCompleted = false,
  canUnmarkCompleted = false,
  canMarkCancelled = false,
  canUnmarkCancelled = false,
  canMarkPass = false,
  canRevokePass = false,
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
        dateKey={dateKey}
        compact={compact}
        typographyVariant={peopleTypographyVariant}
        onDragStart={onDragStart}
        onDrop={onDrop}
        onDoubleClick={onDoubleClick}
        onEmptyRowDoubleClick={onEmptyRowDoubleClick}
        onToggleCompleted={onToggleCompleted}
        onToggleCancelled={onToggleCancelled}
        onOrderPass={onOrderPass}
        onRevokePass={onRevokePass}
        onDeleteEntry={onDeleteEntry}
        canDelete={canDelete}
        canMarkCompleted={canMarkCompleted}
        canUnmarkCompleted={canUnmarkCompleted}
        canMarkCancelled={canMarkCancelled}
        canUnmarkCancelled={canUnmarkCancelled}
        canMarkPass={canMarkPass}
        canRevokePass={canRevokePass}
        canMove={canMove}
      />
    </div>
  </section>
)

export default DayPanel
