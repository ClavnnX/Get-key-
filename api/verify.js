import { verifyKey } from './key.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }
  
  try {
    const { key } = req.query;
    
    console.log(`[VERIFY] Request received for key: ${key}`);
    
    if (!key) {
      return res.status(400).json({
        success: false,
        status: 'INVALID',
        error: 'Key parameter is required'
      });
    }
    
    const result = await verifyKey(key);
    
    console.log(`[VERIFY] Key verification result: ${result.status}`);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        status: result.status,
        expires_at: result.expires_at,
        created_at: result.created_at
      });
    } else {
      res.status(200).json({
        success: false,
        status: result.status,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('[VERIFY] Unexpected error:', error);
    res.status(500).json({
      success: false,
      status: 'ERROR',
      error: 'Internal server error'
    });
  }
}
