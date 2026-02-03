import DayPanel from '../components/DayPanel'
import OperatorMobileView from '../components/OperatorMobileView'
import { formatWeekdayWithDate } from '../utils/date'

const DutyOfficerInterface = ({
  isMobile,
  today,
  todayKey,
  todayPeople,
  visitGoals,
  handleToggleCompleted,
  canMarkCompleted,
  canUnmarkCompleted,
  logout,
  handleDragStart,
  handleDrop,
  handleDoubleClick,
  handleEmptyRowDoubleClick,
  handleToggleCancelled,
  handleOrderPass,
  handleRevokePass,
  handleDeleteEntry,
  canDelete,
  canMarkCancelled,
  canUnmarkCancelled,
  canMarkPass,
  canRevokePass,
  canMove,
}) => (
  <div className="app__layout">
    {isMobile ? (
      <OperatorMobileView
        title="Сегодня"
        dateLabel={formatWeekdayWithDate(today)}
        people={todayPeople}
        visitGoals={visitGoals}
        dateKey={todayKey}
        onToggleCompleted={handleToggleCompleted}
        canMarkCompleted={canMarkCompleted}
        canUnmarkCompleted={canUnmarkCompleted}
        onLogout={logout}
      />
    ) : (
      <div className="app__top-row">
        <DayPanel
          title="Сегодня"
          dateLabel={formatWeekdayWithDate(today)}
          people={todayPeople}
          visitGoals={visitGoals}
          showVisitGoals
          dateKey={todayKey}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onDoubleClick={handleDoubleClick}
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
      </div>
    )}
  </div>
)

export default DutyOfficerInterface
