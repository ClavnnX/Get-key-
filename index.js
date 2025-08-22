const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();

// Trust proxy for Vercel
app.set('trust proxy', true);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

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

// In-memory storage for keys (Note: This will reset on each serverless function cold start)
// For production, consider using a database or Redis
const keyStorage = {};
const tokenStorage = {};

// Token Vertise Anda
const VERTISE_TOKEN = '6457aac2196b55786323be0f9d8580cc1dd63627c32d6d5e34fc74cfaee18c88';

// Helper function to generate random 10-character uppercase key
function generateKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
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

// Helper function to clean up expired keys
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
app.get('/api/getkey', (req, res) => {
  try {
    const userIP = req.realIP;
    const { token } = req.query;
    
    if (!userIP) {
      return res.status(400).json({
        error: 'Unable to identify user IP address'
      });
    }

    if (!token) {
      return res.status(403).json({
        error: 'Forbidden: Valid token required. Please complete all verification steps first.'
      });
    }

    if (!isValidToken(userIP, token, 3)) {
      return res.status(403).json({
        error: 'Forbidden: Invalid token or incomplete verification steps. You must complete all 3 verification steps in order.'
      });
    }

    const now = new Date();
    const expirationTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    if (keyStorage[userIP]) {
      const existingKey = keyStorage[userIP];
      
      if (!isKeyExpired(existingKey)) {
        return res.json({
          key: existingKey.key,
          expires: existingKey.expires.toISOString()
        });
      } else {
        delete keyStorage[userIP];
      }
    }
    
    const newKey = generateKey();
    
    keyStorage[userIP] = {
      key: newKey,
      expires: expirationTime,
      created: now
    };
    
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
app.get('/api/validate', (req, res) => {
  try {
    const { key } = req.query;
    
    if (!key) {
      return res.json({
        status: 'INVALID'
      });
    }
    
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
    
    if (isKeyExpired(foundKey)) {
      delete keyStorage[foundIP];
      return res.json({
        status: 'EXPIRED'
      });
    }
    
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
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// STEP ROUTES
app.get('/step1', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.get('/step2', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.get('/step3', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.get('/generate', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Start verification process
app.get('/api/start-verification', (req, res) => {
  try {
    const userIP = req.realIP;
    
    if (!userIP) {
      return res.status(400).json({
        error: 'Unable to identify user IP address'
      });
    }

    const now = new Date();
    const tokenExpirationTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const newToken = generateToken();
    
    tokenStorage[userIP] = {
      token: newToken,
      expires: tokenExpirationTime,
      created: now,
      step: 0
    };
    
    res.redirect(`/step1?token=${newToken}`);
    
  } catch (error) {
    console.error('Error in /start-verification:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Verify endpoint
app.get('/api/verify', (req, res) => {
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

// Helper function to find user IP by token
function findUserIPByToken(token) {
  for (const [ip, tokenData] of Object.entries(tokenStorage)) {
    if (tokenData && tokenData.token === token && !isTokenExpired(tokenData)) {
      return ip;
    }
  }
  return null;
}

// CALLBACK ENDPOINTS UNTUK VERTISE LINKS
app.get('/api/callback/step1', (req, res) => {
  const { user_ref, token } = req.query;
  
  if (token !== VERTISE_TOKEN) {
    return res.status(403).json({ error: 'Invalid Vertise token' });
  }
  
  if (user_ref) {
    const userIP = findUserIPByToken(user_ref);
    
    if (userIP && tokenStorage[userIP] && tokenStorage[userIP].token === user_ref) {
      if (tokenStorage[userIP].step === 0) {
        tokenStorage[userIP].step = 1;
        tokenStorage[userIP].expires = new Date(Date.now() + 2 * 60 * 60 * 1000);
        res.redirect(`/step2?token=${user_ref}`);
      } else {
        res.status(403).json({ error: 'Invalid step sequence' });
      }
    } else {
      res.status(400).json({ error: 'Invalid user reference token' });
    }
  } else {
    res.status(400).json({ error: 'Missing user reference token' });
  }
});

app.get('/api/callback/step2', (req, res) => {
  const { user_ref, token } = req.query;
  
  if (token !== VERTISE_TOKEN) {
    return res.status(403).json({ error: 'Invalid Vertise token' });
  }
  
  if (user_ref) {
    const userIP = findUserIPByToken(user_ref);
    
    if (userIP && tokenStorage[userIP] && tokenStorage[userIP].token === user_ref) {
      if (tokenStorage[userIP].step === 1) {
        tokenStorage[userIP].step = 2;
        tokenStorage[userIP].expires = new Date(Date.now() + 2 * 60 * 60 * 1000);
        res.redirect(`/step3?token=${user_ref}`);
      } else {
        res.status(403).json({ error: 'Step 1 not completed or invalid sequence' });
      }
    } else {
      res.status(400).json({ error: 'Invalid user reference token' });
    }
  } else {
    res.status(400).json({ error: 'Missing user reference token' });
  }
});

app.get('/api/callback/step3', (req, res) => {
  const { user_ref, token } = req.query;
  
  if (token !== VERTISE_TOKEN) {
    return res.status(403).json({ error: 'Invalid Vertise token' });
  }
  
  if (user_ref) {
    const userIP = findUserIPByToken(user_ref);
    
    if (userIP && tokenStorage[userIP] && tokenStorage[userIP].token === user_ref) {
      if (tokenStorage[userIP].step === 2) {
        tokenStorage[userIP].step = 3;
        tokenStorage[userIP].expires = new Date(Date.now() + 2 * 60 * 60 * 1000);
        res.redirect(`/generate?token=${user_ref}`);
      } else {
        res.status(403).json({ error: 'Step 2 not completed or invalid sequence' });
      }
    } else {
      res.status(400).json({ error: 'Invalid user reference token' });
    }
  } else {
    res.status(400).json({ error: 'Missing user reference token' });
  }
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    server: 'Vercel'
  });
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  try {
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
      '/api/getkey', 
      '/api/validate', 
      '/api/verify',
      '/api/start-verification',
      '/', 
      '/step1', 
      '/step2', 
      '/step3', 
      '/generate',
      '/api/callback/step1',
      '/api/callback/step2',
      '/api/callback/step3',
      '/api/stats', 
      '/api/status'
    ]
  });
});

// Export app for Vercel
module.exports = app;
