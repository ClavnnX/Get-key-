import { createClient } from '@supabase/supabase-js';

// Supabase configuration - menggunakan environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://vrjtcfvjqwzenvsdeixd.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  throw new Error('SUPABASE_ANON_KEY environment variable is required');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Generate random key function
function generateRandomKey() {
  const prefix = 'RBX';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  
  for (let i = 0; i < 13; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return prefix + randomPart;
}

// Generate unique key and save to Supabase
async function generateKey() {
  try {
    let uniqueKey;
    let isUnique = false;
    
    // Generate unique key (check if already exists)
    while (!isUnique) {
      uniqueKey = generateRandomKey();
      
      const { data: existingKey, error: checkError } = await supabase
        .from('keys')
        .select('key')
        .eq('key', uniqueKey)
        .single();
      
      if (checkError && checkError.code === 'PGRST116') {
        // No existing key found, this key is unique
        isUnique = true;
      } else if (checkError) {
        throw checkError;
      }
    }
    
    // Set expiration to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Insert key into Supabase
    const { data, error } = await supabase
      .from('keys')
      .insert([
        {
          key: uniqueKey,
          expires_at: expiresAt.toISOString(),
          status: 'valid'
        }
      ])
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return {
      success: true,
      key: data.key,
      expires_at: data.expires_at,
      status: data.status
    };
    
  } catch (error) {
    console.error('Error generating key:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate key'
    };
  }
}

// Verify key validity and expiration
async function verifyKey(key) {
  try {
    if (!key) {
      return {
        success: false,
        status: 'INVALID',
        error: 'Key is required'
      };
    }
    
    // Get key from Supabase
    const { data: keyData, error } = await supabase
      .from('keys')
      .select('*')
      .eq('key', key)
      .single();
    
    if (error && error.code === 'PGRST116') {
      // Key not found
      return {
        success: false,
        status: 'INVALID',
        error: 'Key not found'
      };
    } else if (error) {
      throw error;
    }
    
    const now = new Date();
    const expiresAt = new Date(keyData.expires_at);
    
    // Check if key is expired
    if (expiresAt < now) {
      // Update status to expired if not already
      if (keyData.status !== 'expired') {
        const { error: updateError } = await supabase
          .from('keys')
          .update({ status: 'expired' })
          .eq('key', key);
        
        if (updateError) {
          console.error('Error updating key status:', updateError);
        }
      }
      
      return {
        success: false,
        status: 'EXPIRED',
        error: 'Key has expired'
      };
    }
    
    // Check if key status is valid
    if (keyData.status !== 'valid') {
      return {
        success: false,
        status: 'INVALID',
        error: 'Key is not valid'
      };
    }
    
    // Key is valid
    return {
      success: true,
      status: 'VALID',
      expires_at: keyData.expires_at,
      created_at: keyData.created_at
    };
    
  } catch (error) {
    console.error('Error verifying key:', error);
    return {
      success: false,
      status: 'ERROR',
      error: error.message || 'Internal server error'
    };
  }
}

export {
  generateKey,
  verifyKey
};
