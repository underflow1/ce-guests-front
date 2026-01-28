import PeopleList from './PeopleList'

const DayPanel = ({
  title,
  dateLabel,
  titleAs: TitleTag = 'h2',
  people,
  dateKey,
  compact = false,
  onDragStart,
  onDrop,
  onDoubleClick,
  onEmptyRowDoubleClick,
  onToggleCompleted,
  onDeleteEntry,
  canDelete = false,
  canMarkCompleted = false,
  canUnmarkCompleted = false,
  canMove = false,
}) => (
  <section className={`panel ${compact ? 'panel--compact' : ''}`}>
    <header className="panel__header">
      <TitleTag className="panel__title">{title}</TitleTag>
      {dateLabel && <div className="panel__date">{dateLabel}</div>}
    </header>
    <div className="panel__content">
      <PeopleList
        people={people}
        dateKey={dateKey}
        compact={compact}
        onDragStart={onDragStart}
        onDrop={onDrop}
        onDoubleClick={onDoubleClick}
        onEmptyRowDoubleClick={onEmptyRowDoubleClick}
        onToggleCompleted={onToggleCompleted}
        onDeleteEntry={onDeleteEntry}
        canDelete={canDelete}
        canMarkCompleted={canMarkCompleted}
        canUnmarkCompleted={canUnmarkCompleted}
        canMove={canMove}
      />
    </div>
  </section>
)

export default DayPanel
