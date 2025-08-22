const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();

// Trust proxy for Vercel
app.set('trust proxy', true);

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

// HTML content embedded (since we can't use separate files easily in Vercel functions)
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ClavnnX Get key</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #000000 !important;
            color: #ffffff;
        }
        .container {
            background: #222222 !important;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(255,255,255,0.2);
            border: 2px solid #444444;
        }
        h1 {
            text-align: center;
            color: #ffffff !important;
            margin-bottom: 30px;
            font-size: 28px;
            font-weight: bold;
        }
        button {
            width: 100%;
            padding: 15px;
            font-size: 16px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 15px;
            font-weight: bold;
        }
        #btnContinue, #btnGen {
            background: #007bff;
            color: white;
        }
        #btnContinue:hover, #btnGen:hover {
            background: #0056b3;
        }
        #btnContinue:disabled, #btnGen:disabled {
            background: #6c757d;
            cursor: not-allowed;
        }
        #btnCopy {
            background: #28a745;
            color: white;
            display: none;
        }
        #btnCopy:hover {
            background: #1e7e34;
        }
        #out {
            background: #2d2d2d;
            border: 1px solid #444444;
            border-radius: 8px;
            padding: 20px;
            min-height: 100px;
            font-family: 'Courier New', monospace;
            white-space: pre-wrap;
            word-break: break-all;
            margin-bottom: 15px;
            color: #ffffff;
        }
        .loading {
            opacity: 0.6;
            pointer-events: none;
        }
        @media (max-width: 600px) {
            body { padding: 10px; }
            .container { padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>ClavnnX Get key</h1>
        <button id="btnContinue">Complete the step</button>
        <div id="out">Click "Complete the step" to proceed through verification steps</div>
        <button id="btnCopy" style="display: none;">Copy Key</button>
    </div>

    <script>
        const btnContinue = document.getElementById('btnContinue');
        const btnCopy = document.getElementById('btnCopy');
        const output = document.getElementById('out');
        let currentKey = '';

        const VERTISE_TOKEN = '6457aac2196b55786323be0f9d8580cc1dd63627c32d6d5e34fc74cfaee18c88';

        function getVertiseToken() {
            return VERTISE_TOKEN;
        }

        const currentPath = window.location.pathname;
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (currentPath === '/') {
            handleHomepage();
        } else if (currentPath === '/step1') {
            handleStep1();
        } else if (currentPath === '/step2') {
            handleStep2();
        } else if (currentPath === '/step3') {
            handleStep3();
        } else if (currentPath === '/generate') {
            handleGenerate();
        }

        function handleHomepage() {
            btnContinue.textContent = 'Complete the step';
            output.textContent = 'Welcome to ClavnnX Key System!\\n\\nTo get your API key, you need to complete 3 verification steps.\\n\\nClick "Complete the step" to begin the verification process.';
            
            btnContinue.addEventListener('click', () => {
                window.location.href = '/api/start-verification';
            });
        }

        function handleStep1() {
            if (!token) {
                window.location.href = '/';
                return;
            }
            
            verifyTokenAndProceed(token, 0, () => {
                btnContinue.textContent = 'Continue 1/3';
                output.textContent = 'Verification Step 1 of 3\\n\\nYou are now ready to complete the first verification step.\\n\\nClick "Continue 1/3" to open the first verification link.';
                
                btnContinue.addEventListener('click', () => {
                    const callbackURL = encodeURIComponent(\`\${window.location.origin}/api/callback/step1?user_ref=\${token}&token=\${getVertiseToken()}\`);
                    const vertiseURL = \`https://link-target.net/1385845/1NJw6vONwDd5?url=\${callbackURL}\`;
                    
                    output.textContent = 'Opening verification link...\\n\\nPlease complete the verification on the opened page.\\n\\nAfter completion, you will be automatically redirected to the next step.';
                    btnContinue.textContent = 'Verification in Progress...';
                    btnContinue.disabled = true;
                    
                    window.location.href = vertiseURL;
                });
            });
        }

        function handleStep2() {
            if (!token) {
                window.location.href = '/';
                return;
            }
            
            verifyTokenAndProceed(token, 1, () => {
                btnContinue.textContent = 'Continue 2/3';
                output.textContent = 'Step 1 completed successfully! ✓\\n\\nVerification Step 2 of 3\\n\\nClick "Continue 2/3" to open the second verification link.';
                
                btnContinue.addEventListener('click', () => {
                    const callbackURL = encodeURIComponent(\`\${window.location.origin}/api/callback/step2?user_ref=\${token}&token=\${getVertiseToken()}\`);
                    const vertiseURL = \`https://link-target.net/1385845/sCCiJeLQ3BfA?url=\${callbackURL}\`;
                    
                    output.textContent = 'Opening second verification link...\\n\\nPlease complete the verification on the opened page.\\n\\nAfter completion, you will be automatically redirected to the next step.';
                    btnContinue.textContent = 'Verification in Progress...';
                    btnContinue.disabled = true;
                    
                    window.location.href = vertiseURL;
                });
            });
        }

        function handleStep3() {
            if (!token) {
                window.location.href = '/';
                return;
            }
            
            verifyTokenAndProceed(token, 2, () => {
                btnContinue.textContent = 'Continue 3/3';
                output.textContent = 'Step 2 completed successfully! ✓\\n\\nFinal Verification Step 3 of 3\\n\\nClick "Continue 3/3" to open the final verification link.';
                
                btnContinue.addEventListener('click', () => {
                    const callbackURL = encodeURIComponent(\`\${window.location.origin}/api/callback/step3?user_ref=\${token}&token=\${getVertiseToken()}\`);
                    const vertiseURL = \`https://link-hub.net/1385845/0Tpockg8i7RS?url=\${callbackURL}\`;
                    
                    output.textContent = 'Opening final verification link...\\n\\nPlease complete the verification on the opened page.\\n\\nAfter completion, you will be automatically redirected to generate your API key.';
                    btnContinue.textContent = 'Final Verification in Progress...';
                    btnContinue.disabled = true;
                    
                    window.location.href = vertiseURL;
                });
            });
        }

        function handleGenerate() {
            if (!token) {
                window.location.href = '/';
                return;
            }
            
            verifyTokenAndProceed(token, 3, () => {
                btnContinue.textContent = 'Generate Key';
                btnContinue.id = 'btnGen';
                output.textContent = 'Congratulations! All verification steps completed successfully! ✓✓✓\\n\\nYou can now generate your API key.\\n\\nClick "Generate Key" to get your key.';
                
                btnContinue.addEventListener('click', async () => {
                    await generateKey(token);
                });
            });
        }

        async function verifyTokenAndProceed(token, requiredStep, callback) {
            try {
                const response = await fetch(\`/api/verify?token=\${token}\`);
                const data = await response.json();
                
                if (response.ok && data.valid) {
                    if (data.step >= requiredStep) {
                        callback();
                    } else {
                        btnContinue.style.display = 'none';
                        output.textContent = \`❌ Error: Verification incomplete.\\n\\nYou need to complete the previous verification steps properly.\\n\\nCurrent step: \${data.step}, Required: \${requiredStep}\\n\\nPlease start over from the beginning.\\n\\nRedirecting to homepage in 3 seconds...\`;
                        
                        setTimeout(() => {
                            window.location.href = '/';
                        }, 3000);
                    }
                } else {
                    btnContinue.style.display = 'none';
                    output.textContent = '❌ Error: Invalid or expired verification token.\\n\\nPlease start the verification process again.\\n\\nRedirecting to homepage in 3 seconds...';
                    
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 3000);
                }
            } catch (error) {
                btnContinue.style.display = 'none';
                output.textContent = '❌ Error: Unable to verify token.\\n\\nPlease check your internet connection and try again.\\n\\nRedirecting to homepage in 3 seconds...';
                
                setTimeout(() => {
                    window.location.href = '/';
                }, 3000);
            }
        }

        async function generateKey(token) {
            const btnGen = document.getElementById('btnGen') || btnContinue;
            btnGen.disabled = true;
            btnGen.textContent = 'Generating...';
            btnGen.classList.add('loading');
            
            try {
                const response = await fetch(\`/api/getkey?token=\${token}\`);
                const data = await response.json();
                
                if (response.ok) {
                    currentKey = data.key;
                    const expiry = new Date(data.expires);
                    output.textContent = \`SUCCESS! ✓\\n\\nYour API Key: \${data.key}\\n\\nExpires: \${expiry.toLocaleString()}\\n\\nKey is valid for 24 hours from generation.\\n\\nPlease copy and save your key securely.\`;
                    btnCopy.style.display = 'block';
                    btnGen.style.display = 'none';
                } else {
                    output.textContent = \`❌ Error: \${data.error || 'Failed to generate key'}\\n\\nPlease try again or contact support if the problem persists.\`;
                    btnGen.disabled = false;
                    btnGen.textContent = 'Generate Key';
                    btnGen.classList.remove('loading');
                }
            } catch (error) {
                output.textContent = '❌ Error: Unable to generate key.\\n\\nPlease check your internet connection and try again.';
                btnGen.disabled = false;
                btnGen.textContent = 'Generate Key';
                btnGen.classList.remove('loading');
            }
        }

        btnCopy.addEventListener('click', async () => {
            if (currentKey) {
                try {
                    await navigator.clipboard.writeText(currentKey);
                    const originalText = btnCopy.textContent;
                    btnCopy.textContent = 'Copied! ✓';
                    btnCopy.style.background = '#20c997';
                    
                    setTimeout(() => {
                        btnCopy.textContent = originalText;
                        btnCopy.style.background = '#28a745';
                    }, 2000);
                } catch (err) {
                    const textArea = document.createElement('textarea');
                    textArea.value = currentKey;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    textArea.style.top = '-999999px';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    
                    try {
                        document.execCommand('copy');
                        const originalText = btnCopy.textContent;
                        btnCopy.textContent = 'Copied! ✓';
                        btnCopy.style.background = '#20c997';
                        
                        setTimeout(() => {
                            btnCopy.textContent = originalText;
                            btnCopy.style.background = '#28a745';
                        }, 2000);
                    } catch (err) {
                        output.textContent += '\\n\\n⚠️ Copy failed: Please manually select and copy the key above.';
                    }
                    
                    document.body.removeChild(textArea);
                }
            }
        });
    </script>
</body>
</html>`;

// In-memory storage for keys and tokens
const keyStorage = {};
const tokenStorage = {};

// Token Vertise
const VERTISE_TOKEN = '6457aac2196b55786323be0f9d8580cc1dd63627c32d6d5e34fc74cfaee18c88';

// Helper functions
function generateKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  const randomBytes = crypto.randomBytes(10);
  
  for (let i = 0; i < 10; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  
  return result;
}

function isKeyExpired(keyData) {
  return new Date() > keyData.expires;
}

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
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

function findUserIPByToken(token) {
  for (const [ip, tokenData] of Object.entries(tokenStorage)) {
    if (tokenData && tokenData.token === token && !isTokenExpired(tokenData)) {
      return ip;
    }
  }
  return null;
}

// Routes for serving HTML
app.get('/', (req, res) => {
  res.send(htmlContent);
});

app.get('/step1', (req, res) => {
  res.send(htmlContent);
});

app.get('/step2', (req, res) => {
  res.send(htmlContent);
});

app.get('/step3', (req, res) => {
  res.send(htmlContent);
});

app.get('/generate', (req, res) => {
  res.send(htmlContent);
});

// API Routes
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
    
    res.redirect(\`/step1?token=\${newToken}\`);
    
  } catch (error) {
    console.error('Error in /start-verification:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

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

// Callback endpoints
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
        res.redirect(\`/step2?token=\${user_ref}\`);
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
        res.redirect(\`/step3?token=\${user_ref}\`);
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
        res.redirect(\`/generate?token=\${user_ref}\`);
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

app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    server: 'Vercel'
  });
});

app.get('/api/stats', (req, res) => {
  try {
    const activeKeys = Object.keys(keyStorage).length;
    const activeTokens = Object.keys(tokenStorage).length;
    const now = new Date();
    
    res.json({
      active_keys: activeKeys,
      active_verification_tokens: activeTokens,
      server_time: now.toISOString()
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
