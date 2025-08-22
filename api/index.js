const express = require('express');
const crypto = require('crypto');
const path = require('path');
const cors = require('cors');

const app = express();

// Trust proxy for Vercel
app.set('trust proxy', true);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage (better for Vercel)
let keyStorage = new Map();
let tokenStorage = new Map();

// Updated anti-bypass token from vertise
const ANTI_BYPASS_TOKEN = '1c3c210b0a6101cfb3b20619b480a70598dbca6e0b60567c73a6472557d077c7';

// Middleware to get real IP
app.use((req, res, next) => {
  req.realIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
               req.headers['x-real-ip'] || 
               req.connection?.remoteAddress || 
               req.socket?.remoteAddress ||
               req.ip ||
               '127.0.0.1';
  
  console.log(`Request from IP: ${req.realIP} to ${req.path}`);
  next();
});

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
  return new Date() > new Date(keyData.expires);
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
  return new Date() > new Date(tokenData.expires);
}

// Helper function to validate token for specific step
function isValidToken(userIP, token, requiredStep = 3) {
  if (!tokenStorage.has(userIP)) {
    console.log(`No token storage found for IP: ${userIP}`);
    return false;
  }
  
  const tokenData = tokenStorage.get(userIP);
  console.log(`Validating token for IP: ${userIP}, Required step: ${requiredStep}, Current step: ${tokenData.step}`);
  
  return tokenData.token === token && 
         !isTokenExpired(tokenData) && 
         tokenData.step >= requiredStep;
}

// Endpoint: /getkey
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

    if (!token) {
      return res.status(403).json({
        error: 'Forbidden: Valid token required'
      });
    }

    if (!isValidToken(userIP, token, 3)) {
      console.log(`Token validation failed for IP: ${userIP}`);
      return res.status(403).json({
        error: 'Forbidden: All verification steps must be completed'
      });
    }

    const now = new Date();
    const expirationTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    if (keyStorage.has(userIP)) {
      const existingKey = keyStorage.get(userIP);
      if (!isKeyExpired(existingKey)) {
        console.log(`Returning existing key for IP: ${userIP}`);
        return res.json({
          key: existingKey.key,
          expires: existingKey.expires
        });
      } else {
        keyStorage.delete(userIP);
      }
    }
    
    const newKey = generateKey();
    keyStorage.set(userIP, {
      key: newKey,
      expires: expirationTime.toISOString(),
      created: now.toISOString()
    });
    
    console.log(`Generated new key for IP: ${userIP}`);
    
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
      return res.json({ status: 'INVALID' });
    }
    
    let foundKey = null;
    let foundIP = null;
    
    for (let [ip, keyData] of keyStorage) {
      if (keyData && keyData.key === key) {
        foundKey = keyData;
        foundIP = ip;
        break;
      }
    }
    
    if (!foundKey) {
      return res.json({ status: 'INVALID' });
    }
    
    if (isKeyExpired(foundKey)) {
      keyStorage.delete(foundIP);
      return res.json({ status: 'EXPIRED' });
    }
    
    res.json({ status: 'VALID' });
    
  } catch (error) {
    console.error('Error in /validate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Verify endpoint
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
    const tokenExpirationTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    if (!token) {
      const newToken = generateToken();
      tokenStorage.set(userIP, {
        token: newToken,
        expires: tokenExpirationTime.toISOString(),
        created: now.toISOString(),
        step: 0
      });
      
      console.log(`Generated new token for IP: ${userIP}`);
      return res.redirect(`/?token=${newToken}&currentstep=0`);
    }
    
    if (!tokenStorage.has(userIP)) {
      console.log(`No token found for IP: ${userIP}`);
      return res.json({
        valid: false,
        message: 'Token not found for this IP'
      });
    }
    
    const userTokenData = tokenStorage.get(userIP);
    
    if (userTokenData.token !== token || isTokenExpired(userTokenData)) {
      console.log(`Invalid or expired token for IP: ${userIP}`);
      return res.json({
        valid: false,
        message: 'Invalid or expired token'
      });
    }
    
    if (bypass === ANTI_BYPASS_TOKEN) {
      console.log(`Valid bypass token received for IP: ${userIP}`);
      userTokenData.step++;
      userTokenData.lastUpdated = now.toISOString();
      tokenStorage.set(userIP, userTokenData);
      console.log(`User ${userIP} progressed to step ${userTokenData.step}`);
      return res.redirect(`/?token=${token}&currentstep=${userTokenData.step}`);
    }
    
    res.json({
      valid: true,
      step: userTokenData.step,
      message: 'Token is valid'
    });
    
  } catch (error) {
    console.error('Error in /verify:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    activeTokens: tokenStorage.size,
    activeKeys: keyStorage.size
  });
});

// Cleanup every 10 minutes
setInterval(() => {
  const now = new Date();
  for (let [ip, keyData] of keyStorage) {
    if (keyData && now > new Date(keyData.expires)) {
      keyStorage.delete(ip);
    }
  }
  for (let [ip, tokenData] of tokenStorage) {
    if (tokenData && now > new Date(tokenData.expires)) {
      tokenStorage.delete(ip);
    }
  }
  console.log(`Cleanup completed. Active tokens: ${tokenStorage.size}, Active keys: ${keyStorage.size}`);
}, 10 * 60 * 1000);

// Catch all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Export for Vercel
module.exports = app;
