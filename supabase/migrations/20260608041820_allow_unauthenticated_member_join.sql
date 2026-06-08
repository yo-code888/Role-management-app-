/*
  # Allow unauthenticated users to join groups as guest members

  1. Changes
    - Update group_members INSERT policy to allow unauthenticated users
    - Guest members have null user_id, so policy must allow that
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can join groups" ON group_members;

-- Create new policy allowing both authenticated and unauthenticated users to insert
CREATE POLICY "Anyone can join groups as members"
  ON group_members FOR INSERT
  TO public
  WITH CHECK (true);

-- Also allow anyone to view members (needed for unauthenticated users)
DROP POLICY IF EXISTS "Anyone can view members" ON group_members;
CREATE POLICY "Anyone can view group members"
  ON group_members FOR SELECT
  TO public
  USING (true);
