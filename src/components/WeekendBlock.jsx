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
  onDeleteEntry,
  canDelete = false,
  canMarkCompleted = false,
  canUnmarkCompleted = false,
  canMove = false,
}) => (
  <div className="weekend">
    <div className="weekend__section">
      <div className="weekend__title">{formatWeekdayWithDate(saturday)}</div>
      <SimplePeopleList
        people={saturdayPeople}
        compact
        dateKey={saturdayKey}
        onDragStart={onDragStart}
        onDrop={onDrop}
        onDoubleClick={(entry) => onDoubleClick?.(entry, saturdayKey)}
        onEmptyRowDoubleClick={onEmptyRowDoubleClick}
        onToggleCompleted={onToggleCompleted}
        onDeleteEntry={onDeleteEntry}
        canDelete={canDelete}
        canMarkCompleted={canMarkCompleted}
        canUnmarkCompleted={canUnmarkCompleted}
        canMove={canMove}
      />
    </div>
    <div className="weekend__section">
      <div className="weekend__title">{formatWeekdayWithDate(sunday)}</div>
      <SimplePeopleList
        people={sundayPeople}
        compact
        dateKey={sundayKey}
        onDragStart={onDragStart}
        onDrop={onDrop}
        onDoubleClick={(entry) => onDoubleClick?.(entry, sundayKey)}
        onEmptyRowDoubleClick={onEmptyRowDoubleClick}
        onToggleCompleted={onToggleCompleted}
        onDeleteEntry={onDeleteEntry}
        canDelete={canDelete}
        canMarkCompleted={canMarkCompleted}
        canUnmarkCompleted={canUnmarkCompleted}
        canMove={canMove}
      />
    </div>
  </div>
)

export default WeekendBlock
