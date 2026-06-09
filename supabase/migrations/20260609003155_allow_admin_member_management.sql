/*
  # Allow group admins to update and delete group_members

  Currently only self-update and self-delete policies exist.
  Group admins (role = 'admin') need to be able to:
  - Rename any member (UPDATE display_name)
  - Remove any member (DELETE)
*/

-- Admin can update any member in groups they admin
CREATE POLICY "Admins can update group members"
  ON group_members FOR UPDATE
  TO authenticated
  USING (
    group_id IN (
      SELECT gm.group_id
      FROM group_members gm
      WHERE gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  )
  WITH CHECK (
    group_id IN (
      SELECT gm.group_id
      FROM group_members gm
      WHERE gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );

-- Admin can delete any member in groups they admin
CREATE POLICY "Admins can delete group members"
  ON group_members FOR DELETE
  TO authenticated
  USING (
    group_id IN (
      SELECT gm.group_id
      FROM group_members gm
      WHERE gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );
