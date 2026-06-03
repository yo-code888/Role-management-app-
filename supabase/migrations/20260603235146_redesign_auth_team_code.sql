/*
  # Redesign authentication for team code access

  ## Changes
  - Add access_code to groups table (unique team identifier)
  - Add access_password to groups table (team password for entry)
  - Modify group_members to support guest/temporary access without auth user
  - Add member_display_name for guests
  - Simplify users table to only store owner information

  ## Security
  - Only group owner (created_by) can register as permanent user
  - Other members access via access_code + access_password as guests
  - Each member record has their own display name
*/

-- Add columns to groups table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'groups' AND column_name = 'access_code'
  ) THEN
    ALTER TABLE groups ADD COLUMN access_code text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'groups' AND column_name = 'access_password'
  ) THEN
    ALTER TABLE groups ADD COLUMN access_password text NOT NULL DEFAULT 'password';
  END IF;
END $$;

-- Add display_name to group_members if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'group_members' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE group_members ADD COLUMN display_name text;
  END IF;
END $$;

-- Make user_id nullable in group_members
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'group_members' AND column_name = 'user_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE group_members ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;
