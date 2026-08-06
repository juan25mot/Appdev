// Netlify Function: Validate Token
// GET /.netlify/functions/validate
// Header: Authorization: Bearer <token>
// Response: { role: "admin" } o 401

function base64UrlDecode(str) {
  return Buffer.from(str, 'base64url').toString();
}

async function verifyJWT(token, secret) {
  const [h, b, s] = token.split('.');
  if (!h || !b || !s) throw new Error('Invalid token');

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );

  const sigBytes = Uint8Array.from(
    Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64'),
    c => c
  );
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(h + '.' + b));
  if (!valid) throw new Error('Invalid signature');

  return JSON.parse(base64UrlDecode(b));
}

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const auth = event.headers.authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    const jwtSecret = process.env.JWT_SECRET;

    if (!token || !jwtSecret) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const payload = await verifyJWT(token, jwtSecret);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ role: payload.role })
    };
  } catch (err) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Token inválido o expirado' }) };
  }
};