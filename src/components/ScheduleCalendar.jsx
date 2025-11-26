import { useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const toLocalISO = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const year = copy.getFullYear();
  const month = String(copy.getMonth() + 1).padStart(2, '0');
  const day = String(copy.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function ScheduleCalendar({ schedule = [], onDateSelect }) {
  const taskMap = useMemo(() => {
    const map = new Map();
    schedule.forEach((day) => {
      if (day?.date) {
        map.set(day.date, day.tasks || []);
      }
    });
    return map;
  }, [schedule]);

  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return undefined;
    const iso = toLocalISO(date);
    return taskMap.has(iso) ? 'has-study-task' : undefined;
  };

  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const iso = toLocalISO(date);
    const tasksForDay = taskMap.get(iso);
    if (!tasksForDay || tasksForDay.length === 0) return null;
    return (
      <span className="mt-1 text-[10px] font-semibold text-primary">{tasksForDay.length}</span>
    );
  };

  const handleDayClick = (value) => {
    const iso = toLocalISO(value);
    onDateSelect?.(iso, taskMap.get(iso) || []);
  };

  return (
    <Card className="study-calendar">
      <CardHeader>
        <CardTitle>Calendar View</CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar
          onClickDay={handleDayClick}
          tileClassName={tileClassName}
          tileContent={tileContent}
          minDetail="month"
          next2Label={null}
          prev2Label={null}
          showNeighboringMonth={false}
        />
      </CardContent>
    </Card>
  );
}

export default ScheduleCalendar;
