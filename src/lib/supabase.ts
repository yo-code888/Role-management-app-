import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Group = {
  id: string;
  name: string;
  description: string;
  created_by: string | null;
  invite_code: string;
  created_at: string;
  updated_at: string;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  display_name: string;
  joined_at: string;
};

export type DutyType = {
  id: string;
  group_id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
};

export type DutySchedule = {
  id: string;
  group_id: string;
  duty_type_id: string;
  assigned_user_id: string;
  scheduled_date: string;
  is_completed: boolean;
  note: string;
  created_at: string;
  updated_at: string;
};

export type DutyScheduleWithDetails = DutySchedule & {
  duty_type: DutyType;
  member: GroupMember;
};
