-- Migration Script: Update Drug Types and Indent Sources
-- Run this in your Supabase SQL Editor to update existing database

-- Step 1: Drop existing CHECK constraints
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_type_check;
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_indent_source_check;

-- Step 2: Add new CHECK constraints with updated values
ALTER TABLE inventory_items 
  ADD CONSTRAINT inventory_items_type_check 
  CHECK (type IN ('OPD', 'Eye/Ear/Nose/Inh', 'DDA', 'External', 'Injection', 'Syrup', 'Others', 'UOD'));

ALTER TABLE inventory_items 
  ADD CONSTRAINT inventory_items_indent_source_check 
  CHECK (indent_source IN ('OPD Counter', 'OPD Substore', 'IPD Counter', 'MNF Substor', 'Manufact', 'Prepacking', 'IPD Substore'));

-- Step 3: Change requested_qty from INTEGER to TEXT
ALTER TABLE indent_requests 
  ALTER COLUMN requested_qty TYPE TEXT;

-- Optional: Update existing data if needed
-- Uncomment and modify these if you want to migrate existing data to new categories

-- Example: Update old 'Tablet' type to 'OPD'
-- UPDATE inventory_items SET type = 'OPD' WHERE type = 'Tablet';

-- Example: Update old 'Eye Drops' or 'Ear Drops' to 'Eye/Ear/Nose/Inh'
-- UPDATE inventory_items SET type = 'Eye/Ear/Nose/Inh' WHERE type IN ('Eye Drops', 'Ear Drops');

-- Example: Update old indent sources
-- UPDATE inventory_items SET indent_source = 'OPD Counter' WHERE indent_source = 'OPD';
-- UPDATE inventory_items SET indent_source = 'IPD Counter' WHERE indent_source = 'IPD';
-- UPDATE inventory_items SET indent_source = 'MNF Substor' WHERE indent_source = 'MFG';

-- Verify the changes
SELECT 
  'inventory_items' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT type) as unique_types,
  COUNT(DISTINCT indent_source) as unique_sources
FROM inventory_items;

-- Verify requested_qty is now TEXT type
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'indent_requests' 
  AND column_name = 'requested_qty';
