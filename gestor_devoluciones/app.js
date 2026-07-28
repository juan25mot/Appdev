import { getConceptos, addConcepto, updateConcepto, deleteConcepto } from './turso.js';

let items = [];
let editingId = null;
let deletingId = null;

// Referencias DOM
const elList = document.getElementById('list');
const elSearch = document.getElementById('searchInput');
const elModal = document.getElementById('modal');
const elModalConfirm = document.getElementById('modalConfirm');
const elModalTitle = document.getElementById('modalTitle');
const elInputMotivo = document.getElementById('inputMotivo');
const elInputConcepto = document.getElementById('inputConcepto');
const elConfirmText = document.getElementById('confirmText');
const elStatTotal = document.getElementById('stat-total');
const elStatShowing = document.getElementById('stat-showing');

// ============================================
// EVENT LISTENERS (todos con addEventListener)
// ============================================
document.getElementById('btnNuevo').addEventListener('click', openModal);
document.getElementById('btnCerrarModal').addEventListener('click', closeModal);
document.getElementById('btnCancelar').addEventListener('click', closeModal);
document.getElementById('btnGuardar').addEventListener('click', saveItem);
document.getElementById('btnRecargar').addEventListener('click', loadData);
document.getElementById('btnCancelarEliminar').addEventListener('click', closeConfirmModal);
document.getElementById('btnConfirmarEliminar').addEventListener('click', confirmDelete);

elSearch.addEventListener('input', render);

elModal.addEventListener('click', e => {
  if (e.target.id === 'modal') closeModal();
});

elModalConfirm.addEventListener('click', e => {
  if (e.target.id === 'modalConfirm') closeConfirmModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeConfirmModal();
  }
});

// DELEGACIÓN DE EVENTOS para botones dinámicos (copiar, editar, eliminar)
elList.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const id = parseInt(btn.dataset.id, 10);
  if (!id) return;

  if (btn.classList.contains('btn-copy')) {
    copyConcept(id);
  } else if (btn.classList.contains('btn-edit')) {
    editItem(id);
  } else if (btn.classList.contains('btn-delete')) {
    promptDelete(id);
  }
});

// ============================================
// CRUD CON TURSO
// ============================================
async function loadData() {
  elList.innerHTML = '<div class="empty-state"><p>⏳ Cargando desde Turso...</p></div>';
  try {
    items = await getConceptos();
    render();
    showToast(`Cargados ${items.length} conceptos`, 'success');
  } catch (err) {
    console.error('ERROR TURSO:', err);
    elList.innerHTML = `
      <div style="background:#fee2e2;border:1px solid #fecaca;border-radius:10px;padding:20px;color:#991b1b;">
        <h3 style="margin-top:0;">❌ Error al conectar con Turso</h3>
        <p><strong>Mensaje:</strong> ${escapeHtml(err.message)}</p>
        <p style="font-size:0.85rem;margin-bottom:0;">
          Revisa:<br>
          1. ¿Abriste con Live Server (http://localhost) y no con doble clic?<br>
          2. ¿El token y URL en js/turso.js son correctos?<br>
          3. ¿La tabla "conceptos" existe en el dashboard de Turso?<br>
          4. Presiona F12 → Console para más detalles.
        </p>
      </div>`;
    showToast('Error de conexión', 'error');
  }
}

function render() {
  const q = normalizeText(elSearch.value);
  const filtered = items.filter(it => {
    const m = normalizeText(it.motivo);
    const c = normalizeText(it.concepto);
    return m.includes(q) || c.includes(q);
  });

  elStatTotal.textContent = items.length;
  elStatShowing.textContent = filtered.length;

  if (filtered.length === 0) {
    elList.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.3-4.3"></path>
        </svg>
        <p>${items.length === 0 ? 'La base de datos está vacía.' : 'No se encontraron coincidencias.'}</p>
      </div>`;
    return;
  }

  elList.innerHTML = filtered.map(it => {
    let motivoHtml = escapeHtml(it.motivo);
    let conceptoHtml = escapeHtml(it.concepto);
    if (q) {
      motivoHtml = highlightText(motivoHtml, q);
      conceptoHtml = highlightText(conceptoHtml, q);
    }
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">${motivoHtml}</div>
          <span class="badge">#${it.id}</span>
        </div>
        <div class="card-body">${conceptoHtml}</div>
        <div class="card-actions">
          <button class="btn-copy" data-id="${it.id}">📋 Copiar</button>
          <button class="btn-edit" data-id="${it.id}">✏️ Editar</button>
          <button class="btn-delete" data-id="${it.id}" style="color:var(--danger)">🗑️ Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// UTILIDADES
// ============================================
function normalizeText(text) {
  return (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function highlightText(html, q) {
  const terms = q.split(/\s+/).filter(t => t.length > 1);
  if (terms.length === 0) return html;
  let result = html;
  terms.forEach(term => {
    const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${safe})`, 'gi');
    result = result.replace(re, '<span class="highlight">$1</span>');
  });
  return result;
}

// ============================================
// MODAL NUEVO / EDITAR
// ============================================
function openModal() {
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
  let valid = true;
  if (!elInputMotivo.value.trim()) { elInputMotivo.classList.add('error'); valid = false; }
  if (!elInputConcepto.value.trim()) { elInputConcepto.classList.add('error'); valid = false; }
  return valid;
}

async function saveItem() {
  if (!validate()) {
    showToast('Completa los campos obligatorios', 'error');
    return;
  }
  const motivo = elInputMotivo.value.trim();
  const concepto = elInputConcepto.value.trim();
  try {
    if (editingId) {
      await updateConcepto(editingId, motivo, concepto);
      showToast('Concepto actualizado', 'success');
    } else {
      await addConcepto(motivo, concepto);
      showToast('Concepto agregado', 'success');
    }
    closeModal();
    await loadData();
  } catch (err) {
    showToast('Error al guardar: ' + err.message, 'error');
  }
}

// ============================================
// EDITAR
// ============================================
function editItem(id) {
  const it = items.find(x => x.id === id);
  if (!it) return;
  editingId = id;
  clearErrors();
  elModalTitle.textContent = 'Editar Concepto';
  elInputMotivo.value = it.motivo;
  elInputConcepto.value = it.concepto;
  elModal.classList.add('active');
}

// ============================================
// ELIMINAR
// ============================================
function promptDelete(id) {
  const it = items.find(x => x.id === id);
  if (!it) return;
  deletingId = id;
  elConfirmText.textContent = `¿Eliminar permanentemente "${it.motivo}"?`;
  elModalConfirm.classList.add('active');
}

function closeConfirmModal() {
  elModalConfirm.classList.remove('active');
  deletingId = null;
}

async function confirmDelete() {
  if (!deletingId) return;
  try {
    await deleteConcepto(deletingId);
    showToast('Concepto eliminado', 'success');
    await loadData();
  } catch (err) {
    showToast('Error al eliminar: ' + err.message, 'error');
  }
  closeConfirmModal();
}

// ============================================
// COPIAR
// ============================================
function copyConcept(id) {
  const it = items.find(x => x.id === id);
  if (!it) return;
  navigator.clipboard.writeText(`${it.motivo}\n\n${it.concepto}`).then(() => {
    showToast('Copiado al portapapeles', 'success');
  }).catch(() => {
    showToast('No se pudo copiar', 'error');
  });
}

// ============================================
// TOAST
// ============================================
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type;
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ============================================
// INICIAR
// ============================================
loadData();