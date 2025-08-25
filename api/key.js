const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and ANON KEY must be set in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Generate a unique 10-character API key
 * @returns {string} Generated key
 */
function generateUniqueKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  // Use crypto.randomBytes for better randomness
  const randomBytes = crypto.randomBytes(10);
  
  for (let i = 0; i < 10; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  
  return result;
}

/**
 * Save a new key to Supabase
 * @param {string} userIP - User's IP address
 * @param {string} key - Generated key
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function saveKeyToSupabase(userIP, key) {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    const { data, error } = await supabase
      .from('api_keys')
      .insert([
        {
          key: key,
          user_ip: userIP,
          created_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          is_active: true
        }
      ])
      .select();
    
    if (error) {
      console.error('Supabase save error:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error saving key to Supabase:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate a key from Supabase
 * @param {string} key - Key to validate
 * @returns {Promise<{status: 'VALID'|'EXPIRED'|'INVALID', data?: any}>}
 */
async function validateKeyFromSupabase(key) {
  try {
    if (!key) {
      return { status: 'INVALID' };
    }
    
    // Query the key from Supabase
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key', key)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      console.log(`Key not found in database: ${key}`);
      return { status: 'INVALID' };
    }
    
    // Check if key is expired
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    
    if (now > expiresAt) {
      // Mark key as inactive in database
      await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('key', key);
      
      console.log(`Key expired: ${key}`);
      return { status: 'EXPIRED' };
    }
    
    // Key is valid
    console.log(`Key validated successfully: ${key}`);
    return { status: 'VALID', data };
    
  } catch (error) {
    console.error('Error validating key from Supabase:', error);
    return { status: 'INVALID' };
  }
}

/**
 * Check if user already has an active key
 * @param {string} userIP - User's IP address
 * @returns {Promise<{hasKey: boolean, key?: string, data?: any}>}
 */
async function getUserActiveKey(userIP) {
  try {
    const now = new Date();
    
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_ip', userIP)
      .eq('is_active', true)
      .gt('expires_at', now.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error || !data || data.length === 0) {
      return { hasKey: false };
    }
    
    return { hasKey: true, key: data[0].key, data: data[0] };
    
  } catch (error) {
    console.error('Error getting user active key:', error);
    return { hasKey: false };
  }
}

/**
 * Generate a new key for user (with duplicate check)
 * @param {string} userIP - User's IP address
 * @returns {Promise<{success: boolean, key?: string, data?: any, error?: string, isExisting?: boolean}>}
 */
async function generateKeyForUser(userIP) {
  try {
    // Check if user already has an active key
    const existingKey = await getUserActiveKey(userIP);
    
    if (existingKey.hasKey) {
      console.log(`Returning existing key for IP: ${userIP}`);
      return { 
        success: true, 
        key: existingKey.key, 
        data: existingKey.data,
        isExisting: true 
      };
    }
    
    // Generate new unique key
    let newKey;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      newKey = generateUniqueKey();
      attempts++;
      
      // Check if key already exists in database
      const { data: existingData } = await supabase
        .from('api_keys')
        .select('key')
        .eq('key', newKey)
        .limit(1);
      
      if (!existingData || existingData.length === 0) {
        break; // Key is unique
      }
      
      newKey = null; // Reset to try again
    } while (attempts < maxAttempts);
    
    if (!newKey) {
      return { success: false, error: 'Failed to generate unique key after multiple attempts' };
    }
    
    // Save the new key to Supabase
    const saveResult = await saveKeyToSupabase(userIP, newKey);
    
    if (!saveResult.success) {
      return { success: false, error: saveResult.error };
    }
    
    console.log(`Generated new key: ${newKey} for IP: ${userIP}`);
    
    return { 
      success: true, 
      key: newKey, 
      data: saveResult.data,
      isExisting: false 
    };
    
  } catch (error) {
    console.error('Error generating key for user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Clean up expired keys from database (optional maintenance)
 * @returns {Promise<{success: boolean, cleaned?: number, error?: string}>}
 */
async function cleanupExpiredKeys() {
  try {
    const now = new Date();
    
    const { data, error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .lt('expires_at', now.toISOString())
      .eq('is_active', true)
      .select();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    const cleanedCount = data ? data.length : 0;
    console.log(`Cleaned up ${cleanedCount} expired keys`);
    
    return { success: true, cleaned: cleanedCount };
    
  } catch (error) {
    console.error('Error cleaning up expired keys:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get key statistics (for debugging/monitoring)
 * @returns {Promise<{success: boolean, stats?: object, error?: string}>}
 */
async function getKeyStats() {
  try {
    const now = new Date();
    
    // Get total active keys
    const { data: activeKeys, error: activeError } = await supabase
      .from('api_keys')
      .select('id')
      .eq('is_active', true)
      .gt('expires_at', now.toISOString());
    
    // Get total expired keys
    const { data: expiredKeys, error: expiredError } = await supabase
      .from('api_keys')
      .select('id')
      .or('is_active.eq.false,expires_at.lt.' + now.toISOString());
    
    if (activeError || expiredError) {
      return { success: false, error: 'Failed to fetch statistics' };
    }
    
    const stats = {
      active_keys: activeKeys ? activeKeys.length : 0,
      expired_keys: expiredKeys ? expiredKeys.length : 0,
      timestamp: now.toISOString()
    };
    
    return { success: true, stats };
    
  } catch (error) {
    console.error('Error getting key stats:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  generateUniqueKey,
  saveKeyToSupabase,
  validateKeyFromSupabase,
  getUserActiveKey,
  generateKeyForUser,
  cleanupExpiredKeys,
  getKeyStats
};
