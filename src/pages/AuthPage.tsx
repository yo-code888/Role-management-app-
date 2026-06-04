import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, Eye, EyeOff, Calendar, Lock } from 'lucide-react';

type Mode = 'team' | 'owner-login' | 'owner-register';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('team');
  const [teamCode, setTeamCode] = useState('');
  const [teamPassword, setTeamPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'team') {
        const code = teamCode.toUpperCase();

        // Try to find by invite_code first
        let { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('id, access_password')
          .eq('invite_code', code)
          .maybeSingle();

        // If not found, try access_code
        if (!groupData && !groupError) {
          const result = await supabase
            .from('groups')
            .select('id, access_password')
            .eq('access_code', code)
            .maybeSingle();
          groupData = result.data;
          groupError = result.error;
        }

        if (groupError) {
          console.error('Query error:', groupError);
          setError('チームコードが見つかりません');
          setLoading(false);
          return;
        }

        if (!groupData) {
          setError('チームコードが見つかりません');
          setLoading(false);
          return;
        }

        // Verify password
        if (groupData.access_password !== teamPassword) {
          setError('パスワードが正しくありません');
          setLoading(false);
          return;
        }

        // Add as guest member to group
        const { error: memberError } = await supabase
          .from('group_members')
          .upsert({
            group_id: groupData.id,
            user_id: null,
            display_name: displayName,
            role: 'member',
            joined_at: new Date().toISOString(),
          }, {
            onConflict: 'group_id,user_id'
          });

        if (memberError) {
          setError(memberError.message);
          setLoading(false);
          return;
        }

        // Store team info in localStorage and reload
        localStorage.setItem('currentTeamCode', teamCode.toUpperCase());
        localStorage.setItem('currentDisplayName', displayName);
        window.location.href = '/';
      } else if (mode === 'owner-login') {
        // Find user by user_id
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('user_id', userId)
          .maybeSingle();

        if (userError || !userData) {
          setError('ユーザーIDが見つかりません');
          setLoading(false);
          return;
        }

        // Sign in with email and password
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: userData.email,
          password,
        });

        if (authError) {
          setError(
            authError.message === 'Invalid login credentials'
              ? 'ユーザーIDまたはパスワードが正しくありません'
              : authError.message
          );
          setLoading(false);
          return;
        }
      } else {
        // owner-register mode
        if (!userId.trim() || !displayName.trim()) {
          setError('ユーザーID と表示名を入力してください');
          setLoading(false);
          return;
        }

        // Check if user_id already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existingUser) {
          setError('このユーザーIDはすでに使用されています');
          setLoading(false);
          return;
        }

        // Sign up
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          setError(
            signUpError.message === 'User already registered'
              ? 'このメールアドレスはすでに登録されています'
              : signUpError.message
          );
          setLoading(false);
          return;
        }

        if (authData.user) {
          // Create user record
          const { error: userError } = await supabase.from('users').insert({
            user_id: userId,
            auth_user_id: authData.user.id,
            display_name: displayName,
            email,
          });

          if (userError) throw userError;

          // Create initial group for owner with short access code
          const groupAccessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          const { data: newGroup, error: groupError } = await supabase
            .from('groups')
            .insert({
              name: `${displayName}のグループ`,
              created_by: authData.user.id,
              access_code: groupAccessCode,
              access_password: 'password',
            })
            .select()
            .single();

          if (groupError) throw groupError;

          // Add owner as admin member
          const { error: memberError } = await supabase.from('group_members').insert({
            group_id: newGroup.id,
            user_id: authData.user.id,
            display_name: displayName,
            role: 'admin',
          });

          if (memberError) throw memberError;

          setSuccess('アカウントを作成しました。ログインしてください。');
          setMode('owner-login');
          setUserId('');
          setEmail('');
          setPassword('');
          setDisplayName('');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-500 rounded-2xl mb-4 shadow-lg">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">当番管理</h1>
          <p className="text-gray-500 mt-1 text-sm">グループの当番をかんたん管理</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex rounded-xl bg-gray-100 p-1 mb-6 gap-1">
            <button
              onClick={() => { setMode('team'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${mode === 'team' ? 'bg-white text-sky-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Lock className="w-4 h-4 inline mr-1" />
              チーム参加
            </button>
            <button
              onClick={() => { setMode('owner-login'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${mode === 'owner-login' ? 'bg-white text-sky-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LogIn className="w-4 h-4 inline mr-1" />
              オーナーログイン
            </button>
            <button
              onClick={() => { setMode('owner-register'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${mode === 'owner-register' ? 'bg-white text-sky-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <UserPlus className="w-4 h-4 inline mr-1" />
              オーナー登録
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'team' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">チームコード</label>
                  <input
                    type="text"
                    value={teamCode}
                    onChange={e => setTeamCode(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent text-sm font-mono tracking-widest"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">チームパスワード</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={teamPassword}
                      onChange={e => setTeamPassword(e.target.value)}
                      placeholder="パスワード"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent text-sm pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">表示名</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="山田 太郎"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent text-sm"
                    required
                  />
                </div>
              </>
            )}

            {mode === 'owner-login' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ユーザーID</label>
                  <input
                    type="text"
                    value={userId}
                    onChange={e => setUserId(e.target.value.trim())}
                    placeholder="user123"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="パスワード"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent text-sm pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {mode === 'owner-register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ユーザーID</label>
                  <input
                    type="text"
                    value={userId}
                    onChange={e => setUserId(e.target.value.trim())}
                    placeholder="user123"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent text-sm"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">ログイン用ID</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">表示名</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="山田 太郎"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="6文字以上"
                      minLength={6}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent text-sm pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : mode === 'team' ? (
                <><LogIn className="w-4 h-4" />チームに参加</>
              ) : mode === 'owner-login' ? (
                <><LogIn className="w-4 h-4" />ログイン</>
              ) : (
                <><UserPlus className="w-4 h-4" />登録</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
