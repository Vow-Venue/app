-- Add payment-related columns to vendors table
-- These were referenced in the app code but missing from the schema
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS amount numeric NOT NULL DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false;
