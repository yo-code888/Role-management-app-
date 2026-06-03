import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import GroupSelectPage from './pages/GroupSelectPage';
import Layout from './components/Layout';
import CalendarPage from './pages/CalendarPage';
import MembersPage from './pages/MembersPage';
import MyPage from './pages/MyPage';
import { Loader2 } from 'lucide-react';

type Page = 'calendar' | 'members' | 'mypage';

function AppContent() {
  const { session, loading, currentGroup } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('mypage');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-teal-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  if (!session) return <AuthPage />;
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
