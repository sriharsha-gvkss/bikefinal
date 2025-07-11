-- Database Migration Script for Bike Taxi App
-- Add vehicle_type and license_number columns to users table

-- Check if columns don't exist before adding them
DO $$
BEGIN
    -- Add vehicle_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'vehicle_type'
    ) THEN
        ALTER TABLE users ADD COLUMN vehicle_type VARCHAR(20);
        RAISE NOTICE 'Added vehicle_type column to users table';
    ELSE
        RAISE NOTICE 'vehicle_type column already exists in users table';
    END IF;

    -- Add license_number column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'license_number'
    ) THEN
        ALTER TABLE users ADD COLUMN license_number VARCHAR(100);
        RAISE NOTICE 'Added license_number column to users table';
    ELSE
        RAISE NOTICE 'license_number column already exists in users table';
    END IF;

    -- Add status column for driver online/offline
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'status'
    ) THEN
        ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'OFFLINE';
        RAISE NOTICE 'Added status column to users table';
    ELSE
        RAISE NOTICE 'status column already exists in users table';
    END IF;
END $$;

-- Create index on vehicle_type for better query performance
CREATE INDEX IF NOT EXISTS idx_users_vehicle_type ON users(vehicle_type);

-- Create index on license_number for better query performance
CREATE INDEX IF NOT EXISTS idx_users_license_number ON users(license_number);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('vehicle_type', 'license_number', 'status')
ORDER BY column_name; 