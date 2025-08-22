const express = require('express');
const crypto = require('crypto');
const path = require('path');

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
  
  next();
});

// In-memory storage for keys
// Structure: { ip: { key: string, expires: Date, created: Date } }
const keyStorage = {};

// In-memory storage for verification tokens
// Structure: { ip: { token: string, expires: Date, created: Date, step: number } }
const tokenStorage = {};

// Token Vertise Anda
const VERTISE_TOKEN = '6457aac2196b55786323be0f9d8580cc1dd63627c32d6d5e34fc74cfaee18c88';

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

// Endpoint: /getkey (requires valid token)
app.get('/getkey', (req, res) => {
  try {
    const userIP = req.realIP;
    const { token } = req.query;
    
    if (!userIP) {
      return res.status(400).json({
        error: 'Unable to identify user IP address'
      });
    }

    // Check if token is provided and valid
    if (!token) {
      return res.status(403).json({
        error: 'Forbidden: Valid token required. Please complete all verification steps first.'
      });
    }

    if (!isValidToken(userIP, token)) {
      return res.status(403).json({
        error: 'Forbidden: Invalid or expired token. Please complete all verification steps properly.'
      });
    }

    const now = new Date();
    const expirationTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    // Check if user already has a key
    if (keyStorage[userIP]) {
      const existingKey = keyStorage[userIP];
      
      // If key is still valid, return it
      if (!isKeyExpired(existingKey)) {
        return res.json({
          key: existingKey.key,
          expires: existingKey.expires.toISOString()
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

// Homepage - serve HTML UI (starting point)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// STEP ROUTES - sekarang mengharuskan token
app.get('/step1', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/step2', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/step3', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/generate', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Start verification process - generate token and redirect to step1
app.get('/start-verification', (req, res) => {
  try {
    const userIP = req.realIP;
    
    if (!userIP) {
      return res.status(400).json({
        error: 'Unable to identify user IP address'
      });
    }

    const now = new Date();
    const tokenExpirationTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours untuk proses verifikasi
    const newToken = generateToken();
    
    // Store the new token with step 0 (belum mulai)
    tokenStorage[userIP] = {
      token: newToken,
      expires: tokenExpirationTime,
      created: now,
      step: 0
    };
    
    // Redirect to step1 with token parameter
    res.redirect(`/step1?token=${newToken}`);
    
  } catch (error) {
    console.error('Error in /start-verification:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Verify endpoint - untuk validasi token dan mendapatkan status
app.get('/verify', (req, res) => {
  try {
    const userIP = req.realIP;
    const { token } = req.query;
    
    if (!userIP) {
      return res.status(400).json({
        error: 'Unable to identify user IP address'
      });
    }

    if (!token) {
      return res.status(400).json({
        error: 'Token required'
      });
    }
    
    // Check token validity
    if (tokenStorage[userIP] && tokenStorage[userIP].token === token && !isTokenExpired(tokenStorage[userIP])) {
      return res.json({
        valid: true,
        step: tokenStorage[userIP].step,
        expires: tokenStorage[userIP].expires.toISOString(),
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

// CALLBACK ENDPOINTS UNTUK VERTISE LINKS
// Callback untuk step 1 - setelah selesai vertise pertama
app.get('/callback/step1', (req, res) => {
  const { user_ref, token } = req.query;
  
  // Validasi token Vertise
  if (token !== VERTISE_TOKEN) {
    return res.status(403).json({ error: 'Invalid Vertise token' });
  }
  
  if (user_ref) {
    // Update step ke 1 dan redirect ke step2
    const userIP = req.realIP;
    if (tokenStorage[userIP] && tokenStorage[userIP].token === user_ref) {
      tokenStorage[userIP].step = 1;
      tokenStorage[userIP].expires = new Date(Date.now() + 2 * 60 * 60 * 1000); // Extend expiry
    }
    
    res.redirect(`/step2?token=${user_ref}`);
  } else {
    res.status(400).json({ error: 'Missing user reference token' });
  }
});

// Callback untuk step 2 - setelah selesai vertise kedua
app.get('/callback/step2', (req, res) => {
  const { user_ref, token } = req.query;
  
  // Validasi token Vertise
  if (token !== VERTISE_TOKEN) {
    return res.status(403).json({ error: 'Invalid Vertise token' });
  }
  
  if (user_ref) {
    // Update step ke 2 dan redirect ke step3
    const userIP = req.realIP;
    if (tokenStorage[userIP] && tokenStorage[userIP].token === user_ref) {
      tokenStorage[userIP].step = 2;
      tokenStorage[userIP].expires = new Date(Date.now() + 2 * 60 * 60 * 1000); // Extend expiry
    }
    
    res.redirect(`/step3?token=${user_ref}`);
  } else {
    res.status(400).json({ error: 'Missing user reference token' });
  }
});

// Callback untuk step 3 - setelah selesai vertise ketiga
app.get('/callback/step3', (req, res) => {
  const { user_ref, token } = req.query;
  
  // Validasi token Vertise
  if (token !== VERTISE_TOKEN) {
    return res.status(403).json({ error: 'Invalid Vertise token' });
  }
  
  if (user_ref) {
    // Update step ke 3 dan redirect ke generate
    const userIP = req.realIP;
    if (tokenStorage[userIP] && tokenStorage[userIP].token === user_ref) {
      tokenStorage[userIP].step = 3;
      tokenStorage[userIP].expires = new Date(Date.now() + 2 * 60 * 60 * 1000); // Extend expiry
    }
    
    res.redirect(`/generate?token=${user_ref}`);
  } else {
    res.status(400).json({ error: 'Missing user reference token' });
  }
});

// Status endpoint for healthcheck
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString()
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
      active_verification_tokens: activeTokens,
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
      '/getkey', 
      '/validate', 
      '/verify',
      '/start-verification',
      '/', 
      '/step1', 
      '/step2', 
      '/step3', 
      '/generate', 
      '/callback/step1',
      '/callback/step2',
      '/callback/step3',
      '/stats', 
      '/status'
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

// Periodic cleanup of expired keys and tokens (every 30 minutes)
setInterval(() => {
  cleanupExpiredKeys();
  cleanupExpiredTokens();
  console.log('Cleaned up expired keys and tokens at:', new Date().toISOString());
}, 30 * 60 * 1000);

// For local development (Replit)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClavnnX Key System API server running on port ${PORT}`);
    console.log(`Access at: http://localhost:${PORT}`);
    console.log('Verification links: Ready to be configured');
  });
}

// Export app for Vercel
module.exports = app;
