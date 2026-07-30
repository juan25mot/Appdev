// ============================================
// APP.JS - LOGIN (ADMIN/INVITADO) + MODO OSCURO
// ============================================

console.log('🚀 app.js iniciando...');

// ============================================
// CONFIGURACIÓN
// ============================================
var ADMIN_PASSWORD = 'admin2024'; // <-- CAMBIA ESTA CONTRASEÑA

document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ DOM cargado completamente');

  // ============================================
  // VARIABLES GLOBALES
  // ============================================
  var items = [];
  var editingId = null;
  var deletingId = null;
  var currentRole = null; // 'admin' | 'guest'

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

  // Botones admin
  var elBtnNuevo = document.getElementById('btnNuevo');
  var elBtnRecargar = document.getElementById('btnRecargar');

  console.log('📌 Elementos DOM:', {
    list: !!elList,
    search: !!elSearch,
    modal: !!elModal,
    modalConfirm: !!elModalConfirm,
    inputMotivo: !!elInputMotivo,
    inputConcepto: !!elInputConcepto
  });

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
      if (theme === 'dark') {
        elIconSun.style.display = 'block';
        elIconMoon.style.display = 'none';
      } else {
        elIconSun.style.display = 'none';
        elIconMoon.style.display = 'block';
      }
    }
    console.log('🌙 Tema aplicado:', theme);
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    showToast(next === 'dark' ? 'Modo oscuro activado' : 'Modo claro activado', 'success');
  }

  // ============================================
  // AUTENTICACIÓN
  // ============================================
  function checkSession() {
    var saved = localStorage.getItem('devoluciones_role');
    if (saved === 'admin' || saved === 'guest') {
      currentRole = saved;
      showApp();
      return true;
    }
    showLogin();
    return false;
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
    showApp();
    showToast('Bienvenido, modo Invitado', 'success');
  }

  function loginAsAdmin() {
    var pwd = elInputPassword.value.trim();
    if (pwd === ADMIN_PASSWORD) {
      currentRole = 'admin';
      localStorage.setItem('devoluciones_role', 'admin');
      showApp();
      showToast('Bienvenido, Administrador', 'success');
    } else {
      elLoginError.textContent = 'Contraseña incorrecta';
      elInputPassword.classList.add('error');
      setTimeout(function() { elInputPassword.classList.remove('error'); }, 2000);
    }
  }

  function logout() {
    currentRole = null;
    localStorage.removeItem('devoluciones_role');
    items = [];
    elList.innerHTML = '';
    showLogin();
    showToast('Sesión cerrada', 'success');
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
  // EVENT LISTENERS - LOGIN
  // ============================================
  elBtnLoginGuest.addEventListener('click', loginAsGuest);
  elBtnLoginAdmin.addEventListener('click', loginAsAdmin);
  elInputPassword.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') loginAsAdmin();
  });
  elBtnLogout.addEventListener('click', logout);

  // ============================================
  // EVENT LISTENERS - TEMA
  // ============================================
  if (elBtnThemeToggle) {
    elBtnThemeToggle.addEventListener('click', toggleTheme);
  }

  // ============================================
  // EVENT LISTENERS - APP
  // ============================================
  elBtnNuevo.addEventListener('click', function() {
    console.log('🔘 btnNuevo clickeado');
    openModal();
  });

  document.getElementById('btnCerrarModal').addEventListener('click', closeModal);
  document.getElementById('btnCancelar').addEventListener('click', closeModal);

  document.getElementById('btnGuardar').addEventListener('click', function() {
    console.log('🔘 btnGuardar clickeado');
    saveItem();
  });

  elBtnRecargar.addEventListener('click', function() {
    console.log('🔘 btnRecargar clickeado');
    loadData();
  });

  document.getElementById('btnCancelarEliminar').addEventListener('click', closeConfirmModal);

  document.getElementById('btnConfirmarEliminar').addEventListener('click', function() {
    console.log('🔘 btnConfirmarEliminar clickeado');
    confirmDelete();
  });

  elSearch.addEventListener('input', render);

  elModal.addEventListener('click', function(e) {
    if (e.target.id === 'modal') closeModal();
  });

  elModalConfirm.addEventListener('click', function(e) {
    if (e.target.id === 'modalConfirm') closeConfirmModal();
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeModal();
      closeConfirmModal();
    }
  });

  // ============================================
  // DELEGACIÓN DE EVENTOS
  // ============================================
  if (elList) {
    elList.addEventListener('click', function(e) {
      console.log('📦 Click detectado en #list');
      var btn = e.target.closest('button');
      if (!btn) {
        console.log('   ❌ No es un botón');
        return;
      }

      var rawId = btn.getAttribute('data-id');
      var id = parseInt(rawId, 10);
      console.log('   → raw data-id:', rawId, '| parseInt:', id);

      if (!id || isNaN(id)) {
        console.log('   ❌ ID inválido');
        return;
      }

      if (btn.classList.contains('btn-copy')) {
        console.log('   ✅ Ejecutando COPY id=' + id);
        copyConcept(id);
      } else if (btn.classList.contains('btn-edit')) {
        if (!canEditDelete()) {
          showToast('No tienes permisos para editar', 'error');
          return;
        }
        console.log('   ✅ Ejecutando EDIT id=' + id);
        editItem(id);
      } else if (btn.classList.contains('btn-delete')) {
        if (!canEditDelete()) {
          showToast('No tienes permisos para eliminar', 'error');
          return;
        }
        console.log('   ✅ Ejecutando DELETE id=' + id);
        promptDelete(id);
      } else {
        console.log('   ⚠️ Botón sin clase reconocida');
      }
    });
    console.log('✅ Listener de delegación agregado a #list');
  } else {
    console.error('❌ #list no existe en el DOM');
  }

  // ============================================
  // CRUD CON TURSO
  // ============================================
  function loadData() {
    console.log('🔄 loadData() iniciado');
    elList.innerHTML = '<div class="empty-state"><p>⏳ Cargando desde Turso...</p></div>';

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
          '<h3 style="margin-top:0;">❌ Error al conectar con Turso</h3>' +
          '<p><strong>Mensaje:</strong> ' + escapeHtml(err.message) + '</p>' +
          '<p style="font-size:0.85rem;margin-bottom:0;">' +
          'Revisa:<br>1. ¿URL y token en turso.js son correctos?<br>' +
          '2. ¿La tabla "conceptos" existe en Turso?<br>' +
          '3. Presiona F12 → Console para más detalles.</p></div>';
        showToast('Error de conexión', 'error');
      });
  }

  function render() {
    console.log('🎨 render() - items:', items.length, '| search:', elSearch.value);
    var q = normalizeText(elSearch.value);
    var filtered = items.filter(function(it) {
      var m = normalizeText(it.motivo);
      var c = normalizeText(it.concepto);
      return m.indexOf(q) !== -1 || c.indexOf(q) !== -1;
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

      var adminButtons = '';
      if (canEditDelete()) {
        adminButtons =
          '<button class="btn-edit" data-id="' + it.id + '">✏️ Editar</button>' +
          '<button class="btn-delete" data-id="' + it.id + '">🗑️ Eliminar</button>';
      }

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
    console.log('🎨 render() completado - tarjetas:', filtered.length);
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
    if (!canEditDelete()) {
      showToast('No tienes permisos para crear conceptos', 'error');
      return;
    }
    console.log('📂 openModal()');
    editingId = null;
    clearErrors();
    elModalTitle.textContent = 'Nuevo Concepto';
    elInputMotivo.value = '';
    elInputConcepto.value = '';
    elModal.classList.add('active');
    elInputMotivo.focus();
  }

  function closeModal() {
    console.log('📂 closeModal()');
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
    console.log('💾 saveItem() - editingId:', editingId);
    if (!canEditDelete()) {
      showToast('No tienes permisos para guardar', 'error');
      return;
    }
    if (!validate()) {
      showToast('Completa los campos obligatorios', 'error');
      return;
    }
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
        console.error('❌ ERROR en saveItem:', err);
        showToast('Error al guardar: ' + err.message, 'error');
      });
  }

  function editItem(id) {
    console.log('✏️ editItem(' + id + ')');
    var it = items.find(function(x) { return x.id == id; });
    if (!it) {
      console.log('   ❌ No encontrado en items');
      return;
    }
    editingId = id;
    clearErrors();
    elModalTitle.textContent = 'Editar Concepto';
    elInputMotivo.value = it.motivo;
    elInputConcepto.value = it.concepto;
    elModal.classList.add('active');
  }

  function promptDelete(id) {
    console.log('🗑️ promptDelete(' + id + ')');
    var it = items.find(function(x) { return x.id == id; });
    if (!it) {
      console.log('   ❌ No encontrado en items');
      return;
    }
    deletingId = id;
    elConfirmText.textContent = '¿Eliminar permanentemente "' + it.motivo + '"?';
    elModalConfirm.classList.add('active');
  }

  function closeConfirmModal() {
    console.log('📂 closeConfirmModal()');
    elModalConfirm.classList.remove('active');
    deletingId = null;
  }

  function confirmDelete() {
    console.log('🗑️ confirmDelete() - deletingId:', deletingId);
    if (!deletingId) {
      console.log('   ❌ No hay deletingId');
      return;
    }
    deleteConcepto(deletingId)
      .then(function() {
        showToast('Concepto eliminado', 'success');
        return loadData();
      })
      .catch(function(err) {
        console.error('❌ ERROR en confirmDelete:', err);
        showToast('Error al eliminar: ' + err.message, 'error');
      })
      .finally(function() {
        closeConfirmModal();
      });
  }

  function copyConcept(id) {
    console.log('📋 copyConcept(' + id + ')');
    var it = items.find(function(x) { return x.id == id; });
    if (!it) {
      console.log('   ❌ No encontrado en items');
      return;
    }
    var text = it.concepto;
    console.log('   📋 Texto a copiar (' + text.length + ' chars)');
    navigator.clipboard.writeText(text).then(function() {
      showToast('Copiado al portapapeles', 'success');
    }).catch(function(err) {
      console.error('   ❌ Error al copiar:', err);
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
  console.log('🚀 Iniciando checkSession()...');
  checkSession();

}); // fin DOMContentLoaded