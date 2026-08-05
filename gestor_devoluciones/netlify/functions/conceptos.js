// Netlify Function: CRUD Conceptos

// GET    /.netlify/functions/conceptos          -> listar todos
// POST   /.netlify/functions/conceptos          -> crear (requiere admin)
// PUT    /.netlify/functions/conceptos?id=X     -> actualizar (requiere admin)
// DELETE /.netlify/functions/conceptos?id=X     -> eliminar (requiere admin)

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

async function getAdminRole(event) {
  const auth = event.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const jwtSecret = process.env.JWT_SECRET;
  if (!token || !jwtSecret) return null;
  try {
    const payload = await verifyJWT(token, jwtSecret);
    return payload.role;
  } catch {
    return null;
  }
}

async function tursoQuery(sql, args = []) {
  const url = process.env.TURSO_URL;
  const token = process.env.TURSO_TOKEN;

  if (!url || !token) throw new Error('Turso config missing');

  const stmt = { sql };
  if (args.length > 0) {
    stmt.args = args.map(arg => {
      if (arg === null || arg === undefined) return { type: 'null' };
      if (typeof arg === 'number') return { type: 'integer', value: arg };
      return { type: 'text', value: String(arg) };
    });
  }

  const res = await fetch(url + '/v2/pipeline', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests: [{ type: 'execute', stmt }, { type: 'close' }] })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Turso request failed');

  const result = data.results[0];
  if (result.type === 'error') throw new Error(result.error.message);

  return result.response.result;
}

function parseRows(result) {
  if (!result.rows) return [];
  const cols = result.cols.map(c => c.name);
  return result.rows.map(row => {
    const obj = {};
    row.forEach((cell, i) => {
      obj[cols[i]] = cell.type === 'null' ? null : cell.value;
    });
    return obj;
  });
}

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  try {
    const method = event.httpMethod;

    // GET es público (cualquiera puede listar)
    if (method === 'GET') {
      const result = await tursoQuery('SELECT id, motivo, concepto FROM conceptos ORDER BY id DESC');
      const rows = parseRows(result);
      return { statusCode: 200, headers, body: JSON.stringify(rows) };
    }

    // POST, PUT, DELETE requieren admin
    const role = await getAdminRole(event);
    if (role !== 'admin') {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Se requiere ser administrador' }) };
    }

    if (method === 'POST') {
      const { motivo, concepto } = JSON.parse(event.body || '{}');
      if (!motivo || !concepto) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'motivo y concepto son requeridos' }) };
      }
      const result = await tursoQuery(
        'INSERT INTO conceptos (motivo, concepto) VALUES (?, ?) RETURNING id, motivo, concepto',
        [motivo, concepto]
      );
      const rows = parseRows(result);
      return { statusCode: 201, headers, body: JSON.stringify(rows[0]) };
    }

    if (method === 'PUT') {
      const id = event.queryStringParameters?.id;
      const { motivo, concepto } = JSON.parse(event.body || '{}');
      if (!id || !motivo || !concepto) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'id, motivo y concepto son requeridos' }) };
      }
      await tursoQuery(
        'UPDATE conceptos SET motivo = ?, concepto = ? WHERE id = ?',
        [motivo, concepto, parseInt(id)]
      );
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (method === 'DELETE') {
      const id = event.queryStringParameters?.id;
      if (!id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'id es requerido' }) };
      }
      await tursoQuery('DELETE FROM conceptos WHERE id = ?', [parseInt(id)]);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};