import { useState, useEffect, useCallback } from 'react';
import { supabase, DutyType, GroupMember, DutySchedule } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, CheckCircle, Circle, Calendar, List, Loader2 } from 'lucide-react';

type ViewMode = 'week' | 'month';

type EnrichedSchedule = DutySchedule & {
  duty_type: DutyType;
  member: GroupMember;
};

const DAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];
const MONTHS_JA = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CalendarPage() {
  const { currentGroup, user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<EnrichedSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    if (!currentGroup) return;
    setLoading(true);

    let startDate: Date, endDate: Date;
    if (viewMode === 'week') {
      const day = currentDate.getDay();
      startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - day);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else {
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    }

    const { data, error } = await supabase
      .from('duty_schedules')
      .select(`
        *,
        duty_type:duty_type_id (
          id, group_id, name, color, icon, created_at
        ),
        member:assigned_user_id (
          id, group_id, user_id, role, display_name, joined_at
        )
      `)
      .eq('group_id', currentGroup.id)
      .gte('scheduled_date', formatDate(startDate))
      .lte('scheduled_date', formatDate(endDate))
      .order('scheduled_date', { ascending: true });

    if (error) {
      console.error('Error fetching schedules:', error);
      setSchedules([]);
    } else {
      setSchedules((data as EnrichedSchedule[]) ?? []);
    }
    setLoading(false);
  }, [currentGroup, currentDate, viewMode]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const toggleComplete = async (schedule: EnrichedSchedule) => {
    const { error } = await supabase
      .from('duty_schedules')
      .update({ is_completed: !schedule.is_completed })
      .eq('id', schedule.id);
    if (!error) {
      setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, is_completed: !s.is_completed } : s));
    }
  };

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const getWeekDates = () => {
    const day = currentDate.getDay();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentDate);
      d.setDate(currentDate.getDate() - day + i);
      return d;
    });
  };

  const getMonthDates = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= lastDate; i++) days.push(new Date(year, month, i));
    return days;
  };

  const getSchedulesForDate = (date: Date) =>
    schedules.filter(s => s.scheduled_date === formatDate(date));

  const today = formatDate(new Date());

  const headerLabel = viewMode === 'week'
    ? (() => {
        const dates = getWeekDates();
        return `${dates[0].getMonth() + 1}/${dates[0].getDate()} - ${dates[6].getMonth() + 1}/${dates[6].getDate()}`;
      })()
    : `${currentDate.getFullYear()}年 ${MONTHS_JA[currentDate.getMonth()]}`;

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex rounded-lg bg-gray-100 p-0.5">
          <button
            onClick={() => setViewMode('week')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'week' ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-500'}`}
          >
            <List className="w-3.5 h-3.5" />週
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'month' ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-500'}`}
          >
            <Calendar className="w-3.5 h-3.5" />月
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-800 min-w-[130px] text-center">{headerLabel}</span>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
        </div>
      ) : viewMode === 'week' ? (
        <WeekView dates={getWeekDates()} getSchedules={getSchedulesForDate} today={today} onToggle={toggleComplete} userId={user?.id} />
      ) : (
        <MonthView dates={getMonthDates()} getSchedules={getSchedulesForDate} today={today} onToggle={toggleComplete} userId={user?.id} />
      )}
    </div>
  );
}

function ScheduleCard({ schedule, onToggle, userId }: { schedule: EnrichedSchedule; onToggle: (s: EnrichedSchedule) => void; userId?: string }) {
  const isMe = schedule.assigned_user_id === userId;
  return (
    <div
      className={`rounded-lg p-2 mb-1.5 flex items-start gap-2 transition-opacity ${schedule.is_completed ? 'opacity-60' : ''}`}
      style={{ backgroundColor: schedule.duty_type.color + '20', borderLeft: `3px solid ${schedule.duty_type.color}` }}
    >
      <button
        onClick={() => onToggle(schedule)}
        className="mt-0.5 flex-shrink-0"
        disabled={!isMe}
      >
        {schedule.is_completed
          ? <CheckCircle className="w-4 h-4" style={{ color: schedule.duty_type.color }} />
          : <Circle className="w-4 h-4 text-gray-300" />
        }
      </button>
      <div className="min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: schedule.duty_type.color }}>
          {schedule.duty_type.name}
        </p>
        <p className={`text-xs truncate ${isMe ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
          {isMe ? 'あなた' : schedule.member?.display_name || 'メンバー'}
        </p>
      </div>
    </div>
  );
}

function WeekView({ dates, getSchedules, today, onToggle, userId }: {
  dates: Date[];
  getSchedules: (d: Date) => EnrichedSchedule[];
  today: string;
  onToggle: (s: EnrichedSchedule) => void;
  userId?: string;
}) {
  return (
    <div className="space-y-2">
      {dates.map(date => {
        const dateStr = formatDate(date);
        const daySchedules = getSchedules(date);
        const isToday = dateStr === today;
        const isSat = date.getDay() === 6;
        const isSun = date.getDay() === 0;
        return (
          <div key={dateStr} className={`bg-white rounded-xl border transition-all ${isToday ? 'border-sky-400 shadow-md' : 'border-gray-100'}`}>
            <div className={`flex items-center gap-3 px-4 py-2.5 ${daySchedules.length > 0 ? 'border-b border-gray-50' : ''}`}>
              <div className={`w-9 h-9 rounded-full flex flex-col items-center justify-center flex-shrink-0 ${isToday ? 'bg-sky-500 text-white' : 'bg-gray-50'}`}>
                <span className={`text-xs leading-none ${isToday ? 'text-white' : isSun ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-gray-500'}`}>
                  {DAYS_JA[date.getDay()]}
                </span>
                <span className={`text-sm font-bold leading-none mt-0.5 ${isToday ? 'text-white' : 'text-gray-800'}`}>
                  {date.getDate()}
                </span>
              </div>
              {daySchedules.length === 0 && (
                <span className="text-xs text-gray-400">当番なし</span>
              )}
            </div>
            {daySchedules.length > 0 && (
              <div className="px-4 py-2">
                {daySchedules.map(s => (
                  <ScheduleCard key={s.id} schedule={s} onToggle={onToggle} userId={userId} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ dates, getSchedules, today, onToggle, userId }: {
  dates: (Date | null)[];
  getSchedules: (d: Date) => EnrichedSchedule[];
  today: string;
  onToggle: (s: EnrichedSchedule) => void;
  userId?: string;
}) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-3">
        <div className="grid grid-cols-7 bg-gray-50">
          {DAYS_JA.map((d, i) => (
            <div key={d} className={`text-center py-2 text-xs font-semibold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {dates.map((date, i) => {
            if (!date) return <div key={i} className="h-16 border-t border-gray-50" />;
            const dateStr = formatDate(date);
            const daySchedules = getSchedules(date);
            const isToday = dateStr === today;
            const isSat = date.getDay() === 6;
            const isSun = date.getDay() === 0;
            const isSelected = selectedDate && formatDate(selectedDate) === dateStr;
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : date)}
                className={`h-16 border-t border-gray-50 p-1 text-left transition-colors ${isSelected ? 'bg-sky-50' : 'hover:bg-gray-50'}`}
              >
                <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-semibold mb-1 ${isToday ? 'bg-sky-500 text-white' : isSun ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-gray-700'}`}>
                  {date.getDate()}
                </span>
                <div>
                  {daySchedules.slice(0, 2).map(s => (
                    <div
                      key={s.id}
                      className="text-xs truncate rounded px-0.5 mb-0.5 leading-4"
                      style={{ backgroundColor: s.duty_type.color + '30', color: s.duty_type.color }}
                    >
                      {s.duty_type.name}
                    </div>
                  ))}
                  {daySchedules.length > 2 && (
                    <div className="text-xs text-gray-400">+{daySchedules.length - 2}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="bg-white rounded-xl border border-sky-200 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日（{DAYS_JA[selectedDate.getDay()]}）の当番
          </p>
          {getSchedules(selectedDate).length === 0 ? (
            <p className="text-sm text-gray-400">この日の当番はありません</p>
          ) : (
            getSchedules(selectedDate).map(s => (
              <ScheduleCard key={s.id} schedule={s} onToggle={onToggle} userId={userId} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
