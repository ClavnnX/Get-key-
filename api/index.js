// Vercel serverless function untuk default API route
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
    // API info response
    res.status(200).json({
      success: true,
      message: 'ClavnnX Key System API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        generate: {
          url: '/api/generate',
          method: 'GET',
          description: 'Generate a new 24-hour key'
        },
        verify: {
          url: '/api/verify?key=YOUR_KEY',
          method: 'GET', 
          description: 'Verify an existing key'
        }
      },
      example_responses: {
        generate_success: {
          success: true,
          key: 'RBX1234567890ABC',
          expires_at: '2024-01-01T12:00:00.000Z',
          status: 'valid'
        },
        verify_valid: {
          success: true,
          status: 'VALID',
          expires_at: '2024-01-01T12:00:00.000Z',
          created_at: '2024-01-01T00:00:00.000Z'
        },
        verify_expired: {
          success: false,
          status: 'EXPIRED',
          error: 'Key has expired'
        },
        verify_invalid: {
          success: false,
          status: 'INVALID',
          error: 'Key not found'
        }
      }
    });
    
  } catch (error) {
    console.error('[INDEX] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
