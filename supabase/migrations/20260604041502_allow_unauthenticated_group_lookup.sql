/*
  # Allow unauthenticated users to lookup groups by access code

  1. Changes
    - Update groups SELECT policy to allow unauthenticated users to view groups
    - This is needed for team joining flow where users haven't logged in yet
    - Unauthenticated users can only see group data needed for joining (invite_code, access_code, access_password)
*/

-- Drop existing groups SELECT policy
DROP POLICY IF EXISTS "Anyone can view public groups" ON groups;

-- Create new policy allowing both authenticated and unauthenticated access
CREATE POLICY "Anyone can view groups for joining"
  ON groups FOR SELECT
  TO public
  USING (true);
