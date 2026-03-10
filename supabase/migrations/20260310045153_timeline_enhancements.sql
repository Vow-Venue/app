-- Day descriptions
ALTER TABLE timeline_days ADD COLUMN IF NOT EXISTS description text;

-- Event address, vendor FK, and assignees JSON array
ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL;
ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS assignees jsonb DEFAULT '[]';
