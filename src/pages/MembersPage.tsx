import { useState, useEffect, useCallback } from 'react';
import { supabase, DutyType, GroupMember } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  Users, Plus, Trash2, Shuffle, Calendar, Edit2, Check, X,
  Loader2, Copy, Wind, Key, Trash, Star, BookOpen, Shield
} from 'lucide-react';

const DUTY_ICONS = [
  { name: 'Wind', label: '掃除', component: Wind },
  { name: 'Key', label: '鍵', component: Key },
  { name: 'Trash', label: 'ゴミ', component: Trash },
  { name: 'BookOpen', label: '記録', component: BookOpen },
  { name: 'Shield', label: '守衛', component: Shield },
  { name: 'Star', label: 'その他', component: Star },
];

const DUTY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
  '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

function DutyIcon({ name, className }: { name: string; className?: string }) {
  const found = DUTY_ICONS.find(i => i.name === name);
  const Comp = found?.component ?? Star;
  return <Comp className={className} />;
}

export default function MembersPage() {
  const { currentGroup, currentMember } = useAuth();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [dutyTypes, setDutyTypes] = useState<DutyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'members' | 'duties' | 'assign'>('members');
  const [copied, setCopied] = useState(false);

  const isAdmin = currentMember?.role === 'admin';

  const fetchData = useCallback(async () => {
    if (!currentGroup) return;
    setLoading(true);
    const [membersRes, dutiesRes] = await Promise.all([
      supabase.from('group_members').select('*').eq('group_id', currentGroup.id),
      supabase.from('duty_types').select('*').eq('group_id', currentGroup.id),
    ]);
    setMembers(membersRes.data ?? []);
    setDutyTypes(dutiesRes.data ?? []);
    setLoading(false);
  }, [currentGroup]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const copyInviteCode = () => {
    if (!currentGroup) return;
    navigator.clipboard.writeText(currentGroup.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-sky-500 animate-spin" /></div>;
  }

  return (
    <div>
      {/* Invite code */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-sky-600 font-medium">招待コード</p>
          <p className="text-2xl font-bold font-mono tracking-widest text-sky-800">{currentGroup?.invite_code}</p>
        </div>
        <button
          onClick={copyInviteCode}
          className="flex items-center gap-1.5 px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'コピー済' : 'コピー'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg bg-gray-100 p-0.5 mb-4">
        {[
          { id: 'members', label: 'メンバー', icon: <Users className="w-3.5 h-3.5" /> },
          { id: 'duties', label: '当番種類', icon: <Star className="w-3.5 h-3.5" /> },
          { id: 'assign', label: '割り当て', icon: <Calendar className="w-3.5 h-3.5" /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === t.id ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-500'}`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'members' && (
        <MembersTab members={members} isAdmin={isAdmin} groupId={currentGroup?.id ?? ''} onRefresh={fetchData} />
      )}
      {tab === 'duties' && (
        <DutiesTab dutyTypes={dutyTypes} isAdmin={isAdmin} groupId={currentGroup?.id ?? ''} onRefresh={fetchData} />
      )}
      {tab === 'assign' && (
        <AssignTab members={members} dutyTypes={dutyTypes} isAdmin={isAdmin} groupId={currentGroup?.id ?? ''} />
      )}
    </div>
  );
}

function MembersTab({ members, isAdmin, groupId, onRefresh }: { members: GroupMember[]; isAdmin: boolean; groupId: string; onRefresh: () => void }) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const saveName = async (memberId: string) => {
    await supabase.from('group_members').update({ display_name: editName }).eq('id', memberId);
    setEditingId(null);
    onRefresh();
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('このメンバーを削除しますか？')) return;
    await supabase.from('group_members').delete().eq('id', memberId);
    onRefresh();
  };

  return (
    <div className="space-y-2">
      {members.map(m => (
        <div key={m.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${m.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
            {m.display_name.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            {editingId === m.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="flex-1 px-2 py-1 border border-sky-300 rounded text-sm focus:outline-none"
                  autoFocus
                />
                <button onClick={() => saveName(m.id)} className="text-sky-600"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditingId(null)} className="text-gray-400"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 text-sm">{m.display_name || 'メンバー'}</span>
                {m.role === 'admin' && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">管理者</span>}
                {m.user_id === user?.id && <span className="text-xs bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded-full">あなた</span>}
              </div>
            )}
          </div>
          {isAdmin && editingId !== m.id && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setEditingId(m.id); setEditName(m.display_name); }}
                className="p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              {m.user_id !== user?.id && (
                <button
                  onClick={() => removeMember(m.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      ))}
      {members.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">メンバーがいません</div>
      )}
    </div>
  );
}

function DutiesTab({ dutyTypes, isAdmin, groupId, onRefresh }: { dutyTypes: DutyType[]; isAdmin: boolean; groupId: string; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(DUTY_COLORS[0]);
  const [icon, setIcon] = useState('Star');
  const [saving, setSaving] = useState(false);

  const createDuty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await supabase.from('duty_types').insert({ group_id: groupId, name: name.trim(), color, icon });
    setName(''); setColor(DUTY_COLORS[0]); setIcon('Star');
    setShowForm(false); setSaving(false);
    onRefresh();
  };

  const deleteDuty = async (id: string) => {
    if (!confirm('この当番種類を削除しますか？')) return;
    await supabase.from('duty_types').delete().eq('id', id);
    onRefresh();
  };

  return (
    <div>
      <div className="space-y-2 mb-4">
        {dutyTypes.map(dt => (
          <div key={dt.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: dt.color + '20' }}>
              <DutyIcon name={dt.icon} className="w-5 h-5" style={{ color: dt.color } as any} />
            </div>
            <span className="flex-1 font-medium text-gray-900 text-sm">{dt.name}</span>
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: dt.color }} />
            {isAdmin && (
              <button onClick={() => deleteDuty(dt.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        {dutyTypes.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">当番の種類がまだありません</div>
        )}
      </div>

      {isAdmin && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-2.5 border-2 border-dashed border-gray-200 hover:border-sky-400 text-gray-400 hover:text-sky-600 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />当番を追加
        </button>
      )}

      {isAdmin && showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <form onSubmit={createDuty} className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="当番名（例：掃除当番）"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
              required
              autoFocus
            />
            <div>
              <p className="text-xs text-gray-500 mb-1.5">アイコン</p>
              <div className="flex gap-2 flex-wrap">
                {DUTY_ICONS.map(ic => (
                  <button
                    key={ic.name}
                    type="button"
                    onClick={() => setIcon(ic.name)}
                    className={`p-2 rounded-lg border-2 transition-all ${icon === ic.name ? 'border-sky-500 bg-sky-50' : 'border-gray-200 hover:border-gray-300'}`}
                    title={ic.label}
                  >
                    <ic.component className="w-5 h-5 text-gray-600" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1.5">色</p>
              <div className="flex gap-2 flex-wrap">
                {DUTY_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" />追加</>}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function AssignTab({ members, dutyTypes, isAdmin, groupId }: { members: GroupMember[]; dutyTypes: DutyType[]; isAdmin: boolean; groupId: string }) {
  const [selectedDuty, setSelectedDuty] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'once'>('once');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const autoAssign = async () => {
    if (!selectedDuty || !startDate || !endDate) {
      setError('当番種類・開始日・終了日を選択してください');
      return;
    }
    if (members.length === 0) { setError('メンバーがいません'); return; }
    setSaving(true); setError(''); setSuccess('');

    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates: string[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + (frequency === 'daily' ? 1 : frequency === 'weekly' ? 7 : 999))) {
      dates.push(d.toISOString().split('T')[0]);
      if (frequency === 'once') break;
    }

    const shuffled = [...members].sort(() => Math.random() - 0.5);
    const inserts = dates.map((date, i) => ({
      group_id: groupId,
      duty_type_id: selectedDuty,
      assigned_user_id: shuffled[i % shuffled.length].user_id,
      scheduled_date: date,
    }));

    const { error: insertErr } = await supabase.from('duty_schedules').insert(inserts);
    if (insertErr) setError('割り当てに失敗しました');
    else setSuccess(`${inserts.length}件の当番を自動割り当てしました`);
    setSaving(false);
  };

  const manualAssign = async () => {
    if (!selectedDuty || !selectedMember || !startDate) {
      setError('当番・メンバー・日付をすべて選択してください');
      return;
    }
    setSaving(true); setError(''); setSuccess('');
    const { error: insertErr } = await supabase.from('duty_schedules').insert({
      group_id: groupId,
      duty_type_id: selectedDuty,
      assigned_user_id: selectedMember,
      scheduled_date: startDate,
    });
    if (insertErr) setError('割り当てに失敗しました');
    else setSuccess('当番を割り当てました');
    setSaving(false);
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Shield className="w-10 h-10 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">管理者のみ割り当てができます</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
      {success && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>}

      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 text-sm">当番種類</h3>
        <select
          value={selectedDuty}
          onChange={e => setSelectedDuty(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">選択してください</option>
          {dutyTypes.map(dt => <option key={dt.id} value={dt.id}>{dt.name}</option>)}
        </select>

        <h3 className="font-semibold text-gray-900 text-sm pt-1">頻度</h3>
        <div className="flex gap-2">
          {[{ v: 'once', l: '一回限り' }, { v: 'daily', l: '毎日' }, { v: 'weekly', l: '毎週' }].map(f => (
            <button
              key={f.v}
              onClick={() => setFrequency(f.v as any)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${frequency === f.v ? 'bg-sky-500 text-white border-sky-500' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              {f.l}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 block mb-1">{frequency === 'once' ? '日付' : '開始日'}</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
          </div>
          {frequency !== 'once' && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">終了日</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Shuffle className="w-4 h-4 text-sky-600" />
          <h3 className="font-semibold text-gray-900 text-sm">自動割り当て（ランダム）</h3>
        </div>
        <p className="text-xs text-gray-500">全メンバーにランダムで自動割り当てします</p>
        <button
          onClick={autoAssign}
          disabled={saving}
          className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Shuffle className="w-4 h-4" />ランダム自動割り当て</>}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-4 h-4 text-gray-600" />
          <h3 className="font-semibold text-gray-900 text-sm">手動割り当て</h3>
        </div>
        <select
          value={selectedMember}
          onChange={e => setSelectedMember(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">メンバーを選択</option>
          {members.map(m => <option key={m.id} value={m.user_id}>{m.display_name}</option>)}
        </select>
        <button
          onClick={manualAssign}
          disabled={saving}
          className="w-full py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" />割り当てる</>}
        </button>
      </div>
    </div>
  );
}
