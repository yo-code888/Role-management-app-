/*
  # Allow unauthenticated users to look up email by user_id for login

  The owner-login flow resolves a user_id to an email address
  before calling signInWithPassword. This must work while unauthenticated.
*/

-- Allow public read on users table (needed for login lookup)
-- Existing authenticated policies still apply for writes
CREATE POLICY "Public lookup for login"
  ON users FOR SELECT
  TO public
  USING (true);
