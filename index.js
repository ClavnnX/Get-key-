const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();

// Trust proxy for Vercel
app.set('trust proxy', true);

// Serve static files
app.use(express.static('public'));

// Middleware to parse JSON and get real IP
app.use(express.json());
app.use((req, res, next) => {
  // Get real IP address (considering Vercel proxy headers)
  req.realIP = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress ||
               (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
               req.ip;
  
  // If multiple IPs in x-forwarded-for, take the first one
  if (req.realIP && req.realIP.includes(',')) {
    req.realIP = req.realIP.split(',')[0].trim();
  }
  
  console.log(`Request from IP: ${req.realIP} to ${req.path}`);
  next();
});

// File-based storage paths
const KEY_STORAGE_FILE = './key_storage.json';
const TOKEN_STORAGE_FILE = './token_storage.json';

// Load storage from files
let keyStorage = {};
let tokenStorage = {};

try {
  if (fs.existsSync(KEY_STORAGE_FILE)) {
    keyStorage = JSON.parse(fs.readFileSync(KEY_STORAGE_FILE, 'utf8'));
    console.log('Key storage loaded from file');
  }
} catch (e) {
  console.error('Error loading key storage:', e);
  keyStorage = {};
}

try {
  if (fs.existsSync(TOKEN_STORAGE_FILE)) {
    tokenStorage = JSON.parse(fs.readFileSync(TOKEN_STORAGE_FILE, 'utf8'));
    console.log('Token storage loaded from file');
  }
} catch (e) {
  console.error('Error loading token storage:', e);
  tokenStorage = {};
}

// Updated anti-bypass token from vertise
const ANTI_BYPASS_TOKEN = '1c3c210b0a6101cfb3b20619b480a70598dbca6e0b60567c73a6472557d077c7';

// Helper function to save storage to files
function saveKeyStorage() {
  try {
    fs.writeFileSync(KEY_STORAGE_FILE, JSON.stringify(keyStorage, null, 2));
  } catch (e) {
    console.error('Error saving key storage:', e);
  }
}

function saveTokenStorage() {
  try {
    fs.writeFileSync(TOKEN_STORAGE_FILE, JSON.stringify(tokenStorage, null, 2));
  } catch (e) {
    console.error('Error saving token storage:', e);
  }
}

// Helper function to generate random 10-character uppercase key
function generateKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  // Use crypto.randomBytes for better randomness
  const randomBytes = crypto.randomBytes(10);
  
  for (let i = 0; i < 10; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  
  return result;
}

// Helper function to check if key is expired
function isKeyExpired(keyData) {
  return new Date() > new Date(keyData.expires);
}

// Helper function to clean up expired keys
function cleanupExpiredKeys() {
  const now = new Date();
  let needsSave = false;
  
  Object.keys(keyStorage).forEach(ip => {
    if (keyStorage[ip] && now > new Date(keyStorage[ip].expires)) {
      delete keyStorage[ip];
      needsSave = true;
    }
  });
  
  if (needsSave) {
    saveKeyStorage();
    console.log('Expired keys cleaned up');
  }
}

// Helper function to generate verification token
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // Use crypto.randomBytes for better randomness
  const randomBytes = crypto.randomBytes(32);
  
  for (let i = 0; i < 32; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  
  return result;
}

// Helper function to check if token is expired
function isTokenExpired(tokenData) {
  return new Date() > new Date(tokenData.expires);
}

// Helper function to validate token for specific step
function isValidToken(userIP, token, requiredStep = 3) {
  if (!tokenStorage[userIP]) {
    console.log(`No token storage found for IP: ${userIP}`);
    return false;
  }
  
  const tokenData = tokenStorage[userIP];
  console.log(`Validating token for IP: ${userIP}, Required step: ${requiredStep}, Current step: ${tokenData.step}`);
  
  // Check if token matches and is not expired and has completed required steps
  return tokenData.token === token && 
         !isTokenExpired(tokenData) && 
         tokenData.step >= requiredStep;
}

// Helper function to clean up expired tokens
function cleanupExpiredTokens() {
  const now = new Date();
  let needsSave = false;
  
  Object.keys(tokenStorage).forEach(ip => {
    if (tokenStorage[ip] && now > new Date(tokenStorage[ip].expires)) {
      delete tokenStorage[ip];
      needsSave = true;
    }
  });
  
  if (needsSave) {
    saveTokenStorage();
    console.log('Expired tokens cleaned up');
  }
}

// Endpoint: /getkey (requires valid token with all 3 steps completed)
app.get('/getkey', (req, res) => {
  try {
    const userIP = req.realIP;
    const { token } = req.query;
    
    console.log(`/getkey request from IP: ${userIP} with token: ${token ? 'provided' : 'missing'}`);
    
    if (!userIP) {
      return res.status(400).json({
        error: 'Unable to identify user IP address'
      });
    }

    // Check if token is provided and valid
    if (!token) {
      return res.status(403).json({
        error: 'Forbidden: Valid token required'
      });
    }

    // Check if user completed all 3 steps
    if (!isValidToken(userIP, token, 3)) {
      console.log(`Token validation failed for IP: ${userIP}`);
      return res.status(403).json({
        error: 'Forbidden: All verification steps must be completed'
      });
    }

    const now = new Date();
    const expirationTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    // Check if user already has a key
    if (keyStorage[userIP]) {
      const existingKey = keyStorage[userIP];
      
      // If key is still valid, return it
      if (!isKeyExpired(existingKey)) {
        console.log(`Returning existing key for IP: ${userIP}`);
        return res.json({
          key: existingKey.key,
          expires: existingKey.expires
        });
      } else {
        // Key expired, remove it
        delete keyStorage[userIP];
        saveKeyStorage();
      }
    }
    
    // Generate new key
    const newKey = generateKey();
    
    // Store the new key
    keyStorage[userIP] = {
      key: newKey,
      expires: expirationTime.toISOString(),
      created: now.toISOString()
    };
    
    saveKeyStorage();
    console.log(`Generated new key for IP: ${userIP}`);
    
    // Return the new key
    res.json({
      key: newKey,
      expires: expirationTime.toISOString()
    });
    
  } catch (error) {
    console.error('Error in /getkey:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Endpoint: /validate
app.get('/validate', (req, res) => {
  try {
    const { key } = req.query;
    
    if (!key) {
      return res.json({
        status: 'INVALID'
      });
    }
    
    // Find the key in storage
    let foundKey = null;
    let foundIP = null;
    
    Object.keys(keyStorage).forEach(ip => {
      if (keyStorage[ip] && keyStorage[ip].key === key) {
        foundKey = keyStorage[ip];
        foundIP = ip;
      }
    });
    
    if (!foundKey) {
      return res.json({
        status: 'INVALID'
      });
    }
    
    // Check if key is expired
    if (isKeyExpired(foundKey)) {
      // Remove expired key
      delete keyStorage[foundIP];
      saveKeyStorage();
      return res.json({
        status: 'EXPIRED'
      });
    }
    
    // Key is valid
    res.json({
      status: 'VALID'
    });
    
  } catch (error) {
    console.error('Error in /validate:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Homepage - serve HTML UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Verify endpoint - handles token validation and step progression
app.get('/verify', (req, res) => {
  try {
    const userIP = req.realIP;
    const { token, step, bypass } = req.query;
    
    console.log(`/verify request from IP: ${userIP}, token: ${token ? 'provided' : 'missing'}, step: ${step || 'none'}, bypass: ${bypass ? 'provided' : 'missing'}`);
    
    if (!userIP) {
      return res.status(400).json({
        error: 'Unable to identify user IP address'
      });
    }

    const now = new Date();
    const tokenExpirationTime = new Date(now.getTime() + 3 * 60 * 60 * 1000); // Extended to 3 hours

    // If no token provided, this means user is starting fresh
    if (!token) {
      const newToken = generateToken();
      
      // Store the new token with step 0
      tokenStorage[userIP] = {
        token: newToken,
        expires: tokenExpirationTime.toISOString(),
        created: now.toISOString(),
        step: 0
      };
      
      saveTokenStorage();
      console.log(`Generated new token for IP: ${userIP}`);
      
      // Redirect to home page with token parameter
      return res.redirect(`/?token=${newToken}`);
    }
    
    // If step parameter is provided, this means user completed a vertise step
    if (step) {
      const stepNumber = parseInt(step);
      
      // Anti-bypass validation: check if bypass token is provided and valid
      if (!bypass || bypass !== ANTI_BYPASS_TOKEN) {
        console.log(`Invalid bypass token from IP: ${userIP}, provided: ${bypass}`);
        return res.status(403).json({
          error: 'Invalid bypass token. Please complete the verification step properly.'
        });
      }
      
      if (tokenStorage[userIP] && tokenStorage[userIP].token === token) {
        // Additional validation: user can only advance one step at a time
        const currentStep = tokenStorage[userIP].step;
        if (stepNumber !== currentStep + 1) {
          console.log(`Invalid step progression for IP: ${userIP}, current: ${currentStep}, requested: ${stepNumber}`);
          return res.status(403).json({
            error: 'Invalid step progression. Please complete steps in order.'
          });
        }
        
        // Update step progress
        tokenStorage[userIP].step = stepNumber;
        tokenStorage[userIP].expires = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(); // Extend expiry to 3 hours
        
        saveTokenStorage();
        console.log(`Updated step to ${stepNumber} for IP: ${userIP}`);
        
        // Redirect back to home page with updated token and step info
        return res.redirect(`/?token=${token}&currentstep=${stepNumber}`);
      } else {
        console.log(`Invalid user token for IP: ${userIP}`);
        return res.status(403).json({
          error: 'Invalid user token'
        });
      }
    }
    
    // If token is provided for validation, check current step
    if (tokenStorage[userIP] && tokenStorage[userIP].token === token && !isTokenExpired(tokenStorage[userIP])) {
      console.log(`Token validated for IP: ${userIP}, step: ${tokenStorage[userIP].step}`);
      return res.json({
        valid: true,
        step: tokenStorage[userIP].step,
        message: 'Token is valid'
      });
    } else {
      console.log(`Token validation failed for IP: ${userIP}`);
      return res.json({
        valid: false,
        step: 0,
        message: 'Invalid or expired token'
      });
    }
    
  } catch (error) {
    console.error('Error in /verify:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Status endpoint for healthcheck
app.get('/status', (req, res) => {
  res.json({
    status: 'online'
  });
});

// Endpoint for getting system stats (optional, for debugging)
app.get('/stats', (req, res) => {
  try {
    // Clean up expired keys before showing stats
    cleanupExpiredKeys();
    cleanupExpiredTokens();
    
    const activeKeys = Object.keys(keyStorage).length;
    const activeTokens = Object.keys(tokenStorage).length;
    const now = new Date();
    
    res.json({
      active_keys: activeKeys,
      active_tokens: activeTokens,
      server_time: now.toISOString(),
      uptime: process.uptime(),
      anti_bypass_token: ANTI_BYPASS_TOKEN
    });
  } catch (error) {
    console.error('Error in /stats:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Handle 404 for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    available_endpoints: ['/getkey', '/validate', '/verify', '/', '/stats', '/status']
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error'
  });
});

// Periodic cleanup of expired keys and tokens (every 30 minutes)
setInterval(() => {
  cleanupExpiredKeys();
  cleanupExpiredTokens();
  console.log('Cleaned up expired keys and tokens');
}, 30 * 60 * 1000); // Changed from 1 hour to 30 minutes

// Initial cleanup on startup
setTimeout(() => {
  cleanupExpiredKeys();
  cleanupExpiredTokens();
}, 5000);

// For local development (Replit)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Roblox Key System API server running on port ${PORT}`);
    console.log(`Access at: http://localhost:${PORT}`);
    console.log(`Anti-bypass token: ${ANTI_BYPASS_TOKEN}`);
  });
}

// Export app for Vercel
module.exports = app;
