// Netlify Function: Login
// POST /.netlify/functions/login
// Body: { password: "..." }
// Response: { token: "jwt...", role: "admin" } o 401

function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64url');
}

async function signJWT(payload, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(header + '.' + body));
  const sigStr = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  return header + '.' + body + '.' + sigStr;
}

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { password } = JSON.parse(event.body || '{}');
    const adminPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!adminPassword || !jwtSecret) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server config error' }) };
    }

    if (password !== adminPassword) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Contraseña incorrecta' }) };
    }

    const token = await signJWT({ role: 'admin', iat: Math.floor(Date.now() / 1000) }, jwtSecret);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ token, role: 'admin' })
    };
  } catch (err) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: err.message }) };
  }
};