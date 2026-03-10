-- Drop UNIQUE constraint on weddings.user_id
-- This was blocking multi-wedding support: each user could only own one wedding.
-- The multi-wedding model uses wedding_members for access control instead.
ALTER TABLE weddings DROP CONSTRAINT IF EXISTS weddings_user_id_key;

-- Also make wedding_date nullable (users can skip date during creation)
ALTER TABLE weddings ALTER COLUMN wedding_date DROP NOT NULL;
ALTER TABLE weddings ALTER COLUMN wedding_date DROP DEFAULT;
