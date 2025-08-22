const crypto = require('crypto');

// In-memory storage (will reset on cold start)
const keyStorage = {};
const tokenStorage = {};

const VERTISE_TOKEN = '6457aac2196b55786323be0f9d8580cc1dd63627c32d6d5e34fc74cfaee18c88';

// HTML template
const htmlTemplate = `<!DOCTYPE html>
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
            background: #000000;
            color: #ffffff;
        }
        .container {
            background: #222222;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(255,255,255,0.2);
            border: 2px solid #444444;
        }
        h1 {
            text-align: center;
            color: #ffffff;
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
            background: #007bff;
            color: white;
        }
        button:hover {
            background: #0056b3;
        }
        button:disabled {
            background: #6c757d;
            cursor: not-allowed;
        }
        #btnCopy {
            background: #28a745;
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
        
        function initializePage() {
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
        }

        function handleHomepage() {
            btnContinue.textContent = 'Complete the step';
            output.textContent = 'Welcome to ClavnnX Key System!\\n\\nTo get your API key, you need to complete 3 verification steps.\\n\\nClick "Complete the step" to begin the verification process.';
            
            btnContinue.onclick = function() {
                window.location.href = '/api/start-verification';
            };
        }

        function handleStep1() {
            if (!token) {
                window.location.href = '/';
                return;
            }
            
            verifyTokenAndProceed(token, 0, function() {
                btnContinue.textContent = 'Continue 1/3';
                output.textContent = 'Verification Step 1 of 3\\n\\nYou are now ready to complete the first verification step.\\n\\nClick "Continue 1/3" to open the first verification link.';
                
                btnContinue.onclick = function() {
                    const callbackURL = encodeURIComponent(window.location.origin + '/api/callback/step1?user_ref=' + token + '&token=' + getVertiseToken());
                    const vertiseURL = 'https://link-target.net/1385845/1NJw6vONwDd5?url=' + callbackURL;
                    
                    output.textContent = 'Opening verification link...\\n\\nPlease complete the verification on the opened page.\\n\\nAfter completion, you will be automatically redirected to the next step.';
                    btnContinue.textContent = 'Verification in Progress...';
                    btnContinue.disabled = true;
                    
                    window.location.href = vertiseURL;
                };
            });
        }

        function handleStep2() {
            if (!token) {
                window.location.href = '/';
                return;
            }
            
            verifyTokenAndProceed(token, 1, function() {
                btnContinue.textContent = 'Continue 2/3';
                output.textContent = 'Step 1 completed successfully! ✓\\n\\nVerification Step 2 of 3\\n\\nClick "Continue 2/3" to open the second verification link.';
                
                btnContinue.onclick = function() {
                    const callbackURL = encodeURIComponent(window.location.origin + '/api/callback/step2?user_ref=' + token + '&token=' + getVertiseToken());
                    const vertiseURL = 'https://link-target.net/1385845/sCCiJeLQ3BfA?url=' + callbackURL;
                    
                    output.textContent = 'Opening second verification link...\\n\\nPlease complete the verification on the opened page.\\n\\nAfter completion, you will be automatically redirected to the next step.';
                    btnContinue.textContent = 'Verification in Progress...';
                    btnContinue.disabled = true;
                    
                    window.location.href = vertiseURL;
                };
            });
        }

        function handleStep3() {
            if (!token) {
                window.location.href = '/';
                return;
            }
            
            verifyTokenAndProceed(token, 2, function() {
                btnContinue.textContent = 'Continue 3/3';
                output.textContent = 'Step 2 completed successfully! ✓\\n\\nFinal Verification Step 3 of 3\\n\\nClick "Continue 3/3" to open the final verification link.';
                
                btnContinue.onclick = function() {
                    const callbackURL = encodeURIComponent(window.location.origin + '/api/callback/step3?user_ref=' + token + '&token=' + getVertiseToken());
                    const vertiseURL = 'https://link-hub.net/1385845/0Tpockg8i7RS?url=' + callbackURL;
                    
                    output.textContent = 'Opening final verification link...\\n\\nPlease complete the verification on the opened page.\\n\\nAfter completion, you will be automatically redirected to generate your API key.';
                    btnContinue.textContent = 'Final Verification in Progress...';
                    btnContinue.disabled = true;
                    
                    window.location.href = vertiseURL;
                };
            });
        }

        function handleGenerate() {
            if (!token) {
                window.location.href = '/';
                return;
            }
            
            verifyTokenAndProceed(token, 3, function() {
                btnContinue.textContent = 'Generate Key';
                output.textContent = 'Congratulations! All verification steps completed successfully! ✓✓✓\\n\\nYou can now generate your API key.\\n\\nClick "Generate Key" to get your key.';
                
                btnContinue.onclick = function() {
                    generateKey(token);
                };
            });
        }

        function verifyTokenAndProceed(token, requiredStep, callback) {
            fetch('/api/verify?token=' + token)
                .then(function(response) {
                    return response.json();
                })
                .then(function(data) {
                    if (data.valid && data.step >= requiredStep) {
                        callback();
                    } else {
                        btnContinue.style.display = 'none';
                        output.textContent = '❌ Error: Verification incomplete.\\n\\nYou need to complete the previous verification steps properly.\\n\\nCurrent step: ' + data.step + ', Required: ' + requiredStep + '\\n\\nPlease start over from the beginning.\\n\\nRedirecting to homepage in 3 seconds...';
                        
                        setTimeout(function() {
                            window.location.href = '/';
                        }, 3000);
                    }
                })
                .catch(function(error) {
                    btnContinue.style.display = 'none';
                    output.textContent = '❌ Error: Unable to verify token.\\n\\nPlease check your internet connection and try again.\\n\\nRedirecting to homepage in 3 seconds...';
                    
                    setTimeout(function() {
                        window.location.href = '/';
                    }, 3000);
                });
        }

        function generateKey(token) {
            btnContinue.disabled = true;
            btnContinue.textContent = 'Generating...';
            
            fetch('/api/getkey?token=' + token)
                .then(function(response) {
                    return response.json();
                })
                .then(function(data) {
                    if (data.key) {
                        currentKey = data.key;
                        const expiry = new Date(data.expires);
                        output.textContent = 'SUCCESS! ✓\\n\\nYour API Key: ' + data.key + '\\n\\nExpires: ' + expiry.toLocaleString() + '\\n\\nKey is valid for 24 hours from generation.\\n\\nPlease copy and save your key securely.';
                        btnCopy.style.display = 'block';
                        btnContinue.style.display = 'none';
                    } else {
                        output.textContent = '❌ Error: ' + (data.error || 'Failed to generate key') + '\\n\\nPlease try again or contact support if the problem persists.';
                        btnContinue.disabled = false;
                        btnContinue.textContent = 'Generate Key';
                    }
                })
                .catch(function(error) {
                    output.textContent = '❌ Error: Unable to generate key.\\n\\nPlease check your internet connection and try again.';
                    btnContinue.disabled = false;
                    btnContinue.textContent = 'Generate Key';
                });
        }

        btnCopy.onclick = function() {
            if (currentKey) {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(currentKey).then(function() {
                        const originalText = btnCopy.textContent;
                        btnCopy.textContent = 'Copied! ✓';
                        btnCopy.style.background = '#20c997';
                        
                        setTimeout(function() {
                            btnCopy.textContent = originalText;
                            btnCopy.style.background = '#28a745';
                        }, 2000);
                    });
                } else {
                    const textArea = document.createElement('textarea');
                    textArea.value = currentKey;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    
                    const originalText = btnCopy.textContent;
                    btnCopy.textContent = 'Copied! ✓';
                    btnCopy.style.background = '#20c997';
                    
                    setTimeout(function() {
                        btnCopy.textContent = originalText;
                        btnCopy.style.background = '#28a745';
                    }, 2000);
                }
            }
        };

        // Initialize page on load
        initializePage();
    </script>
</body>
</html>`;

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

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomBytes = crypto.randomBytes(32);
  for (let i = 0; i < 32; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

function isExpired(data) {
  return new Date() > new Date(data.expires);
}

function getRealIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.ip || 
         '127.0.0.1';
}

function findUserIPByToken(token) {
  for (const [ip, tokenData] of Object.entries(tokenStorage)) {
    if (tokenData && tokenData.token === token && !isExpired(tokenData)) {
      return ip;
    }
  }
  return null;
}

// Main handler function for Vercel
module.exports = (req, res) => {
  try {
    const { method, url } = req;
    const userIP = getRealIP(req);
    
    // Parse URL
    const urlObj = new URL(url, \`http://\${req.headers.host}\`);
    const pathname = urlObj.pathname;
    const query = Object.fromEntries(urlObj.searchParams);

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Route handling
    if (pathname === '/' || pathname === '/step1' || pathname === '/step2' || pathname === '/step3' || pathname === '/generate') {
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(htmlTemplate);
    }

    if (pathname === '/api/start-verification') {
      if (!userIP) {
        return res.status(400).json({ error: 'Unable to identify user IP' });
      }

      const now = new Date();
      const tokenExpirationTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const newToken = generateToken();
      
      tokenStorage[userIP] = {
        token: newToken,
        expires: tokenExpirationTime.toISOString(),
        created: now.toISOString(),
        step: 0
      };
      
      res.setHeader('Location', \`/step1?token=\${newToken}\`);
      return res.status(302).end();
    }

    if (pathname === '/api/verify') {
      const { token } = query;
      
      if (!token) {
        return res.status(400).json({ error: 'Token required' });
      }
      
      if (tokenStorage[userIP] && tokenStorage[userIP].token === token && !isExpired(tokenStorage[userIP])) {
        return res.json({
          valid: true,
          step: tokenStorage[userIP].step,
          expires: tokenStorage[userIP].expires,
          message: 'Token is valid'
        });
      } else {
        return res.json({
          valid: false,
          step: 0,
          message: 'Invalid or expired token'
        });
      }
    }

    if (pathname === '/api/getkey') {
      const { token } = query;
      
      if (!token) {
        return res.status(403).json({
          error: 'Valid token required. Please complete all verification steps first.'
        });
      }

      if (!tokenStorage[userIP] || tokenStorage[userIP].token !== token || tokenStorage[userIP].step < 3 || isExpired(tokenStorage[userIP])) {
        return res.status(403).json({
          error: 'Invalid token or incomplete verification steps. You must complete all 3 verification steps in order.'
        });
      }

      const now = new Date();
      const expirationTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      if (keyStorage[userIP] && !isExpired(keyStorage[userIP])) {
        return res.json({
          key: keyStorage[userIP].key,
          expires: keyStorage[userIP].expires
        });
      }
      
      const newKey = generateKey();
      keyStorage[userIP] = {
        key: newKey,
        expires: expirationTime.toISOString(),
        created: now.toISOString()
      };
      
      return res.json({
        key: newKey,
        expires: expirationTime.toISOString()
      });
    }

    if (pathname === '/api/validate') {
      const { key } = query;
      
      if (!key) {
        return res.json({ status: 'INVALID' });
      }
      
      let foundKey = null;
      let foundIP = null;
      
      for (const [ip, keyData] of Object.entries(keyStorage)) {
        if (keyData && keyData.key === key) {
          foundKey = keyData;
          foundIP = ip;
          break;
        }
      }
      
      if (!foundKey) {
        return res.json({ status: 'INVALID' });
      }
      
      if (isExpired(foundKey)) {
        delete keyStorage[foundIP];
        return res.json({ status: 'EXPIRED' });
      }
      
      return res.json({ status: 'VALID' });
    }

    // Callback endpoints
    if (pathname === '/api/callback/step1') {
      const { user_ref, token } = query;
      
      if (token !== VERTISE_TOKEN) {
        return res.status(403).json({ error: 'Invalid Vertise token' });
      }
      
      if (user_ref) {
        const userIP = findUserIPByToken(user_ref);
        
        if (userIP && tokenStorage[userIP] && tokenStorage[userIP].token === user_ref) {
          if (tokenStorage[userIP].step === 0) {
            tokenStorage[userIP].step = 1;
            tokenStorage[userIP].expires = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
            res.setHeader('Location', \`/step2?token=\${user_ref}\`);
            return res.status(302).end();
          } else {
            return res.status(403).json({ error: 'Invalid step sequence' });
          }
        } else {
          return res.status(400).json({ error: 'Invalid user reference token' });
        }
      } else {
        return res.status(400).json({ error: 'Missing user reference token' });
      }
    }

    if (pathname === '/api/callback/step2') {
      const { user_ref, token } = query;
      
      if (token !== VERTISE_TOKEN) {
        return res.status(403).json({ error: 'Invalid Vertise token' });
      }
      
      if (user_ref) {
        const userIP = findUserIPByToken(user_ref);
        
        if (userIP && tokenStorage[userIP] && tokenStorage[userIP].token === user_ref) {
          if (tokenStorage[userIP].step === 1) {
            tokenStorage[userIP].step = 2;
            tokenStorage[userIP].expires = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
            res.setHeader('Location', \`/step3?token=\${user_ref}\`);
            return res.status(302).end();
          } else {
            return res.status(403).json({ error: 'Step 1 not completed or invalid sequence' });
          }
        } else {
          return res.status(400).json({ error: 'Invalid user reference token' });
        }
      } else {
        return res.status(400).json({ error: 'Missing user reference token' });
      }
    }

    if (pathname === '/api/callback/step3') {
      const { user_ref, token } = query;
      
      if (token !== VERTISE_TOKEN) {
        return res.status(403).json({ error: 'Invalid Vertise token' });
      }
      
      if (user_ref) {
        const userIP = findUserIPByToken(user_ref);
        
        if (userIP && tokenStorage[userIP] && tokenStorage[userIP].token === user_ref) {
          if (tokenStorage[userIP].step === 2) {
            tokenStorage[userIP].step = 3;
            tokenStorage[userIP].expires = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
            res.setHeader('Location', \`/generate?token=\${user_ref}\`);
            return res.status(302).end();
          } else {
            return res.status(403).json({ error: 'Step 2 not completed or invalid sequence' });
          }
        } else {
          return res.status(400).json({ error: 'Invalid user reference token' });
        }
      } else {
        return res.status(400).json({ error: 'Missing user reference token' });
      }
    }

    if (pathname === '/api/status') {
      return res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        server: 'Vercel'
      });
    }

    if (pathname === '/api/stats') {
      const activeKeys = Object.keys(keyStorage).length;
      const activeTokens = Object.keys(tokenStorage).length;
      
      return res.json({
        active_keys: activeKeys,
        active_verification_tokens: activeTokens,
        server_time: new Date().toISOString()
      });
    }

    // 404 for unknown routes
    return res.status(404).json({
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

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
