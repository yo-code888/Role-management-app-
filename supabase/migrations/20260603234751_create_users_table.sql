/*
  # Create custom users table for user_id authentication

  ## Changes
  - Create `users` table to map auth.users to custom user_id
  - Add user_id field as primary key
  - Add metadata fields (display_name, email)
  - Link to Supabase auth.users via auth_user_id
  - Add RLS policies for auth users

  ## Rationale
  - Allows users to register/login with username (user_id) instead of email
  - Maintains reference to Supabase auth system
  - Enables custom user metadata storage
*/

CREATE TABLE IF NOT EXISTS users (
  user_id text PRIMARY KEY,
  auth_user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());
