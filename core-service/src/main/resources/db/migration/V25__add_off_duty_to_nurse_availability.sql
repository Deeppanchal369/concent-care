-- Migration V25: Add OFF_DUTY to nurses availability_status CHECK constraint
ALTER TABLE nurses DROP CONSTRAINT IF EXISTS nurses_availability_status_check;
ALTER TABLE nurses ADD CONSTRAINT nurses_availability_status_check CHECK (availability_status IN ('AVAILABLE', 'BUSY', 'OFF_DUTY'));
