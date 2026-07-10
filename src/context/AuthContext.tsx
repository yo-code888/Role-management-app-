import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, Group, GroupMember } from '../lib/supabase';

export interface CustomUser {
  user_id: string;
  auth_user_id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

type AuthContextType = {
  session: Session | null;
  user: User | null;
  customUser: CustomUser | null;
  loading: boolean;
  currentGroup: Group | null;
  currentMember: GroupMember | null;
  setCurrentGroup: (group: Group | null) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  customUser: null,
  loading: true,
  currentGroup: null,
  currentMember: null,
  setCurrentGroup: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [customUser, setCustomUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentGroup, setCurrentGroupState] = useState<Group | null>(() => {
    const saved = localStorage.getItem('currentGroup');
    return saved ? JSON.parse(saved) : null;
  });
  const [currentMember, setCurrentMember] = useState<GroupMember | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // Don't clear group for guest users (they have teamCode but no session)
      const isGuest = !!localStorage.getItem('currentTeamCode');
      if (!session && !isGuest) {
        setCurrentGroupState(null);
        setCurrentMember(null);
        setCustomUser(null);
        localStorage.removeItem('currentGroup');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setCustomUser(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      setCustomUser(data);
    })();
  }, [user]);

  useEffect(() => {
    if (!currentGroup) {
      setCurrentMember(null);
      return;
    }
    (async () => {
      // Authenticated user: find member by user_id
      if (user) {
        const { data } = await supabase
          .from('group_members')
          .select('*')
          .eq('group_id', currentGroup.id)
          .eq('user_id', user.id)
          .maybeSingle();
        setCurrentMember(data);
        return;
      }
      // Guest user: find member by display_name from localStorage
      const displayName = localStorage.getItem('currentDisplayName');
      if (displayName) {
        const { data } = await supabase
          .from('group_members')
          .select('*')
          .eq('group_id', currentGroup.id)
          .eq('display_name', displayName)
          .maybeSingle();
        setCurrentMember(data);
      }
    })();
  }, [user, currentGroup]);

  const setCurrentGroup = (group: Group | null) => {
    setCurrentGroupState(group);
    if (group) {
      localStorage.setItem('currentGroup', JSON.stringify(group));
    } else {
      localStorage.removeItem('currentGroup');
    }
  };

  const signOut = async () => {
    localStorage.removeItem('currentTeamCode');
    localStorage.removeItem('currentDisplayName');
    localStorage.removeItem('currentGroup');
    setCurrentGroupState(null);
    setCurrentMember(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, customUser, loading, currentGroup, currentMember, setCurrentGroup, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
