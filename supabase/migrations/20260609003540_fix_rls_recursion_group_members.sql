/*
  # Fix infinite recursion in group_members RLS policies

  The admin UPDATE/DELETE policies query group_members inside the
  USING clause, which triggers RLS on group_members again → infinite recursion.

  Solution: Use a SECURITY DEFINER function that bypasses RLS
  to check if the current user is an admin in a given group.
*/

-- Drop the recursive policies
DROP POLICY IF EXISTS "Admins can update group members" ON group_members;
DROP POLICY IF EXISTS "Admins can delete group members" ON group_members;

-- Create a SECURITY DEFINER function that checks admin status
-- This function runs as the table owner, bypassing RLS
CREATE OR REPLACE FUNCTION is_group_admin(group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = is_group_admin.group_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Re-create admin policies using the function (no recursion)
CREATE POLICY "Admins can update group members"
  ON group_members FOR UPDATE
  TO authenticated
  USING (is_group_admin(group_id))
  WITH CHECK (is_group_admin(group_id));

CREATE POLICY "Admins can delete group members"
  ON group_members FOR DELETE
  TO authenticated
  USING (is_group_admin(group_id));
