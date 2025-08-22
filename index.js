const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();

// Trust proxy (biar IP dari Vercel terbaca benar)
app.set('trust proxy', true);

// Serve static files (CSS/JS/HTML)
app.use(express.static('public'));

// Middleware ambil IP
app.use(express.json());
app.use((req, res, next) => {
  req.realIP = req.headers['x-forwarded-for'] ||
               req.headers['x-real-ip'] ||
               req.connection.remoteAddress ||
               req.socket.remoteAddress ||
               (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
               req.ip;

  if (req.realIP && req.realIP.includes(',')) {
    req.realIP = req.realIP.split(',')[0].trim();
  }
  next();
});

// In-memory storage untuk keys
// Format: { ip: { key: string, expires: Date, created: Date } }
const keyStorage = {};

// Helper generate random key
function generateKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const randomBytes = crypto.randomBytes(10);
  for (let i = 0; i < 10; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

// Cek expired
function isKeyExpired(keyData) {
  return new Date() > keyData.expires;
}

// Endpoint ambil key
app.get('/getkey', (req, res) => {
  const ip = req.realIP;

  let keyData = keyStorage[ip];
  if (keyData && !isKeyExpired(keyData)) {
    return res.json({
      success: true,
      key: keyData.key,
      expires: keyData.expires,
    });
  }

  const newKey = generateKey();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 jam
  keyData = { key: newKey, expires, created: new Date() };
  keyStorage[ip] = keyData;

  return res.json({
    success: true,
    key: newKey,
    expires,
  });
});

// Endpoint utama → kirim index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// ⚠️ PENTING untuk Vercel: jangan app.listen()
// Cukup export app
module.exports = app;
