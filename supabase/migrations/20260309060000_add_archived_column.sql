-- Add archived column to weddings table for archive/unarchive functionality
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;
