const express = require('express');
const path = require('path');

// Import key management functions from key.js
const {
  generateKeyForUser,
  validateKeyFromSupabase,
  cleanupExpiredKeys,
  getKeyStats
} = require('./key.js');

const app = express();

// Trust proxy for Vercel
app.set('trust proxy', true);

// ========== CORS MIDDLEWARE ==========
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

// In-memory storage for verification tokens (unchanged)
const tokenStorage = {};

// In-memory storage for generate page access (unchanged)
const generatePageAccess = {};

// Anti-bypass token from vertise (unchanged)
const ANTI_BYPASS_TOKEN = '1c3c210b0a6101cfb3b20619b480a70598dbca6e0b60567c73a6472557d077c7';

// Helper functions for token management (unchanged)
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  const crypto = require('crypto');
  const randomBytes = crypto.randomBytes(32);
  
  for (let i = 0; i < 32; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  
  return result;
}

function isTokenExpired(tokenData) {
  return new Date() > tokenData.expires;
}

function isValidToken(userIP, token, requiredStep = 3) {
  if (!tokenStorage[userIP]) {
    return false;
  }
  
  const tokenData = tokenStorage[userIP];
  
  return tokenData.token === token && 
         !isTokenExpired(tokenData) && 
         tokenData.step >= requiredStep;
}

function cleanupExpiredTokens() {
  const now = new Date();
  Object.keys(tokenStorage).forEach(ip => {
    if (tokenStorage[ip] && now > tokenStorage[ip].expires) {
      delete tokenStorage[ip];
    }
  });
}

function isGeneratePageExpired(userIP) {
  if (!generatePageAccess[userIP]) {
    return true;
  }
  
  const now = new Date();
  const accessTime = generatePageAccess[userIP].accessTime;
  const timePassed = (now - accessTime) / 1000; // seconds
  
  return timePassed >= 8 * 60; // 8 minutes (sesuai dengan HTML)
}

// ========== MODIFIED: /getkey endpoint - now uses Supabase ==========
app.get('/getkey', async (req, res) => {
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

    // Check if generate page access has expired (8 minutes)
    if (isGeneratePageExpired(userIP)) {
      return res.status(403).json({
        error: 'Generate key access has expired. Please complete verification steps again.'
      });
    }

    // ========== NEW: Use Supabase for key generation ==========
    const keyResult = await generateKeyForUser(userIP);
    
    if (!keyResult.success) {
      console.error(`[GET KEY] Failed to generate key for IP: ${userIP}`, keyResult.error);
      return res.status(500).json({
        error: 'Failed to generate API key. Please try again.'
      });
    }
    
    console.log(`[GET KEY] ${keyResult.isExisting ? 'Returned existing' : 'Generated new'} key for IP: ${userIP}`);
    
    // Return the key with expiration info
    res.json({
      key: keyResult.key,
      expires: keyResult.data.expires_at,
      isExisting: keyResult.isExisting || false
    });
    
  } catch (error) {
    console.error('Error in /getkey:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// ========== MODIFIED: /validate endpoint - now uses Supabase ==========
app.get('/validate', async (req, res) => {
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
    
    // ========== NEW: Use Supabase for key validation ==========
    const validationResult = await validateKeyFromSupabase(key);
    
    console.log(`[VALIDATE] Key ${key}: ${validationResult.status}`);
    
    res.json({
      status: validationResult.status
    });
    
  } catch (error) {
    console.error('Error in /validate:', error);
    res.status(500).json({
      error: 'Internal server error',
      status: 'INVALID'
    });
  }
});

// ========== UNCHANGED: Static pages ==========
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/step1', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/step2', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/step3', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/generate-key-secure-xyz', (req, res) => {
  const userIP = req.realIP;
  
  if (!userIP) {
    return res.status(400).send('Unable to identify user IP address');
  }

  // Set generate page access time (8 minute timer starts)
  const now = new Date();
  generatePageAccess[userIP] = {
    accessTime: now
  };

  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// ========== UNCHANGED: Verify endpoint ==========
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

    if (!token) {
      const newToken = generateToken();
      
      tokenStorage[userIP] = {
        token: newToken,
        expires: tokenExpirationTime,
        created: now,
        step: 0
      };
      
      return res.redirect(`/step1?token=${newToken}`);
    }
    
    if (step) {
      const stepNumber = parseInt(step);
      
      if (!bypass || bypass !== ANTI_BYPASS_TOKEN) {
        return res.status(403).json({
          error: 'Invalid bypass token. Please complete the verification step properly.'
        });
      }
      
      if (tokenStorage[userIP] && tokenStorage[userIP].token === token) {
        const currentStep = tokenStorage[userIP].step;
        if (stepNumber !== currentStep + 1) {
          return res.status(403).json({
            error: 'Invalid step progression. Please complete steps in order.'
          });
        }
        
        tokenStorage[userIP].step = stepNumber;
        tokenStorage[userIP].expires = new Date(now.getTime() + 60 * 60 * 1000);
        
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

// ========== MODIFIED: Status endpoint with Supabase info ==========
app.get('/status', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    console.log('[STATUS] Health check requested');
    
    // Get key statistics from Supabase
    const statsResult = await getKeyStats();
    
    const response = {
      status: 'online',
      timestamp: new Date().toISOString(),
      service: 'ClavnnX Key System',
      version: '2.0.0',
      storage: 'Supabase'
    };
    
    if (statsResult.success) {
      response.key_stats = statsResult.stats;
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error in /status:', error);
    res.json({
      status: 'online',
      timestamp: new Date().toISOString(),
      service: 'ClavnnX Key System',
      version: '2.0.0',
      storage: 'Supabase',
      error: 'Stats unavailable'
    });
  }
});

// ========== NEW: Cleanup endpoint for maintenance ==========
app.get('/cleanup', async (req, res) => {
  try {
    // Clean up expired tokens (in-memory)
    cleanupExpiredTokens();
    
    // Clean up expired keys (in Supabase)
    const cleanupResult = await cleanupExpiredKeys();
    
    if (cleanupResult.success) {
      res.json({
        success: true,
        message: 'Cleanup completed',
        expired_keys_cleaned: cleanupResult.cleaned || 0
      });
    } else {
      res.status(500).json({
        success: false,
        error: cleanupResult.error
      });
    }
  } catch (error) {
    console.error('Error in /cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Cleanup failed'
    });
  }
});

// ========== MODIFIED: Stats endpoint with Supabase data ==========
app.get('/stats', async (req, res) => {
  try {
    // Get stats from Supabase
    const statsResult = await getKeyStats();
    
    const response = {
      active_tokens: Object.keys(tokenStorage).length,
      server_time: new Date().toISOString(),
      uptime: process.uptime(),
      storage: 'Supabase'
    };
    
    if (statsResult.success) {
      response.key_stats = statsResult.stats;
    } else {
      response.key_stats_error = statsResult.error;
    }
    
    res.json(response);
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
    available_endpoints: ['/getkey', '/validate', '/verify', '/', '/step1', '/step2', '/step3', '/generate-key-secure-xyz', '/stats', '/status', '/cleanup']
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error'
  });
});

// Periodic cleanup of expired tokens (every hour)
setInterval(() => {
  cleanupExpiredTokens();
  console.log('Cleaned up expired tokens');
}, 60 * 60 * 1000);

// Periodic cleanup of expired keys from Supabase (every 6 hours)
setInterval(async () => {
  try {
    const cleanupResult = await cleanupExpiredKeys();
    if (cleanupResult.success) {
      console.log(`Cleaned up ${cleanupResult.cleaned} expired keys from Supabase`);
    }
  } catch (error) {
    console.error('Error during periodic cleanup:', error);
  }
}, 6 * 60 * 60 * 1000);

// For local development (Replit)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClavnnX Key System API server running on port ${PORT}`);
    console.log(`Access at: http://localhost:${PORT}`);
    console.log('Using Supabase for key storage');
  });
}

// Export app for Vercel
module.exports = app;
