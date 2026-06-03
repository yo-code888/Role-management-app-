/*
  # Fix RLS infinite recursion in group_members policies

  ## Issue
  - Policies for group_members were causing infinite recursion by selecting from group_members within their own condition
  - When checking access, the policy would recursively check itself

  ## Solution
  - Drop problematic policies and recreate them with simplified logic
  - Use EXISTS subqueries to avoid recursion
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Group members can view membership" ON group_members;
DROP POLICY IF EXISTS "Group admins can manage members" ON group_members;
DROP POLICY IF EXISTS "Members can leave or admins can remove" ON group_members;

-- Recreate with fixed logic
CREATE POLICY "Members can view their group members"
  ON group_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_members.group_id
      AND g.id IN (
        SELECT gm.group_id FROM group_members gm 
        WHERE gm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can join any group"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update members"
  ON group_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );

CREATE POLICY "Members can leave or admins can remove"
  ON group_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );
