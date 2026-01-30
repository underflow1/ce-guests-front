import SimplePeopleList from './SimplePeopleList'
import { formatWeekdayWithDate } from '../utils/date'

const WeekendBlock = ({
  saturday,
  sunday,
  saturdayPeople,
  sundayPeople,
  saturdayKey,
  sundayKey,
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
  <div className="weekend text">
    <div className="weekend__section">
      <div className="weekend__title text text--down text--muted">{formatWeekdayWithDate(saturday)}</div>
      <SimplePeopleList
        people={saturdayPeople}
        compact
        dateKey={saturdayKey}
        onDragStart={onDragStart}
        onDrop={onDrop}
        onDoubleClick={(entry) => onDoubleClick?.(entry, saturdayKey)}
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
    <div className="weekend__section">
      <div className="weekend__title text text--down text--muted">{formatWeekdayWithDate(sunday)}</div>
      <SimplePeopleList
        people={sundayPeople}
        compact
        dateKey={sundayKey}
        onDragStart={onDragStart}
        onDrop={onDrop}
        onDoubleClick={(entry) => onDoubleClick?.(entry, sundayKey)}
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
  </div>
)

export default WeekendBlock
