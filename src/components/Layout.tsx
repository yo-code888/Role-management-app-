import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Users, User, LogOut, ChevronDown, Settings } from 'lucide-react';
import { useState } from 'react';

type Page = 'calendar' | 'members' | 'mypage';

type LayoutProps = {
  children: ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
};

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, currentGroup, setCurrentGroup, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const navItems: { id: Page; label: string; icon: ReactNode }[] = [
    { id: 'calendar', label: 'カレンダー', icon: <Calendar className="w-5 h-5" /> },
    { id: 'members', label: 'メンバー', icon: <Users className="w-5 h-5" /> },
    { id: 'mypage', label: 'マイページ', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-sky-500 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-1 font-bold text-gray-900 hover:text-sky-600 transition-colors"
            >
              <span className="truncate max-w-[140px]">{currentGroup?.name ?? '当番管理'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 hidden sm:block">
              {(user?.user_metadata?.display_name as string) || user?.email}
            </span>
            {user && (
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors"
                title="設定"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={async () => { await signOut(); }}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="ログアウト"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showMenu && (
          <div className="absolute top-14 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-40">
            <div className="max-w-2xl mx-auto px-4 py-3">
              <button
                onClick={() => { setCurrentGroup(null); setShowMenu(false); }}
                className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                グループを変更
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-24">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="max-w-2xl mx-auto flex">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors ${
                currentPage === item.id
                  ? 'text-sky-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
              {currentPage === item.id && (
                <div className="absolute bottom-0 h-0.5 w-8 bg-sky-500 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Settings Modal */}
      {showSettings && currentGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900">グループ設定</h2>
              <p className="text-sm text-gray-500 mt-1">{currentGroup.name}</p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">チームコード</label>
                <div className="space-y-2">
                  {currentGroup.invite_code && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={currentGroup.invite_code}
                        readOnly
                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono tracking-widest"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(currentGroup.invite_code || '');
                        }}
                        className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        title="コピー"
                      >
                        📋
                      </button>
                    </div>
                  )}
                  {currentGroup.access_code && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={currentGroup.access_code}
                        readOnly
                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono tracking-widest"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(currentGroup.access_code);
                        }}
                        className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        title="コピー"
                      >
                        📋
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {user?.id === currentGroup.created_by && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">チームパスワード</label>
                  <p className="text-sm text-gray-600">{currentGroup.access_password}</p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 p-6">
              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 font-semibold rounded-lg transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
