import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, Eye, EyeOff, Calendar } from 'lucide-react';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
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
      if (mode === 'login') {
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
        }
      } else {
        if (!userId.trim() || !displayName.trim()) {
          setError('ユーザーID と表示名を入力してください');
          setLoading(false);
          return;
        }

        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingUser) {
          setError('このユーザーIDはすでに使用されています');
          setLoading(false);
          return;
        }

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
          const { error: insertError } = await supabase.from('users').insert({
            user_id: userId,
            auth_user_id: authData.user.id,
            display_name: displayName,
            email,
          });

          if (insertError) throw insertError;
          setSuccess('アカウントを作成しました。ログインしてください。');
          setMode('login');
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
          <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'login' ? 'bg-white text-sky-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}
            >
              ログイン
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'register' ? 'bg-white text-sky-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}
            >
              新規登録
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
            {mode === 'register' && (
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
                <p className="text-xs text-gray-500 mt-1">ログイン時に使用します（英数字、アンダースコア、ハイフン可）</p>
              </div>
            )}
            {mode === 'register' && (
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
            )}
            {mode === 'login' && (
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
            )}
            {mode === 'register' && (
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
            )}
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <><LogIn className="w-4 h-4" />ログイン</>
              ) : (
                <><UserPlus className="w-4 h-4" />アカウント作成</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
