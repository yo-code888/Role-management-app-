/*
  # 当番管理アプリ データベーススキーマ

  ## 概要
  グループ・部活・クラス向けの当番管理システム

  ## 新規テーブル

  1. `groups` - グループ管理（クラス・部活など）
  2. `group_members` - グループメンバーシップ管理
  3. `duty_types` - 当番の種類（掃除、鍵管理、ゴミ出しなど）
  4. `duty_schedules` - 当番スケジュール

  ## セキュリティ
  - 全テーブルでRLS有効化
  - グループメンバーのみデータアクセス可能
  - 管理者のみ設定変更可能
*/

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_code text UNIQUE NOT NULL DEFAULT upper(substring(gen_random_uuid()::text from 1 for 6)),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Group members table (created before policies that reference it)
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  display_name text NOT NULL DEFAULT '',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Duty types table
CREATE TABLE IF NOT EXISTS duty_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  icon text NOT NULL DEFAULT 'Star',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE duty_types ENABLE ROW LEVEL SECURITY;

-- Duty schedules table
CREATE TABLE IF NOT EXISTS duty_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  duty_type_id uuid REFERENCES duty_types(id) ON DELETE CASCADE NOT NULL,
  assigned_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scheduled_date date NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  note text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE duty_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups
CREATE POLICY "Group members can view their groups"
  ON groups FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Group admins can update groups"
  ON groups FOR UPDATE
  TO authenticated
  USING (id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for group_members
CREATE POLICY "Group members can view membership"
  ON group_members FOR SELECT
  TO authenticated
  USING (group_id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = auth.uid()));

CREATE POLICY "Users can join groups"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Group admins can manage members"
  ON group_members FOR UPDATE
  TO authenticated
  USING (group_id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = auth.uid() AND gm.role = 'admin'))
  WITH CHECK (group_id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = auth.uid() AND gm.role = 'admin'));

CREATE POLICY "Members can leave or admins can remove"
  ON group_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR group_id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = auth.uid() AND gm.role = 'admin')
  );

-- RLS Policies for duty_types
CREATE POLICY "Group members can view duty types"
  ON duty_types FOR SELECT
  TO authenticated
  USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));

CREATE POLICY "Group admins can create duty types"
  ON duty_types FOR INSERT
  TO authenticated
  WITH CHECK (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Group admins can update duty types"
  ON duty_types FOR UPDATE
  TO authenticated
  USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Group admins can delete duty types"
  ON duty_types FOR DELETE
  TO authenticated
  USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for duty_schedules
CREATE POLICY "Group members can view schedules"
  ON duty_schedules FOR SELECT
  TO authenticated
  USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));

CREATE POLICY "Group admins can create schedules"
  ON duty_schedules FOR INSERT
  TO authenticated
  WITH CHECK (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins or assigned user can update schedules"
  ON duty_schedules FOR UPDATE
  TO authenticated
  USING (
    assigned_user_id = auth.uid()
    OR group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    assigned_user_id = auth.uid()
    OR group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Group admins can delete schedules"
  ON duty_schedules FOR DELETE
  TO authenticated
  USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role = 'admin'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_duty_schedules_group_id ON duty_schedules(group_id);
CREATE INDEX IF NOT EXISTS idx_duty_schedules_assigned_user_id ON duty_schedules(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_duty_schedules_scheduled_date ON duty_schedules(scheduled_date);
