/*
# Fix duty_schedules FK and RLS for guest member support

## Problem
- duty_schedules.assigned_user_id had FK to auth.users(id)
- Guest members (team code login) have user_id = null in group_members
- Auto/manual assignment failed because it inserted null or non-existent auth.users IDs
- Guest users also couldn't view schedules or duty types (RLS was authenticated-only)

## Changes
1. Foreign Key
   - Drop FK duty_schedules_assigned_user_id_fkey (→ auth.users)
   - Add FK duty_schedules_assigned_member_id_fkey (→ group_members.id ON DELETE CASCADE)
   - assigned_user_id now stores group_members.id instead of auth.users.id
   - Both guest (null user_id) and authenticated members can be assigned

2. RLS - duty_schedules
   - SELECT: TO public (guest users need to see schedules)
   - INSERT: TO authenticated, WITH CHECK is_group_admin(group_id) (admins only)
   - UPDATE: TO public (guest users need to toggle completion)
   - DELETE: TO authenticated, USING is_group_admin(group_id) (admins only)

3. RLS - duty_types
   - SELECT: TO public (guest users need to see duty types)
   - INSERT/UPDATE/DELETE: updated to use is_group_admin() for consistency

## Notes
- is_group_admin() function already exists (created in prior migration)
- App-level admin checks (client-side isAdmin) control UI access
- Group access is protected by team code + password at the application level
*/

-- 1. Change FK on duty_schedules.assigned_user_id
ALTER TABLE duty_schedules DROP CONSTRAINT IF EXISTS duty_schedules_assigned_user_id_fkey;
ALTER TABLE duty_schedules DROP CONSTRAINT IF EXISTS duty_schedules_assigned_member_id_fkey;
ALTER TABLE duty_schedules
  ADD CONSTRAINT duty_schedules_assigned_member_id_fkey
  FOREIGN KEY (assigned_user_id) REFERENCES group_members(id) ON DELETE CASCADE;

-- 2. Fix duty_schedules RLS policies
DROP POLICY IF EXISTS "Anyone can view schedules" ON duty_schedules;
DROP POLICY IF EXISTS "Group creator can create schedules" ON duty_schedules;
DROP POLICY IF EXISTS "Assigned user or group creator can update" ON duty_schedules;
DROP POLICY IF EXISTS "Group creator can delete schedules" ON duty_schedules;

CREATE POLICY "Anyone can view schedules"
  ON duty_schedules FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can create schedules"
  ON duty_schedules FOR INSERT
  TO authenticated
  WITH CHECK (is_group_admin(group_id));

CREATE POLICY "Anyone can update schedules"
  ON duty_schedules FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete schedules"
  ON duty_schedules FOR DELETE
  TO authenticated
  USING (is_group_admin(group_id));

-- 3. Fix duty_types SELECT for guest access + update admin policies
DROP POLICY IF EXISTS "Anyone can view duty types" ON duty_types;
DROP POLICY IF EXISTS "Group creator can create duty types" ON duty_types;
DROP POLICY IF EXISTS "Group creator can update duty types" ON duty_types;
DROP POLICY IF EXISTS "Group creator can delete duty types" ON duty_types;

CREATE POLICY "Anyone can view duty types"
  ON duty_types FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can create duty types"
  ON duty_types FOR INSERT
  TO authenticated
  WITH CHECK (is_group_admin(group_id));

CREATE POLICY "Admins can update duty types"
  ON duty_types FOR UPDATE
  TO authenticated
  USING (is_group_admin(group_id))
  WITH CHECK (is_group_admin(group_id));

CREATE POLICY "Admins can delete duty types"
  ON duty_types FOR DELETE
  TO authenticated
  USING (is_group_admin(group_id));
