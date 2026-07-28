// ============================================
// CONFIGURACIÓN TURSO — REEMPLAZA ESTOS VALORES
// ============================================
const TURSO_DB_URL = 'https://devoluciones-juan-morantes.aws-ap-northeast-1.turso.io';  // Ej: https://mi-db-miusuario.turso.io
const TURSO_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODUyNzE4MDEsImlkIjoiMDE5ZmFhMzMtNjQwMS03NmUwLTg5NmMtMGJlNzgyY2QzZWI3Iiwia2lkIjoiZEdKd3VybTJzMUhaMzVmYlU3V2lna052dGdEYXVlajJDbnl2WmpFZEZBYyIsInJpZCI6IjU5MGQyYjM4LTA4NWYtNDE3Yi04ZGI3LTAwYzMyZWI1NGE1ZiJ9.9rWT03A4fYObwWUvNxJ4W3yY6vqOMUi0tX83CXIp8T4yOJ7nWphsomtgRxpXEPIYNztt9RtwuLrvxblzmFuIDQ';            // Token generado con: turso db tokens create mi-db

// ============================================
// CLIENTE HTTP PARA TURSO (API v2 Pipeline)
// ============================================

function buildArg(value) {
  if (value === null || value === undefined) return { type: 'null' };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { type: 'integer', value: String(value) };
    return { type: 'float', value: String(value) };
  }
  if (typeof value === 'boolean') return { type: 'integer', value: value ? '1' : '0' };
  return { type: 'text', value: String(value) };
}

async function tursoQuery(sql, args = []) {
  const response = await fetch(`${TURSO_DB_URL}/v2/pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TURSO_AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          type: 'execute',
          stmt: {
            sql: sql,
            args: args.map(buildArg)
          }
        },
        { type: 'close' }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Turso HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();

  if (data.results && data.results[0] && data.results[0].type === 'error') {
    throw new Error(`Turso error: ${JSON.stringify(data.results[0].error)}`);
  }

  const result = data.results?.[0]?.response?.result;

  // SELECT: devuelve filas
  if (result && result.rows) {
    return result.rows.map(row => {
      const obj = {};
      result.cols.forEach((col, idx) => {
        const cell = row[idx];
        obj[col.name] = cell ? cell.value : null;
      });
      return obj;
    });
  }

  // INSERT/UPDATE/DELETE
  if (result && result.affected_row_count !== undefined) {
    return {
      affectedRows: result.affected_row_count,
      lastInsertRowid: result.last_insert_rowid
    };
  }

  return data;
}

// ============================================
// CRUD DE CONCEPTOS
// ============================================

export async function getConceptos() {
  return await tursoQuery('SELECT * FROM conceptos ORDER BY id DESC');
}

export async function addConcepto(motivo, concepto) {
  return await tursoQuery(
    'INSERT INTO conceptos (motivo, concepto) VALUES (?, ?)',
    [motivo, concepto]
  );
}

export async function updateConcepto(id, motivo, concepto) {
  return await tursoQuery(
    'UPDATE conceptos SET motivo = ?, concepto = ? WHERE id = ?',
    [motivo, concepto, id]
  );
}

export async function deleteConcepto(id) {
  return await tursoQuery('DELETE FROM conceptos WHERE id = ?', [id]);
}