import { useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const formatISO = (date) => date.toISOString().split('T')[0];

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
    const iso = formatISO(date);
    return taskMap.has(iso) ? 'has-study-task' : undefined;
  };

  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const iso = formatISO(date);
    const tasksForDay = taskMap.get(iso);
    if (!tasksForDay || tasksForDay.length === 0) return null;
    return (
      <span className="mt-1 text-[10px] font-semibold text-primary">{tasksForDay.length}</span>
    );
  };

  const handleDayClick = (value) => {
    const iso = formatISO(value);
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
