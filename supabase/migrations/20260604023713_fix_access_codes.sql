/*
  # Fix access codes to be user-friendly

  1. Changes
    - Update existing groups with UUID access_codes to use short 6-character codes
    - Regenerate short codes for all existing groups
*/

UPDATE groups
SET access_code = UPPER(SUBSTR(MD5(RANDOM()::text), 1, 6))
WHERE access_code LIKE '%-%' OR LENGTH(access_code) > 10;
