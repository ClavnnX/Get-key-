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
// Structure: { ip: { token: string, expires: Date, created: Date, used: boolean } }
const tokenStorage = {};

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

// Helper function to validate token
function isValidToken(userIP, token) {
  if (!tokenStorage[userIP]) {
    return false;
  }
  
  const tokenData = tokenStorage[userIP];
  
  // Check if token matches and is not expired and not used
  return tokenData.token === token && 
         !isTokenExpired(tokenData) && 
         !tokenData.used;
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
        error: 'Forbidden: Valid token required'
      });
    }

    if (!isValidToken(userIP, token)) {
      return res.status(403).json({
        error: 'Forbidden: Invalid or expired token'
      });
    }

    const now = new Date();
    const expirationTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    // Mark token as used
    if (tokenStorage[userIP]) {
      tokenStorage[userIP].used = true;
    }
    
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

// Homepage - serve HTML UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Verify endpoint - handles token validation and generation
app.get('/verify', (req, res) => {
  try {
    const userIP = req.realIP;
    const { token } = req.query;
    
    if (!userIP) {
      return res.status(400).json({
        error: 'Unable to identify user IP address'
      });
    }

    const now = new Date();
    const tokenExpirationTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

    // If no token provided, this means user is coming from Platoboost/Vertise
    // Generate a new verification token for them
    if (!token) {
      const newToken = generateToken();
      
      // Store the new token
      tokenStorage[userIP] = {
        token: newToken,
        expires: tokenExpirationTime,
        created: now,
        used: false
      };
      
      // Redirect to home page with token parameter
      return res.redirect(`/?token=${newToken}`);
    }
    
    // If token is provided, validate it
    if (isValidToken(userIP, token)) {
      return res.json({
        valid: true,
        message: 'Token is valid'
      });
    } else {
      return res.json({
        valid: false,
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
    
    const activeKeys = Object.keys(keyStorage).length;
    const now = new Date();
    
    res.json({
      active_keys: activeKeys,
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
    console.log(`Roblox Key System API server running on port ${PORT}`);
    console.log(`Access at: http://localhost:${PORT}`);
  });
}

// Export app for Vercel
module.exports = app;
