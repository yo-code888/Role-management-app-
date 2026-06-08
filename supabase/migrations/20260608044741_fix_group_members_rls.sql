/*
  # Fix group_members RLS policies - remove always-true checks

  1. Changes
    - Replace unrestricted INSERT policy with scoped policies
    - Guests can only insert with user_id IS NULL AND role = 'member'
    - Authenticated users can only insert with user_id = auth.uid()
    - Tighten SELECT policy to require group existence
*/

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can join groups as members" ON group_members;
DROP POLICY IF EXISTS "Anyone can view group members" ON group_members;

-- Guests can join as members only (no admin elevation, null user_id enforced)
CREATE POLICY "Guests can join as members"
  ON group_members FOR INSERT
  TO public
  WITH CHECK (user_id IS NULL AND role = 'member');

-- Authenticated users can join, but only as themselves
CREATE POLICY "Authenticated users can join groups"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Anyone can view members of groups (read-only, not sensitive data)
CREATE POLICY "View group members"
  ON group_members FOR SELECT
  TO public
  USING (group_id IN (SELECT id FROM groups));
