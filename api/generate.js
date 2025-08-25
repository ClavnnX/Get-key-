import { generateKey } from './key.js';

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
    console.log('[GENERATE] Request received');
    
    const result = await generateKey();
    
    if (result.success) {
      console.log(`[GENERATE] Key generated successfully: ${result.key}`);
      res.status(200).json({
        success: true,
        key: result.key,
        expires_at: result.expires_at,
        status: result.status
      });
    } else {
      console.error('[GENERATE] Failed to generate key:', result.error);
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('[GENERATE] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
