import { useState, useEffect, useCallback } from 'react';
import { supabase, DutyType, DutySchedule, GroupMember } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Circle, Clock, CalendarDays, Award, Loader2, Bell } from 'lucide-react';

type EnrichedSchedule = DutySchedule & { duty_type: DutyType; member: GroupMember };

const DAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];

function formatDateJa(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}月${d.getDate()}日（${DAYS_JA[d.getDay()]}）`;
}

function daysDiff(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function MyPage() {
  const { user, currentGroup, currentMember, signOut } = useAuth();
  const [upcomingSchedules, setUpcomingSchedules] = useState<EnrichedSchedule[]>([]);
  const [recentSchedules, setRecentSchedules] = useState<EnrichedSchedule[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const myDisplayName = currentMember?.display_name || localStorage.getItem('currentDisplayName') || 'ユーザー';

  const fetchMySchedules = useCallback(async () => {
    if (!currentGroup) return;
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    // For guest users, find member by display_name; for auth users, by user_id
    const { data: myMember } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', currentGroup.id)
      .eq('display_name', myDisplayName)
      .maybeSingle();

    const memberId = myMember?.id;
    if (!memberId) {
      setLoading(false);
      return;
    }

    const [upcomingRes, recentRes] = await Promise.all([
      supabase
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
        .eq('assigned_user_id', memberId)
        .gte('scheduled_date', today)
        .order('scheduled_date', { ascending: true })
        .limit(10),
      supabase
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
        .eq('assigned_user_id', memberId)
        .lt('scheduled_date', today)
        .order('scheduled_date', { ascending: false })
        .limit(5),
    ]);

    const upcoming = (upcomingRes.data as EnrichedSchedule[]) ?? [];
    const recent = (recentRes.data as EnrichedSchedule[]) ?? [];
    setUpcomingSchedules(upcoming);
    setRecentSchedules(recent);
    setCompletedCount(recent.filter(s => s.is_completed).length);
    setLoading(false);
  }, [currentGroup, myDisplayName]);

  useEffect(() => { fetchMySchedules(); }, [fetchMySchedules]);

  const toggleComplete = async (schedule: EnrichedSchedule) => {
    const { error } = await supabase
      .from('duty_schedules')
      .update({ is_completed: !schedule.is_completed })
      .eq('id', schedule.id);
    if (!error) {
      setUpcomingSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, is_completed: !s.is_completed } : s));
      setRecentSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, is_completed: !s.is_completed } : s));
    }
  };

  const displayName = currentMember?.display_name || myDisplayName;
  const nextDuty = upcomingSchedules[0];
  const nextDiff = nextDuty ? daysDiff(nextDuty.scheduled_date) : null;

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-sky-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Profile card */}
      <div className="bg-gradient-to-br from-sky-500 to-teal-500 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
            {displayName.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">{displayName}</p>
            <p className="text-white/70 text-sm">{currentGroup?.name}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{upcomingSchedules.length}</p>
            <p className="text-white/70 text-xs mt-0.5">予定当番</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{completedCount}</p>
            <p className="text-white/70 text-xs mt-0.5">完了済み</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
            <Award className="w-6 h-6 mx-auto mb-0.5" />
            <p className="text-white/70 text-xs">がんばり中</p>
          </div>
        </div>
      </div>

      {/* Next duty - hero section */}
      {nextDuty ? (
        <div className={`rounded-2xl p-5 border-2 ${nextDiff === 0 ? 'bg-amber-50 border-amber-300' : nextDiff === 1 ? 'bg-orange-50 border-orange-300' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Bell className={`w-4 h-4 ${nextDiff === 0 ? 'text-amber-600' : nextDiff === 1 ? 'text-orange-500' : 'text-sky-500'}`} />
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">次の当番</p>
          </div>
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ backgroundColor: nextDuty.duty_type.color + '20' }}
            >
              <CalendarDays className="w-7 h-7" style={{ color: nextDuty.duty_type.color }} />
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold text-gray-900">{formatDateJa(nextDuty.scheduled_date)}</p>
              <p className="text-base font-semibold mt-0.5" style={{ color: nextDuty.duty_type.color }}>
                {nextDuty.duty_type.name}
              </p>
              <p className={`text-sm font-bold mt-1.5 ${nextDiff === 0 ? 'text-amber-600' : nextDiff === 1 ? 'text-orange-500' : 'text-gray-500'}`}>
                {nextDiff === 0 ? '今日！' : nextDiff === 1 ? '明日！' : `${nextDiff}日後`}
              </p>
            </div>
            <button onClick={() => toggleComplete(nextDuty)} className="flex-shrink-0">
              {nextDuty.is_completed
                ? <CheckCircle className="w-8 h-8 text-emerald-500" />
                : <Circle className="w-8 h-8 text-gray-300 hover:text-emerald-400 transition-colors" />
              }
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">予定されている当番はありません</p>
        </div>
      )}

      {/* Upcoming schedules */}
      {upcomingSchedules.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-500" />今後の当番
          </h3>
          <div className="space-y-2">
            {upcomingSchedules.slice(1).map(s => {
              const diff = daysDiff(s.scheduled_date);
              return (
                <div key={s.id} className={`bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3 ${s.is_completed ? 'opacity-60' : ''}`}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: s.duty_type.color + '20' }}>
                    <CalendarDays className="w-5 h-5" style={{ color: s.duty_type.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{formatDateJa(s.scheduled_date)}</p>
                    <p className="text-xs font-medium" style={{ color: s.duty_type.color }}>{s.duty_type.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">{diff === 0 ? '今日' : `${diff}日後`}</p>
                    <button onClick={() => toggleComplete(s)}>
                      {s.is_completed
                        ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                        : <Circle className="w-5 h-5 text-gray-300 hover:text-emerald-400 transition-colors" />
                      }
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent history */}
      {recentSchedules.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">過去の当番</h3>
          <div className="space-y-1.5">
            {recentSchedules.map(s => (
              <div key={s.id} className="bg-white rounded-lg border border-gray-100 p-2.5 flex items-center gap-3 opacity-70">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.duty_type.color }} />
                <span className="text-xs text-gray-600">{formatDateJa(s.scheduled_date)}</span>
                <span className="text-xs font-medium" style={{ color: s.duty_type.color }}>{s.duty_type.name}</span>
                <div className="ml-auto">
                  {s.is_completed
                    ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                    : <Circle className="w-4 h-4 text-gray-300" />
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
