import DayPanel from '../components/DayPanel'
import OperatorMobileView from '../components/OperatorMobileView'
import { formatWeekdayWithDate } from '../utils/date'

const DutyOfficerInterface = ({
  isMobile,
  today,
  todayKey,
  todayPeople,
  visitGoals,
  reasonsByState,
  handleToggleArrived,
  canMarkArrived,
  canUnmarkArrived,
  logout,
  handleDragStart,
  handleDrop,
  handleDoubleClick,
  handleEmptyRowDoubleClick,
  handleToggleCancelled,
  handleSetEntryState,
  handleOrderPass,
  handleRevokePass,
  handleRollbackMeetingResult,
  handleDeleteEntry,
  canDelete,
  canMarkCancelled,
  canUnmarkCancelled,
  canMarkPass,
  canRevokePass,
  canRollbackMeetingResult,
  canMove,
  canSetMeetingResult,
  canChangeMeetingResult,
}) => (
  <div className="app__layout">
    {isMobile ? (
      <OperatorMobileView
        title="Сегодня"
        dateLabel={formatWeekdayWithDate(today)}
        people={todayPeople}
        visitGoals={visitGoals}
        dateKey={todayKey}
        onToggleArrived={handleToggleArrived}
        canMarkArrived={canMarkArrived}
        canUnmarkArrived={canUnmarkArrived}
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
          onToggleArrived={handleToggleArrived}
          onToggleCancelled={handleToggleCancelled}
          onSetEntryState={handleSetEntryState}
          onOrderPass={handleOrderPass}
          onRevokePass={handleRevokePass}
          onRollbackMeetingResult={handleRollbackMeetingResult}
          onDeleteEntry={handleDeleteEntry}
          canDelete={canDelete}
          canMarkArrived={canMarkArrived}
          canUnmarkArrived={canUnmarkArrived}
          canMarkCancelled={canMarkCancelled}
          canUnmarkCancelled={canUnmarkCancelled}
          canSetMeetingResult={canSetMeetingResult}
          canChangeMeetingResult={canChangeMeetingResult}
          canMarkPass={canMarkPass}
          canRevokePass={canRevokePass}
          canRollbackMeetingResult={canRollbackMeetingResult}
          canMove={canMove}
          reasonsByState={reasonsByState}
        />
      </div>
    )}
  </div>
)

export default DutyOfficerInterface
