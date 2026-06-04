import { useState, useEffect } from 'react';
import { supabase, Group } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';

export default function GroupSelectPage() {
  const { user, setCurrentGroup } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupPassword, setNewGroupPassword] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      setLoaded(true);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('group_members')
        .select('group_id, groups(*)')
        .eq('user_id', user.id);
      if (data) {
        setGroups(data.map((d: any) => d.groups).filter(Boolean));
      }
      setLoaded(true);
    })();
  }, [user]);

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError('');

    if (!newGroupPassword.trim()) {
      setError('パスワードを設定してください');
      setLoading(false);
      return;
    }

    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .insert({
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        created_by: user.id,
        access_password: newGroupPassword.trim()
      })
      .select()
      .single();
    if (groupErr || !group) {
      setError('グループの作成に失敗しました');
      setLoading(false);
      return;
    }
    const displayName = (user.user_metadata?.display_name as string) || user.email || 'ユーザー';
    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
      role: 'admin',
      display_name: displayName,
    });
    setCurrentGroup(group);
    setLoading(false);
  };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-teal-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-teal-50 p-4">
      <div className="max-w-lg mx-auto pt-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-sky-500 rounded-2xl mb-3 shadow-lg">
            <Users className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">グループを選択</h2>
          <p className="text-gray-500 text-sm mt-1">参加するグループを選んでください</p>
        </div>

        {groups.length > 0 && (
          <div className="space-y-2 mb-6">
            {groups.map(g => (
              <button
                key={g.id}
                onClick={() => setCurrentGroup(g)}
                className="w-full bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border border-gray-100 hover:border-sky-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-sky-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{g.name}</p>
                    {g.description && <p className="text-xs text-gray-500">{g.description}</p>}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-sky-500 transition-colors" />
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => { setShowCreate(true); setError(''); }}
            className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl p-4 flex flex-col items-center gap-2 transition-colors shadow"
          >
            <Plus className="w-6 h-6" />
            <span className="text-sm font-semibold">グループを作成</span>
          </button>
        </div>

        {showCreate && (
          <div className="mt-6 bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4">新しいグループを作成</h3>
            <form onSubmit={createGroup} className="space-y-3">
              <input
                type="text"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="グループ名（例：3年1組）"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
                required
              />
              <input
                type="text"
                value={newGroupDesc}
                onChange={e => setNewGroupDesc(e.target.value)}
                placeholder="説明（任意）"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">チームパスワード</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newGroupPassword}
                    onChange={e => setNewGroupPassword(e.target.value)}
                    placeholder="パスワードを設定"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '作成する'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
