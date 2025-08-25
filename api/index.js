const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();

// Trust proxy for Vercel
app.set('trust proxy', true);

// ========== CORS MIDDLEWARE - TAMBAHAN BARU ==========
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// ========== EXISTING MIDDLEWARE ==========
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
  
  next();
});

// In-memory storage for keys
// Structure: { ip: { key: string, expires: Date, created: Date } }
const keyStorage = {};

// In-memory storage for verification tokens
// Structure: { ip: { token: string, expires: Date, created: Date, step: number } }
const tokenStorage = {};

// In-memory storage for generate page access
// Structure: { ip: { accessTime: Date } }
const generatePageAccess = {};

// Anti-bypass token from vertise (updated)
const ANTI_BYPASS_TOKEN = '1c3c210b0a6101cfb3b20619b480a70598dbca6e0b60567c73a6472557d077c7';

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
  return new Date() > keyData.expires;
}

// Helper function to clean up expired keys (optional cleanup)
function cleanupExpiredKeys() {
  const now = new Date();
  Object.keys(keyStorage).forEach(ip => {
    if (keyStorage[ip] && now > keyStorage[ip].expires) {
      delete keyStorage[ip];
    }
  });
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
  return new Date() > tokenData.expires;
}

// Helper function to validate token for specific step
function isValidToken(userIP, token, requiredStep = 3) {
  if (!tokenStorage[userIP]) {
    return false;
  }
  
  const tokenData = tokenStorage[userIP];
  
  // Check if token matches and is not expired and has completed required steps
  return tokenData.token === token && 
         !isTokenExpired(tokenData) && 
         tokenData.step >= requiredStep;
}

// Helper function to clean up expired tokens
function cleanupExpiredTokens() {
  const now = new Date();
  Object.keys(tokenStorage).forEach(ip => {
    if (tokenStorage[ip] && now > tokenStorage[ip].expires) {
      delete tokenStorage[ip];
    }
  });
}

// Helper function to check if generate page access is expired (5 minutes)
function isGeneratePageExpired(userIP) {
  if (!generatePageAccess[userIP]) {
    return true;
  }
  
  const now = new Date();
  const accessTime = generatePageAccess[userIP].accessTime;
  const timePassed = (now - accessTime) / 1000; // seconds
  
  return timePassed >= 5 * 60; // 5 minutes
}

// ========== NEW API ENDPOINTS FOR ROBLOX SCRIPT ==========

// API endpoint: /api/validate - For Roblox script pattern 1
app.get('/api/validate', (req, res) => {
  try {
    const { key } = req.query;
    
    console.log(`[API VALIDATE] Validating key: ${key}`);
    
    // Set proper JSON header
    res.setHeader('Content-Type', 'application/json');
    
    if (!key) {
      console.log('[API VALIDATE] No key provided');
      return res.json({
        status: 'INVALID',
        message: 'Key parameter is required'
      });
    }
    
    // Find the key in storage
    let foundKey = null;
    let foundIP = null;
    
    Object.keys(keyStorage).forEach(ip => {
      if (keyStorage[ip] && keyStorage[ip].key === key.toUpperCase()) {
        foundKey = keyStorage[ip];
        foundIP = ip;
      }
    });
    
    if (!foundKey) {
      console.log(`[API VALIDATE] Key not found: ${key}`);
      return res.json({
        status: 'INVALID',
        message: 'Invalid key provided'
      });
    }
    
    // Check if key is expired
    if (isKeyExpired(foundKey)) {
      // Remove expired key
      delete keyStorage[foundIP];
      console.log(`[API VALIDATE] Key expired: ${key}`);
      return res.json({
        status: 'EXPIRED',
        message: 'Key has expired'
      });
    }
    
    // Key is valid
    console.log(`[API VALIDATE] Key valid: ${key}`);
    res.json({
      status: 'VALID',
      message: 'Key verified successfully',
      validated_at: Math.floor(Date.now() / 1000),
      expires_in: Math.floor((foundKey.expires - new Date()) / 1000)
    });
    
  } catch (error) {
    console.error('Error in /api/validate:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Internal server error'
    });
  }
});

// API endpoint: /api/key/:key - For Roblox script pattern 2
app.get('/api/key/:key', (req, res) => {
  try {
    const { key } = req.params;
    
    console.log(`[API KEY] Validating key: ${key}`);
    
    // Set proper JSON header
    res.setHeader('Content-Type', 'application/json');
    
    if (!key) {
      return res.json({
        valid: false,
        reason: 'No key provided'
      });
    }
    
    // Find the key in storage
    let foundKey = null;
    
    Object.keys(keyStorage).forEach(ip => {
      if (keyStorage[ip] && keyStorage[ip].key === key.toUpperCase()) {
        foundKey = keyStorage[ip];
      }
    });
    
    if (!foundKey || isKeyExpired(foundKey)) {
      return res.json({
        valid: false,
        reason: foundKey ? 'Key expired' : 'Invalid key'
      });
    }
    
    // Key is valid
    res.json({
      valid: true,
      timestamp: Math.floor(Date.now() / 1000),
      expires_at: Math.floor(foundKey.expires.getTime() / 1000)
    });
    
  } catch (error) {
    console.error('Error in /api/key/:key:', error);
    res.status(500).json({
      valid: false,
      reason: 'Internal server error'
    });
  }
});

// API endpoint: /api?action=validate&key=XXX - For Roblox script pattern 3
app.get('/api', (req, res) => {
  try {
    const { action, key } = req.query;
    
    console.log(`[API] Action: ${action}, Key: ${key}`);
    
    // Set proper JSON header
    res.setHeader('Content-Type', 'application/json');
    
    if (action === 'validate') {
      if (!key) {
        return res.json({
          success: false,
          error: 'Key parameter is required'
        });
      }
      
      // Find the key in storage
      let foundKey = null;
      
      Object.keys(keyStorage).forEach(ip => {
        if (keyStorage[ip] && keyStorage[ip].key === key.toUpperCase()) {
          foundKey = keyStorage[ip];
        }
      });
      
      if (!foundKey || isKeyExpired(foundKey)) {
        return res.json({
          success: false,
          error: foundKey ? 'Key expired' : 'Invalid key'
        });
      }
      
      // Key is valid
      res.json({
        success: true,
        message: 'Key verified successfully',
        validated_at: Math.floor(Date.now() / 1000)
      });
    } else {
      res.json({
        success: false,
        error: 'Invalid action parameter'
      });
    }
    
  } catch (error) {
    console.error('Error in /api:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// API endpoint: /check - For Roblox script pattern 4
app.get('/check', (req, res) => {
  try {
    const { key } = req.query;
    
    console.log(`[CHECK] Validating key: ${key}`);
    
    // Set proper JSON header
    res.setHeader('Content-Type', 'application/json');
    
    if (!key) {
      return res.send('invalid');
    }
    
    // Find the key in storage
    let foundKey = null;
    
    Object.keys(keyStorage).forEach(ip => {
      if (keyStorage[ip] && keyStorage[ip].key === key.toUpperCase()) {
        foundKey = keyStorage[ip];
      }
    });
    
    if (!foundKey || isKeyExpired(foundKey)) {
      return res.send('invalid');
    }
    
    // Key is valid - return simple text response
    res.send('valid');
    
  } catch (error) {
    console.error('Error in /check:', error);
    res.send('error');
  }
});

// ========== EXISTING ENDPOINTS (UNCHANGED) ==========

// Endpoint: /getkey (requires valid token and generate page access)
app.get('/getkey', (req, res) => {
  try {
    const userIP = req.realIP;
    const { token } = req.query;
    
    console.log(`[GET KEY] Request from IP: ${userIP}`);
    
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

    if (!isValidToken(userIP, token)) {
      return res.status(403).json({
        error: 'Forbidden: Invalid or expired token'
      });
    }

    // Check if generate page access has expired (5 minutes)
    if (isGeneratePageExpired(userIP)) {
      return res.status(403).json({
        error: 'Generate key access has expired. Please complete verification steps again.'
      });
    }

    const now = new Date();
    const expirationTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    // Check if user already has a key
    if (keyStorage[userIP]) {
      const existingKey = keyStorage[userIP];
      
      // If key is still valid, return it (anti-refresh protection)
      if (!isKeyExpired(existingKey)) {
        console.log(`[GET KEY] Returning existing key for IP: ${userIP}`);
        return res.json({
          key: existingKey.key,
          expires: existingKey.expires.toISOString(),
          isExisting: true
        });
      } else {
        // Key expired, remove it
        delete keyStorage[userIP];
      }
    }
    
    // Generate new key
    const newKey = generateKey();
    
    // Store the new key
    keyStorage[userIP] = {
      key: newKey,
      expires: expirationTime,
      created: now
    };
    
    console.log(`[GET KEY] Generated new key: ${newKey} for IP: ${userIP}`);
    
    // Return the new key
    res.json({
      key: newKey,
      expires: expirationTime.toISOString(),
      isExisting: false
    });
    
  } catch (error) {
    console.error('Error in /getkey:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Endpoint: /validate - EXISTING VERSION (UNCHANGED)
app.get('/validate', (req, res) => {
  try {
    const { key } = req.query;
    
    console.log(`[VALIDATE] Validating key: ${key}`);
    
    // Set proper JSON header
    res.setHeader('Content-Type', 'application/json');
    
    if (!key) {
      console.log('[VALIDATE] No key provided');
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
      console.log(`[VALIDATE] Key not found: ${key}`);
      return res.json({
        status: 'INVALID'
      });
    }
    
    // Check if key is expired
    if (isKeyExpired(foundKey)) {
      // Remove expired key
      delete keyStorage[foundIP];
      console.log(`[VALIDATE] Key expired: ${key}`);
      return res.json({
        status: 'EXPIRED'
      });
    }
    
    // Key is valid
    console.log(`[VALIDATE] Key valid: ${key}`);
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

// Step1 page
app.get('/step1', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Step2 page  
app.get('/step2', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Step3 page
app.get('/step3', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Generate key page
app.get('/generate-key-secure-xyz', (req, res) => {
  const userIP = req.realIP;
  
  if (!userIP) {
    return res.status(400).send('Unable to identify user IP address');
  }

  // Set generate page access time (5 minute timer starts)
  const now = new Date();
  generatePageAccess[userIP] = {
    accessTime: now
  };

  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Verify endpoint - handles token validation and step progression
app.get('/verify', (req, res) => {
  try {
    const userIP = req.realIP;
    const { token, step, bypass } = req.query;
    
    if (!userIP) {
      return res.status(400).json({
        error: 'Unable to identify user IP address'
      });
    }

    const now = new Date();
    const tokenExpirationTime = new Date(now.getTime() + 60 * 60 * 1000); // 60 minutes

    // If no token provided, this means user is starting fresh
    if (!token) {
      const newToken = generateToken();
      
      // Store the new token with step 0
      tokenStorage[userIP] = {
        token: newToken,
        expires: tokenExpirationTime,
        created: now,
        step: 0
      };
      
      // Redirect to step1 with token
      return res.redirect(`/step1?token=${newToken}`);
    }
    
    // If step parameter is provided, this means user completed a vertise step
    if (step) {
      const stepNumber = parseInt(step);
      
      // Anti-bypass validation: check if bypass token is provided and valid
      if (!bypass || bypass !== ANTI_BYPASS_TOKEN) {
        return res.status(403).json({
          error: 'Invalid bypass token. Please complete the verification step properly.'
        });
      }
      
      if (tokenStorage[userIP] && tokenStorage[userIP].token === token) {
        // Additional validation: user can only advance one step at a time
        const currentStep = tokenStorage[userIP].step;
        if (stepNumber !== currentStep + 1) {
          return res.status(403).json({
            error: 'Invalid step progression. Please complete steps in order.'
          });
        }
        
        // Update step progress
        tokenStorage[userIP].step = stepNumber;
        tokenStorage[userIP].expires = new Date(now.getTime() + 60 * 60 * 1000); // Extend expiry
        
        // Redirect based on completed step
        if (stepNumber === 1) {
          return res.redirect(`/step2?token=${token}`);
        } else if (stepNumber === 2) {
          return res.redirect(`/step3?token=${token}`);
        } else if (stepNumber === 3) {
          return res.redirect(`/step3?token=${token}&completed=true`);
        }
        
        return res.redirect(`/step1?token=${token}`);
      } else {
        return res.status(403).json({
          error: 'Invalid user token'
        });
      }
    }
    
    // If token is provided for validation, check current step
    if (tokenStorage[userIP] && tokenStorage[userIP].token === token && !isTokenExpired(tokenStorage[userIP])) {
      return res.json({
        valid: true,
        step: tokenStorage[userIP].step,
        message: 'Token is valid'
      });
    } else {
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

// Status endpoint for healthcheck - MODIFIED
app.get('/status', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  console.log('[STATUS] Health check requested');
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'ClavnnX Key System',
    version: '1.0.0'
  });
});

// Endpoint for getting system stats (optional, for debugging)
app.get('/stats', (req, res) => {
  try {
    // Clean up expired keys before showing stats
    cleanupExpiredKeys();
    
    const activeKeys = Object.keys(keyStorage).length;
    const activeTokens = Object.keys(tokenStorage).length;
    const now = new Date();
    
    res.json({
      active_keys: activeKeys,
      active_tokens: activeTokens,
      server_time: now.toISOString(),
      uptime: process.uptime()
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
    available_endpoints: [
      '/getkey', '/validate', '/verify', '/', '/step1', '/step2', '/step3', 
      '/generate-key-secure-xyz', '/stats', '/status',
      '/api/validate', '/api/key/:key', '/api', '/check'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error'
  });
});

// Periodic cleanup of expired keys and tokens (every hour)
setInterval(() => {
  cleanupExpiredKeys();
  cleanupExpiredTokens();
  console.log('Cleaned up expired keys and tokens');
}, 60 * 60 * 1000);

// For local development (Replit)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClavnnX Key System API server running on port ${PORT}`);
    console.log(`Access at: http://localhost:${PORT}`);
  });
}

// Export app for Vercel
module.exports = app;
