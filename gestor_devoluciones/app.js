// ============================================
// APP.JS - LOGIN REAL CON NETLIFY FUNCTIONS + MODO OSCURO
// ============================================

console.log('🚀 app.js iniciando...');

document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ DOM cargado completamente');

  // ============================================
  // VARIABLES GLOBALES
  // ============================================
  var items = [];
  var editingId = null;
  var deletingId = null;
  var currentRole = null;

  // ============================================
  // REFERENCIAS DOM - LOGIN
  // ============================================
  var elLoginScreen = document.getElementById('loginScreen');
  var elAppContainer = document.getElementById('appContainer');
  var elInputPassword = document.getElementById('inputPassword');
  var elLoginError = document.getElementById('loginError');
  var elBtnLoginGuest = document.getElementById('btnLoginGuest');
  var elBtnLoginAdmin = document.getElementById('btnLoginAdmin');
  var elBtnLogout = document.getElementById('btnLogout');
  var elUserRoleBadge = document.getElementById('userRoleBadge');

  // ============================================
  // REFERENCIAS DOM - TEMA
  // ============================================
  var elBtnThemeToggle = document.getElementById('btnThemeToggle');
  var elIconSun = document.getElementById('iconSun');
  var elIconMoon = document.getElementById('iconMoon');

  // ============================================
  // REFERENCIAS DOM - APP
  // ============================================
  var elList = document.getElementById('list');
  var elSearch = document.getElementById('searchInput');
  var elModal = document.getElementById('modal');
  var elModalConfirm = document.getElementById('modalConfirm');
  var elModalTitle = document.getElementById('modalTitle');
  var elInputMotivo = document.getElementById('inputMotivo');
  var elInputConcepto = document.getElementById('inputConcepto');
  var elConfirmText = document.getElementById('confirmText');
  var elStatTotal = document.getElementById('stat-total');
  var elStatShowing = document.getElementById('stat-showing');
  var elBtnNuevo = document.getElementById('btnNuevo');
  var elBtnRecargar = document.getElementById('btnRecargar');

  // ============================================
  // TEMA (MODO OSCURO)
  // ============================================
  function initTheme() {
    var savedTheme = localStorage.getItem('devoluciones_theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = savedTheme || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('devoluciones_theme', theme);
    if (elIconSun && elIconMoon) {
      elIconSun.style.display = theme === 'dark' ? 'block' : 'none';
      elIconMoon.style.display = theme === 'dark' ? 'none' : 'block';
    }
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    showToast(next === 'dark' ? 'Modo oscuro activado' : 'Modo claro activado', 'success');
  }

  // ============================================
  // AUTENTICACIÓN REAL (con servidor)
  // ============================================
  function checkSession() {
    var savedRole = localStorage.getItem('devoluciones_role');
    var savedToken = localStorage.getItem('devoluciones_token');

    if (!savedRole || !savedToken) {
      showLogin();
      return;
    }

    // Validar token con el servidor
    apiValidate()
      .then(function(data) {
        currentRole = data.role || savedRole;
        showApp();
      })
      .catch(function(err) {
        console.error('Token inválido:', err);
        forceLogout();
        showToast('Sesión expirada. Por favor inicia sesión de nuevo.', 'error');
      });
  }

  function showLogin() {
    elLoginScreen.style.display = 'flex';
    elAppContainer.classList.add('hidden');
    elInputPassword.value = '';
    elLoginError.textContent = '';
  }

  function showApp() {
    elLoginScreen.style.display = 'none';
    elAppContainer.classList.remove('hidden');
    updateUIBasedOnRole();
    loadData();
  }

  function loginAsGuest() {
    currentRole = 'guest';
    localStorage.setItem('devoluciones_role', 'guest');
    localStorage.removeItem('devoluciones_token');
    showApp();
    showToast('Bienvenido, modo Invitado', 'success');
  }

  function loginAsAdmin() {
    var pwd = elInputPassword.value.trim();
    if (!pwd) {
      elLoginError.textContent = 'Ingresa la contraseña';
      return;
    }

    apiLogin(pwd)
      .then(function(data) {
        currentRole = data.role;
        localStorage.setItem('devoluciones_role', data.role);
        localStorage.setItem('devoluciones_token', data.token);
        showApp();
        showToast('Bienvenido, Administrador', 'success');
      })
      .catch(function(err) {
        elLoginError.textContent = err.message || 'Contraseña incorrecta';
        elInputPassword.classList.add('error');
        setTimeout(function() { elInputPassword.classList.remove('error'); }, 2000);
      });
  }

  function logout() {
    currentRole = null;
    localStorage.removeItem('devoluciones_role');
    localStorage.removeItem('devoluciones_token');
    items = [];
    elList.innerHTML = '';
    showLogin();
    showToast('Sesión cerrada', 'success');
  }

  function forceLogout() {
    currentRole = null;
    localStorage.removeItem('devoluciones_role');
    localStorage.removeItem('devoluciones_token');
    items = [];
    showLogin();
  }

  function updateUIBasedOnRole() {
    if (currentRole === 'admin') {
      elUserRoleBadge.textContent = 'Administrador';
      elUserRoleBadge.classList.add('admin');
    } else {
      elUserRoleBadge.textContent = 'Invitado';
      elUserRoleBadge.classList.remove('admin');
    }

    if (elBtnNuevo) elBtnNuevo.style.display = currentRole === 'admin' ? 'inline-flex' : 'none';
    if (elBtnRecargar) elBtnRecargar.style.display = currentRole === 'admin' ? 'inline-flex' : 'none';
  }

  function canEditDelete() {
    return currentRole === 'admin';
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================
  elBtnLoginGuest.addEventListener('click', loginAsGuest);
  elBtnLoginAdmin.addEventListener('click', loginAsAdmin);
  elInputPassword.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') loginAsAdmin();
  });
  elBtnLogout.addEventListener('click', logout);
  if (elBtnThemeToggle) elBtnThemeToggle.addEventListener('click', toggleTheme);

  // Escuchar evento de token expirado desde api.js
  window.addEventListener('api:unauthorized', function() {
    forceLogout();
    showToast('Sesión expirada. Por favor inicia sesión de nuevo.', 'error');
  });

  // App listeners
  elBtnNuevo.addEventListener('click', function() { openModal(); });
  document.getElementById('btnCerrarModal').addEventListener('click', closeModal);
  document.getElementById('btnCancelar').addEventListener('click', closeModal);
  document.getElementById('btnGuardar').addEventListener('click', saveItem);
  elBtnRecargar.addEventListener('click', loadData);
  document.getElementById('btnCancelarEliminar').addEventListener('click', closeConfirmModal);
  document.getElementById('btnConfirmarEliminar').addEventListener('click', confirmDelete);
  elSearch.addEventListener('input', render);

  elModal.addEventListener('click', function(e) {
    if (e.target.id === 'modal') closeModal();
  });
  elModalConfirm.addEventListener('click', function(e) {
    if (e.target.id === 'modalConfirm') closeConfirmModal();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { closeModal(); closeConfirmModal(); }
  });

  // Delegación de eventos en lista
  if (elList) {
    elList.addEventListener('click', function(e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var id = parseInt(btn.getAttribute('data-id'), 10);
      if (!id || isNaN(id)) return;

      if (btn.classList.contains('btn-copy')) {
        copyConcept(id);
      } else if (btn.classList.contains('btn-edit')) {
        if (!canEditDelete()) { showToast('No tienes permisos para editar', 'error'); return; }
        editItem(id);
      } else if (btn.classList.contains('btn-delete')) {
        if (!canEditDelete()) { showToast('No tienes permisos para eliminar', 'error'); return; }
        promptDelete(id);
      }
    });
  }

  // ============================================
  // CRUD (ahora via Netlify Functions)
  // ============================================
  function loadData() {
    console.log('🔄 loadData() iniciado');
    elList.innerHTML = '<div class="empty-state"><p>⏳ Cargando conceptos...</p></div>';

    getConceptos()
      .then(function(data) {
        items = data;
        console.log('📥 Datos recibidos:', items.length, 'conceptos');
        render();
        showToast('Cargados ' + items.length + ' conceptos', 'success');
      })
      .catch(function(err) {
        console.error('❌ ERROR en loadData:', err);
        elList.innerHTML =
          '<div style="background:#fee2e2;border:1px solid #fecaca;border-radius:10px;padding:20px;color:#991b1b;">' +
          '<h3 style="margin-top:0;">❌ Error al cargar datos</h3>' +
          '<p><strong>Mensaje:</strong> ' + escapeHtml(err.message) + '</p>' +
          '<p style="font-size:0.85rem;margin-bottom:0;">Revisa la consola (F12) para más detalles.</p></div>';
        showToast('Error de conexión', 'error');
      });
  }

  function render() {
    var q = normalizeText(elSearch.value);
    var filtered = items.filter(function(it) {
      return normalizeText(it.motivo).indexOf(q) !== -1 || normalizeText(it.concepto).indexOf(q) !== -1;
    });

    elStatTotal.textContent = items.length;
    elStatShowing.textContent = filtered.length;

    if (filtered.length === 0) {
      elList.innerHTML =
        '<div class="empty-state">' +
        '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
        '<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>' +
        '<p>' + (items.length === 0 ? 'La base de datos está vacía.' : 'No se encontraron coincidencias.') + '</p></div>';
      return;
    }

    var html = filtered.map(function(it) {
      var motivoHtml = escapeHtml(it.motivo);
      var conceptoHtml = escapeHtml(it.concepto);
      if (q) {
        motivoHtml = highlightText(motivoHtml, q);
        conceptoHtml = highlightText(conceptoHtml, q);
      }
      var adminButtons = canEditDelete()
        ? '<button class="btn-edit" data-id="' + it.id + '">✏️ Editar</button>' +
          '<button class="btn-delete" data-id="' + it.id + '">🗑️ Eliminar</button>'
        : '';

      return '<div class="card">' +
        '<div class="card-header"><div class="card-title">' + motivoHtml + '</div>' +
        '<span class="badge">#' + it.id + '</span></div>' +
        '<div class="card-body">' + conceptoHtml + '</div>' +
        '<div class="card-actions">' +
        '<button class="btn-copy" data-id="' + it.id + '">📋 Copiar</button>' +
        adminButtons +
        '</div></div>';
    }).join('');

    elList.innerHTML = html;
  }

  // ============================================
  // UTILIDADES
  // ============================================
  function normalizeText(text) {
    return (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  function highlightText(html, q) {
    var terms = q.split(/\s+/).filter(function(t) { return t.length > 1; });
    if (terms.length === 0) return html;
    var result = html;
    terms.forEach(function(term) {
      var safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var re = new RegExp('(' + safe + ')', 'gi');
      result = result.replace(re, '<span class="highlight">$1</span>');
    });
    return result;
  }

  // ============================================
  // MODALES
  // ============================================
  function openModal() {
    if (!canEditDelete()) { showToast('No tienes permisos', 'error'); return; }
    editingId = null;
    clearErrors();
    elModalTitle.textContent = 'Nuevo Concepto';
    elInputMotivo.value = '';
    elInputConcepto.value = '';
    elModal.classList.add('active');
    elInputMotivo.focus();
  }

  function closeModal() {
    elModal.classList.remove('active');
    editingId = null;
    clearErrors();
  }

  function clearErrors() {
    elInputMotivo.classList.remove('error');
    elInputConcepto.classList.remove('error');
  }

  function validate() {
    clearErrors();
    var valid = true;
    if (!elInputMotivo.value.trim()) { elInputMotivo.classList.add('error'); valid = false; }
    if (!elInputConcepto.value.trim()) { elInputConcepto.classList.add('error'); valid = false; }
    return valid;
  }

  function saveItem() {
    if (!canEditDelete()) { showToast('No tienes permisos', 'error'); return; }
    if (!validate()) { showToast('Completa los campos obligatorios', 'error'); return; }

    var motivo = elInputMotivo.value.trim();
    var concepto = elInputConcepto.value.trim();
    var promise = editingId
      ? updateConcepto(editingId, motivo, concepto)
      : addConcepto(motivo, concepto);

    promise
      .then(function() {
        showToast(editingId ? 'Concepto actualizado' : 'Concepto agregado', 'success');
        closeModal();
        return loadData();
      })
      .catch(function(err) {
        showToast('Error al guardar: ' + err.message, 'error');
      });
  }

  function editItem(id) {
    var it = items.find(function(x) { return x.id == id; });
    if (!it) return;
    editingId = id;
    clearErrors();
    elModalTitle.textContent = 'Editar Concepto';
    elInputMotivo.value = it.motivo;
    elInputConcepto.value = it.concepto;
    elModal.classList.add('active');
  }

  function promptDelete(id) {
    var it = items.find(function(x) { return x.id == id; });
    if (!it) return;
    deletingId = id;
    elConfirmText.textContent = '¿Eliminar permanentemente "' + it.motivo + '"?';
    elModalConfirm.classList.add('active');
  }

  function closeConfirmModal() {
    elModalConfirm.classList.remove('active');
    deletingId = null;
  }

  function confirmDelete() {
    if (!deletingId) return;
    deleteConcepto(deletingId)
      .then(function() {
        showToast('Concepto eliminado', 'success');
        return loadData();
      })
      .catch(function(err) {
        showToast('Error al eliminar: ' + err.message, 'error');
      })
      .finally(function() {
        closeConfirmModal();
      });
  }

  function copyConcept(id) {
    var it = items.find(function(x) { return x.id == id; });
    if (!it) return;
    navigator.clipboard.writeText(it.concepto).then(function() {
      showToast('Copiado al portapapeles', 'success');
    }).catch(function() {
      showToast('No se pudo copiar', 'error');
    });
  }

  function showToast(msg, type) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast ' + (type || '');
    requestAnimationFrame(function() { t.classList.add('show'); });
    setTimeout(function() { t.classList.remove('show'); }, 2500);
  }

  // ============================================
  // INICIAR
  // ============================================
  initTheme();
  checkSession();
});