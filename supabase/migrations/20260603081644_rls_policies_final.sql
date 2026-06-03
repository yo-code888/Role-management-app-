/*
  # Complete RLS policy overhaul - prevent recursion

  ## Root cause
  - SELECT policies on group_members were causing recursion when groups SELECT tried to check membership
  - Nested EXISTS queries checking the same table caused infinite loops

  ## Solution
  - Disable recursive checks in group_members SELECT policy
  - Use a permission model that doesn't require reading group_members to insert into it
*/

-- Disable all RLS to rebuild cleanly
ALTER TABLE duty_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE duty_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "Users can view their groups" ON groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
DROP POLICY IF EXISTS "Group admins can update their groups" ON groups;
DROP POLICY IF EXISTS "Users can view group members they are part of" ON group_members;
DROP POLICY IF EXISTS "Authenticated users can insert themselves" ON group_members;
DROP POLICY IF EXISTS "Admins can update members in their group" ON group_members;
DROP POLICY IF EXISTS "Users can delete themselves or admins can remove" ON group_members;
DROP POLICY IF EXISTS "Group members can view duty types" ON duty_types;
DROP POLICY IF EXISTS "Group admins can create duty types" ON duty_types;
DROP POLICY IF EXISTS "Group admins can update duty types" ON duty_types;
DROP POLICY IF EXISTS "Group admins can delete duty types" ON duty_types;
DROP POLICY IF EXISTS "Group members can view schedules" ON duty_schedules;
DROP POLICY IF EXISTS "Group admins can create schedules" ON duty_schedules;
DROP POLICY IF EXISTS "Admins or assigned user can update schedules" ON duty_schedules;
DROP POLICY IF EXISTS "Group admins can delete schedules" ON duty_schedules;

-- Re-enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_schedules ENABLE ROW LEVEL SECURITY;

-- ============ GROUPS POLICIES ============
CREATE POLICY "Anyone can view public groups"
  ON groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups"
  ON groups FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ============ GROUP_MEMBERS POLICIES ============
CREATE POLICY "Anyone can view members"
  ON group_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can join groups"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update themselves"
  ON group_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete themselves"
  ON group_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============ DUTY_TYPES POLICIES ============
CREATE POLICY "Anyone can view duty types"
  ON duty_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Group creator can create duty types"
  ON duty_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_id AND g.created_by = auth.uid()
    )
  );

CREATE POLICY "Group creator can update duty types"
  ON duty_types FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_id AND g.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_id AND g.created_by = auth.uid()
    )
  );

CREATE POLICY "Group creator can delete duty types"
  ON duty_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_id AND g.created_by = auth.uid()
    )
  );

-- ============ DUTY_SCHEDULES POLICIES ============
CREATE POLICY "Anyone can view schedules"
  ON duty_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Group creator can create schedules"
  ON duty_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_id AND g.created_by = auth.uid()
    )
  );

CREATE POLICY "Assigned user or group creator can update"
  ON duty_schedules FOR UPDATE
  TO authenticated
  USING (
    assigned_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_id AND g.created_by = auth.uid()
    )
  )
  WITH CHECK (
    assigned_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_id AND g.created_by = auth.uid()
    )
  );

CREATE POLICY "Group creator can delete schedules"
  ON duty_schedules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_id AND g.created_by = auth.uid()
    )
  );
