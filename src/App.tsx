import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import GroupSelectPage from './pages/GroupSelectPage';
import Layout from './components/Layout';
import CalendarPage from './pages/CalendarPage';
import MembersPage from './pages/MembersPage';
import MyPage from './pages/MyPage';
import { Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';

type Page = 'calendar' | 'members' | 'mypage';

function AppContent() {
  const { session, loading, currentGroup, setCurrentGroup } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('mypage');
  const [checkingTeamCode, setCheckingTeamCode] = useState(false);

  useEffect(() => {
    const teamCode = localStorage.getItem('currentTeamCode');
    const displayName = localStorage.getItem('currentDisplayName');

    if (teamCode && displayName && !currentGroup && !session) {
      setCheckingTeamCode(true);
      (async () => {
        const { data } = await supabase
          .from('groups')
          .select('*')
          .eq('access_code', teamCode)
          .maybeSingle();

        if (data) {
          setCurrentGroup(data);
        } else {
          localStorage.removeItem('currentTeamCode');
          localStorage.removeItem('currentDisplayName');
        }
        setCheckingTeamCode(false);
      })();
    }
  }, []);

  if (loading || checkingTeamCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-teal-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  if (!session && !localStorage.getItem('currentTeamCode')) return <AuthPage />;
  if (!currentGroup) return <GroupSelectPage />;

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'calendar' && <CalendarPage />}
      {currentPage === 'members' && <MembersPage />}
      {currentPage === 'mypage' && <MyPage />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
