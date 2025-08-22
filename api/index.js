const crypto = require('crypto');

// In-memory storage
let keyStorage = new Map();
let tokenStorage = new Map();

// Anti-bypass token
const ANTI_BYPASS_TOKEN = '1c3c210b0a6101cfb3b20619b480a70598dbca6e0b60567c73a6472557d077c7';

// Get real IP helper
function getRealIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         req.ip ||
         '127.0.0.1';
}

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

function isValidToken(userIP, token, requiredStep = 3) {
  if (!tokenStorage.has(userIP)) return false;
  const tokenData = tokenStorage.get(userIP);
  return tokenData.token === token && 
         !isExpired(tokenData) && 
         tokenData.step >= requiredStep;
}

// Main handler function
module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const userIP = getRealIP(req);
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const query = Object.fromEntries(url.searchParams);
  
  console.log(`Request from IP: ${userIP} to ${pathname}`);

  try {
    // Route handling
    if (pathname === '/' || pathname === '/api' || pathname === '/api/') {
      handleHomepage(req, res, query);
    } else if (pathname === '/verify' || pathname === '/api/verify') {
      handleVerify(req, res, userIP, query);
    } else if (pathname === '/getkey' || pathname === '/api/getkey') {
      handleGetKey(req, res, userIP, query);
    } else if (pathname === '/validate' || pathname === '/api/validate') {
      handleValidate(req, res, query);
    } else if (pathname === '/health' || pathname === '/api/health') {
      handleHealth(req, res);
    } else {
      // Redirect unknown routes to homepage
      res.writeHead(302, { Location: '/' });
      res.end();
    }
  } catch (error) {
    console.error('Handler error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
};

function handleHomepage(req, res, query) {
  res.setHeader('Content-Type', 'text/html');
  res.end(`
<!DOCTYPE html>
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
            background: #555555;
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
        .step-info {
            background: #1a1a1a;
            border: 1px solid #333333;
            border-radius: 5px;
            padding: 10px;
            margin-bottom: 15px;
            font-size: 14px;
            color: #cccccc;
        }
        .debug-info {
            background: #0a0a0a;
            border: 1px solid #222222;
            border-radius: 3px;
            padding: 8px;
            margin-bottom: 10px;
            font-size: 11px;
            color: #888888;
            font-family: 'Courier New', monospace;
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
        <div class="step-info" id="stepInfo">
            Loading verification system...
        </div>
        <div class="debug-info" id="debugInfo">
            Initializing...
        </div>
        <button id="btnContinue">Complete the step</button>
        <div id="out">Click "Complete the step" to proceed through verification steps</div>
        <button id="btnCopy" style="display: none;">Copy Key</button>
    </div>

    <script>
        const btnContinue = document.getElementById('btnContinue');
        const btnCopy = document.getElementById('btnCopy');
        const output = document.getElementById('out');
        const stepInfo = document.getElementById('stepInfo');
        const debugInfo = document.getElementById('debugInfo');
        let currentKey = '';
        let retryCount = 0;
        const MAX_RETRIES = 3;

        function updateDebugInfo(info) {
            try {
                const timestamp = new Date().toLocaleTimeString();
                if (debugInfo) {
                    debugInfo.textContent = \`[\${timestamp}] \${info}\`;
                }
                console.log(\`[DEBUG] \${info}\`);
            } catch (e) {
                console.log(\`[DEBUG] \${info}\`);
            }
        }

        function getUrlParams() {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                return {
                    token: urlParams.get('token'),
                    currentStep: urlParams.get('currentstep')
                };
            } catch (e) {
                updateDebugInfo(\`Error parsing URL params: \${e.message}\`);
                return { token: null, currentStep: null };
            }
        }

        const { token, currentStep } = getUrlParams();
        updateDebugInfo(\`Token: \${token ? 'Present' : 'Missing'}, Step: \${currentStep || 'None'}\`);
        
        if (token) {
            updateDebugInfo('Verifying token...');
            verifyToken(token, currentStep);
        } else {
            btnContinue.textContent = 'Complete the step';
            stepInfo.textContent = 'Step 0/3: Initialize verification process';
            output.textContent = 'Click "Complete the step" to start the 3-step verification process';
            updateDebugInfo('Ready to start verification');
            
            btnContinue.addEventListener('click', () => {
                updateDebugInfo('Starting verification process...');
                window.location.href = '/api/verify';
            });
        }

        async function verifyToken(token, currentStepFromURL) {
            try {
                updateDebugInfo('Fetching token validation...');
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                
                const response = await fetch(\`/api/verify?token=\${encodeURIComponent(token)}\`, {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                clearTimeout(timeoutId);
                
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Server did not return JSON response');
                }
                
                const data = await response.json();
                updateDebugInfo(\`Server response: \${response.status}, Valid: \${data.valid}, Step: \${data.step}\`);
                
                if (response.ok && data.valid) {
                    const currentStep = data.step;
                    retryCount = 0;
                    
                    if (currentStep === 0) {
                        btnContinue.textContent = 'Continue 1/3';
                        stepInfo.textContent = 'Step 1/3: First verification step';
                        output.textContent = 'Complete the first verification step to proceed.';
                        updateDebugInfo('Ready for step 1/3');
                        
                        btnContinue.onclick = () => {
                            updateDebugInfo('Redirecting to step 1...');
                            window.open('https://link-hub.net/1385845/0Tpockg8i7RS', '_blank');
                        };
                        
                    } else if (currentStep === 1) {
                        btnContinue.textContent = 'Continue 2/3';
                        stepInfo.textContent = 'Step 2/3: Second verification step';
                        output.textContent = 'Great! Step 1 completed.\\n\\nProceed to the second verification step.';
                        updateDebugInfo('Ready for step 2/3');
                        
                        btnContinue.onclick = () => {
                            updateDebugInfo('Redirecting to step 2...');
                            window.open('https://link-target.net/1385845/sCCiJeLQ3BfA', '_blank');
                        };
                        
                    } else if (currentStep === 2) {
                        btnContinue.textContent = 'Continue 3/3';
                        stepInfo.textContent = 'Step 3/3: Final verification step';
                        output.textContent = 'Excellent! Steps 1 & 2 completed.\\n\\nProceed to the final verification step.';
                        updateDebugInfo('Ready for step 3/3');
                        
                        btnContinue.onclick = () => {
                            updateDebugInfo('Redirecting to step 3...');
                            window.open('https://link-target.net/1385845/1NJw6vONwDd5', '_blank');
                        };
                        
                    } else if (currentStep >= 3) {
                        btnContinue.textContent = 'Generate Key';
                        btnContinue.id = 'btnGen';
                        stepInfo.textContent = 'All steps completed! Ready to generate key.';
                        stepInfo.style.background = '#0f4f0f';
                        stepInfo.style.borderColor = '#28a745';
                        
                        output.textContent = '🎉 Congratulations!\\n\\nAll 3 verification steps completed successfully!\\n\\nClick "Generate Key" to get your API key.';
                        updateDebugInfo('All steps completed, ready to generate key');
                        
                        btnContinue.onclick = async () => {
                            await generateKey(token);
                        };
                    }
                } else {
                    updateDebugInfo(\`Token invalid: \${data.message || 'Unknown reason'}\`);
                    showInvalidTokenError();
                }
            } catch (error) {
                console.error('Fetch error:', error);
                updateDebugInfo(\`Connection error: \${error.message}\`);
                
                if (retryCount < MAX_RETRIES) {
                    retryCount++;
                    updateDebugInfo(\`Retrying... (\${retryCount}/\${MAX_RETRIES})\`);
                    setTimeout(() => {
                        verifyToken(token, currentStepFromURL);
                    }, 2000 * retryCount);
                } else {
                    showConnectionError();
                }
            }
        }

        function showInvalidTokenError() {
            btnContinue.style.display = 'none';
            stepInfo.textContent = 'Error: Invalid verification session';
            stepInfo.style.background = '#4f0f0f';
            stepInfo.style.borderColor = '#dc3545';
            output.textContent = 'Error: Invalid or expired verification token.\\n\\nPlease start the verification process again.';
            updateDebugInfo('Showing invalid token error');
            
            setTimeout(() => {
                btnContinue.style.display = 'block';
                btnContinue.textContent = 'Start Again';
                btnContinue.onclick = () => {
                    updateDebugInfo('Restarting verification...');
                    window.location.href = window.location.origin;
                };
            }, 2000);
        }

        function showConnectionError() {
            btnContinue.style.display = 'none';
            stepInfo.textContent = 'Error: Connection failed';
            stepInfo.style.background = '#4f0f0f';
            stepInfo.style.borderColor = '#dc3545';
            output.textContent = 'Error: Unable to verify token. Please check your connection and try again.\\n\\nThis may be due to server maintenance or network issues.';
            updateDebugInfo('Showing connection error');
            
            setTimeout(() => {
                btnContinue.style.display = 'block';
                btnContinue.textContent = 'Retry';
                btnContinue.onclick = () => {
                    updateDebugInfo('Manual retry initiated');
                    retryCount = 0;
                    window.location.reload();
                };
            }, 3000);
        }

        async function generateKey(token) {
            const btnGen = document.getElementById('btnGen');
            btnGen.disabled = true;
            btnGen.textContent = 'Generating Key...';
            btnGen.classList.add('loading');
            updateDebugInfo('Generating key...');
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
                
                const response = await fetch(\`/api/getkey?token=\${encodeURIComponent(token)}\`, {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                clearTimeout(timeoutId);
                const data = await response.json();
                updateDebugInfo(\`Key generation response: \${response.status}\`);
                
                if (response.ok && data.key) {
                    currentKey = data.key;
                    const expiry = new Date(data.expires);
                    
                    stepInfo.textContent = 'Key generated successfully!';
                    stepInfo.style.background = '#0f4f0f';
                    stepInfo.style.borderColor = '#28a745';
                    
                    output.textContent = \`🔑 Your API Key:\\n\${data.key}\\n\\n⏰ Expires: \${expiry.toLocaleString()}\\n\\n✅ Valid for 24 hours from generation\\n\\nKeep this key safe and do not share it!\`;
                    updateDebugInfo('Key generated successfully');
                    
                    btnCopy.style.display = 'block';
                    btnGen.style.display = 'none';
                } else {
                    stepInfo.textContent = 'Key generation failed';
                    stepInfo.style.background = '#4f0f0f';
                    stepInfo.style.borderColor = '#dc3545';
                    
                    updateDebugInfo(\`Key generation failed: \${data.error}\`);
                    output.textContent = \`❌ Generation Failed!\\n\\nError: \${data.error || 'Unknown error occurred'}\\n\\nPlease try again or contact support.\`;
                    btnCopy.style.display = 'none';
                }
            } catch (error) {
                stepInfo.textContent = 'Connection error during key generation';
                stepInfo.style.background = '#4f0f0f';
                stepInfo.style.borderColor = '#dc3545';
                output.textContent = \`❌ Connection Error!\\n\\nUnable to connect to server for key generation.\\n\\nPlease check your internet connection and try again.\`;
                updateDebugInfo(\`Key generation connection error: \${error.message}\`);
                btnCopy.style.display = 'none';
            }
            
            btnGen.disabled = false;
            btnGen.textContent = 'Generate Key';
            btnGen.classList.remove('loading');
        }

        btnCopy.addEventListener('click', async () => {
            if (currentKey) {
                try {
                    await navigator.clipboard.writeText(currentKey);
                    btnCopy.textContent = '✅ Copied!';
                    btnCopy.style.background = '#155724';
                    updateDebugInfo('Key copied to clipboard successfully');
                    setTimeout(() => {
                        btnCopy.textContent = 'Copy Key';
                        btnCopy.style.background = '#28a745';
                    }, 2000);
                } catch (error) {
                    try {
                        const textArea = document.createElement('textarea');
                        textArea.value = currentKey;
                        textArea.style.position = 'fixed';
                        textArea.style.left = '-999999px';
                        textArea.style.top = '-999999px';
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        
                        btnCopy.textContent = '✅ Copied!';
                        btnCopy.style.background = '#155724';
                        updateDebugInfo('Key copied using fallback method');
                        setTimeout(() => {
                            btnCopy.textContent = 'Copy Key';
                            btnCopy.style.background = '#28a745';
                        }, 2000);
                    } catch (fallbackError) {
                        updateDebugInfo(\`Copy failed: \${fallbackError.message}\`);
                        btnCopy.textContent = '❌ Copy Failed';
                        btnCopy.style.background = '#dc3545';
                        setTimeout(() => {
                            btnCopy.textContent = 'Copy Key';
                            btnCopy.style.background = '#28a745';
                        }, 2000);
                    }
                }
            }
        });

        updateDebugInfo('Page initialization complete');
    </script>
</body>
</html>
  `);
}

function handleVerify(req, res, userIP, query) {
  const { token, bypass } = query;
  
  console.log(\`/verify request from IP: \${userIP}, token: \${token ? 'provided' : 'missing'}, bypass: \${bypass ? 'provided' : 'missing'}\`);
  
  if (!userIP) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Unable to identify user IP address' }));
    return;
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
    
    console.log(\`Generated new token for IP: \${userIP}\`);
    res.writeHead(302, { Location: \`/?token=\${newToken}&currentstep=0\` });
    res.end();
    return;
  }
  
  if (!tokenStorage.has(userIP)) {
    console.log(\`No token found for IP: \${userIP}\`);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ valid: false, message: 'Token not found for this IP' }));
    return;
  }
  
  const userTokenData = tokenStorage.get(userIP);
  
  if (userTokenData.token !== token || isExpired(userTokenData)) {
    console.log(\`Invalid or expired token for IP: \${userIP}\`);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ valid: false, message: 'Invalid or expired token' }));
    return;
  }
  
  if (bypass === ANTI_BYPASS_TOKEN) {
    console.log(\`Valid bypass token received for IP: \${userIP}\`);
    userTokenData.step++;
    userTokenData.lastUpdated = now.toISOString();
    tokenStorage.set(userIP, userTokenData);
    console.log(\`User \${userIP} progressed to step \${userTokenData.step}\`);
    res.writeHead(302, { Location: \`/?token=\${token}&currentstep=\${userTokenData.step}\` });
    res.end();
    return;
  }
  
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ valid: true, step: userTokenData.step, message: 'Token is valid' }));
}

function handleGetKey(req, res, userIP, query) {
  const { token } = query;
  
  console.log(\`/getkey request from IP: \${userIP} with token: \${token ? 'provided' : 'missing'}\`);
  
  if (!userIP) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Unable to identify user IP address' }));
    return;
  }

  if (!token) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Forbidden: Valid token required' }));
    return;
  }

  if (!isValidToken(userIP, token, 3)) {
    console.log(\`Token validation failed for IP: \${userIP}\`);
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Forbidden: All verification steps must be completed' }));
    return;
  }

  const now = new Date();
  const expirationTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  if (keyStorage.has(userIP)) {
    const existingKey = keyStorage.get(userIP);
    if (!isExpired(existingKey)) {
      console.log(\`Returning existing key for IP: \${userIP}\`);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ key: existingKey.key, expires: existingKey.expires }));
      return;
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
  
  console.log(\`Generated new key for IP: \${userIP}\`);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ key: newKey, expires: expirationTime.toISOString() }));
}

function handleValidate(req, res, query) {
  const { key } = query;
  
  if (!key) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'INVALID' }));
    return;
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
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'INVALID' }));
    return;
  }
  
  if (isExpired(foundKey)) {
    keyStorage.delete(foundIP);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'EXPIRED' }));
    return;
  }
  
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ status: 'VALID' }));
}

function handleHealth(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    activeTokens: tokenStorage.size,
    activeKeys: keyStorage.size
  }));
}
