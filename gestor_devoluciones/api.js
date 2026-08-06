// ============================================
// API.JS - Cliente del frontend para Netlify Functions
// Nunca habla directamente con Turso
// ============================================

var API_BASE = '/.netlify/functions';

// Helper para fetch con token
function _fetch(path, options) {
  options = options || {};
  options.headers = options.headers || {};

  var token = localStorage.getItem('devoluciones_token');
  if (token) {
    options.headers['Authorization'] = 'Bearer ' + token;
  }

  if (options.body && typeof options.body === 'object') {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  return fetch(API_BASE + path, options).then(function(res) {
    if (res.status === 401) {
      // Token expirado o inválido
      window.dispatchEvent(new CustomEvent('api:unauthorized'));
      return Promise.reject(new Error('Sesión expirada'));
    }
    if (!res.ok) {
      return res.json().then(function(data) {
        throw new Error(data.error || 'Error del servidor');
      }).catch(function() {
        throw new Error('Error del servidor');
      });
    }
    return res.json();
  });
}

// ============================================
// AUTENTICACIÓN
// ============================================
function apiLogin(password) {
  return _fetch('/login', { method: 'POST', body: { password: password } });
}

function apiValidate() {
  return _fetch('/validate', { method: 'GET' });
}

// ============================================
// CONCEPTOS (CRUD)
// ============================================
function getConceptos() {
  return _fetch('/conceptos', { method: 'GET' });
}

function addConcepto(motivo, concepto) {
  return _fetch('/conceptos', { method: 'POST', body: { motivo: motivo, concepto: concepto } });
}

function updateConcepto(id, motivo, concepto) {
  return _fetch('/conceptos?id=' + encodeURIComponent(id), {
    method: 'PUT',
    body: { motivo: motivo, concepto: concepto }
  });
}

function deleteConcepto(id) {
  return _fetch('/conceptos?id=' + encodeURIComponent(id), { method: 'DELETE' });
}