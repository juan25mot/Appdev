// ============================================
// CONFIGURACIÓN TURSO — REEMPLAZA ESTOS VALORES
// ============================================
var TURSO_DB_URL = 'https://devoluciones-juan-morantes.aws-ap-northeast-1.turso.io';
var TURSO_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODUyNzE4MDEsImlkIjoiMDE5ZmFhMzMtNjQwMS03NmUwLTg5NmMtMGJlNzgyY2QzZWI3Iiwia2lkIjoiZEdKd3VybTJzMUhaMzVmYlU3V2lna052dGdEYXVlajJDbnl2WmpFZEZBYyIsInJpZCI6IjU5MGQyYjM4LTA4NWYtNDE3Yi04ZGI3LTAwYzMyZWI1NGE1ZiJ9.9rWT03A4fYObwWUvNxJ4W3yY6vqOMUi0tX83CXIp8T4yOJ7nWphsomtgRxpXEPIYNztt9RtwuLrvxblzmFuIDQ';

// ============================================
// CLIENTE HTTP PARA TURSO
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

function tursoQuery(sql, args) {
  args = args || [];
  return fetch(TURSO_DB_URL + '/v2/pipeline', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + TURSO_AUTH_TOKEN,
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
  })
  .then(function(response) {
    if (!response.ok) {
      return response.text().then(function(errText) {
        throw new Error('Turso HTTP ' + response.status + ': ' + errText);
      });
    }
    return response.json();
  })
  .then(function(data) {
    if (data.results && data.results[0] && data.results[0].type === 'error') {
      throw new Error('Turso error: ' + JSON.stringify(data.results[0].error));
    }

    var result = data.results && data.results[0] && data.results[0].response && data.results[0].response.result;

    if (result && result.rows) {
      return result.rows.map(function(row) {
        var obj = {};
        result.cols.forEach(function(col, idx) {
          var cell = row[idx];
          var value = cell ? cell.value : null;
          
          // Convertir id a número entero
          if (col.name === 'id' && value !== null) {
            value = parseInt(value, 10);
          }
          
          obj[col.name] = value;
        });
        return obj;
      });
    }

    if (result && result.affected_row_count !== undefined) {
      return {
        affectedRows: result.affected_row_count,
        lastInsertRowid: result.last_insert_rowid
      };
    }

    return data;
  });
}

// ============================================
// CRUD DE CONCEPTOS
// ============================================
function getConceptos() {
  return tursoQuery('SELECT * FROM conceptos ORDER BY id DESC');
}

function addConcepto(motivo, concepto) {
  return tursoQuery(
    'INSERT INTO conceptos (motivo, concepto) VALUES (?, ?)',
    [motivo, concepto]
  );
}

function updateConcepto(id, motivo, concepto) {
  return tursoQuery(
    'UPDATE conceptos SET motivo = ?, concepto = ? WHERE id = ?',
    [motivo, concepto, id]
  );
}

function deleteConcepto(id) {
  return tursoQuery('DELETE FROM conceptos WHERE id = ?', [id]);
}

console.log('✅ turso.js cargado');