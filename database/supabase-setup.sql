-- ClavnnX Key System Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor

-- Create the api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id BIGSERIAL PRIMARY KEY,
    key VARCHAR(10) NOT NULL UNIQUE,
    user_ip VARCHAR(45) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Add indexes for better performance
    CONSTRAINT unique_active_key UNIQUE(key)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_ip ON api_keys(user_ip);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON api_keys(created_at);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_api_keys_user_active ON api_keys(user_ip, is_active, expires_at);

-- Enable Row Level Security (RLS) for security
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy for INSERT: Allow service role to insert
CREATE POLICY "Enable insert for service role" ON api_keys
    FOR INSERT
    WITH CHECK (true);

-- Policy for SELECT: Allow service role to select
CREATE POLICY "Enable select for service role" ON api_keys
    FOR SELECT
    USING (true);

-- Policy for UPDATE: Allow service role to update
CREATE POLICY "Enable update for service role" ON api_keys
    FOR UPDATE
    USING (true);

-- Policy for DELETE: Allow service role to delete (if needed)
CREATE POLICY "Enable delete for service role" ON api_keys
    FOR DELETE
    USING (true);

-- Create a view for active keys (optional, for easier querying)
CREATE OR REPLACE VIEW active_keys AS
SELECT 
    id,
    key,
    user_ip,
    created_at,
    expires_at,
    is_active,
    CASE 
        WHEN expires_at > NOW() THEN 'VALID'
        ELSE 'EXPIRED'
    END as status,
    EXTRACT(EPOCH FROM (expires_at - NOW())) as seconds_until_expiry
FROM api_keys 
WHERE is_active = true;

-- Create a function to automatically cleanup expired keys (optional)
CREATE OR REPLACE FUNCTION cleanup_expired_keys()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    -- Update expired keys to inactive
    UPDATE api_keys 
    SET is_active = false 
    WHERE expires_at < NOW() AND is_active = true;
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get key statistics
CREATE OR REPLACE FUNCTION get_key_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_keys', (SELECT COUNT(*) FROM api_keys),
        'active_keys', (SELECT COUNT(*) FROM api_keys WHERE is_active = true AND expires_at > NOW()),
        'expired_keys', (SELECT COUNT(*) FROM api_keys WHERE expires_at <= NOW() OR is_active = false),
        'keys_today', (SELECT COUNT(*) FROM api_keys WHERE created_at >= CURRENT_DATE),
        'unique_ips_today', (SELECT COUNT(DISTINCT user_ip) FROM api_keys WHERE created_at >= CURRENT_DATE),
        'last_updated', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to cleanup expired keys automatically
-- (You can set this up in Supabase Dashboard -> Database -> Functions)
/*
SELECT cron.schedule(
    'cleanup-expired-keys',
    '0 * * * *', -- Every hour
    $$SELECT cleanup_expired_keys();$$
);
*/

-- Insert some sample data for testing (optional)
/*
INSERT INTO api_keys (key, user_ip, expires_at) VALUES
