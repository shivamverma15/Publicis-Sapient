'use strict';

const API = '/api';
let allMedicines = [];   // cache for inline edit lookup
let saleDropdownReady = false;

// ══════════════════════════════════════════════════
//  UI HELPERS
// ══════════════════════════════════════════════════

function showTab(name) {
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('d-none'));
  document.querySelectorAll('#mainTabs .nav-link').forEach(el => el.classList.remove('active'));

  document.getElementById(`tab-${name}`).classList.remove('d-none');

  const idx = { medicines: 0, addMedicine: 1, sales: 2, recordSale: 3 };
  document.querySelectorAll('#mainTabs .nav-link')[idx[name]].classList.add('active');

  if (name === 'medicines')  loadMedicines();
  if (name === 'sales')      loadSales();
  if (name === 'recordSale') loadMedicinesDropdown();

  return false;
}

function showToast(message, success = true) {
  const toast = document.getElementById('appToast');
  toast.className = `toast align-items-center border-0 ${success ? 'toast-success' : 'toast-error'}`;
  document.getElementById('toastBody').textContent = message;
  bootstrap.Toast.getOrCreateInstance(toast, { delay: 3500 }).show();
}

/** Safely encode text for HTML output */
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMoney(n) {
  return `$${parseFloat(n).toFixed(2)}`;
}

// ══════════════════════════════════════════════════
//  MEDICINES — LIST
// ══════════════════════════════════════════════════

async function loadMedicines(search = '') {
  try {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API}/medicines${qs}`);
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    allMedicines = await res.json();
    renderMedicines(allMedicines);
  } catch (err) {
    showToast(err.message, false);
  }
}

function renderMedicines(list) {
  const tbody = document.getElementById('medicinesTableBody');
  const count = document.getElementById('medicinesCount');

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">
      <i class="bi bi-inbox fs-3 d-block mb-1"></i>No medicines found</td></tr>`;
    count.textContent = '';
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30 = new Date(today);
  in30.setDate(in30.getDate() + 30);

  tbody.innerHTML = list.map(m => {
    const exp = new Date(m.expiryDate);
    exp.setHours(0, 0, 0, 0);
    const expiring = exp <= in30;
    const lowStock = m.quantity < 10;

    let rowCls = '';
    if (expiring && lowStock) rowCls = 'row-both';
    else if (expiring)        rowCls = 'row-red';
    else if (lowStock)        rowCls = 'row-yellow';

    const badges = [
      expiring ? `<span class="badge bg-danger stock-badge ms-2">Exp. soon</span>` : '',
      lowStock  ? `<span class="badge bg-warning text-dark stock-badge ms-1">Low stock</span>` : ''
    ].join('');

    return `
      <tr class="${rowCls}">
        <td>${esc(m.fullName)}${badges}</td>
        <td>${esc(m.brand)}</td>
        <td>${fmtDate(m.expiryDate)}</td>
        <td>${m.quantity}</td>
        <td>${fmtMoney(m.price)}</td>
        <td class="text-center text-nowrap">
          <button class="btn btn-sm btn-outline-primary me-1" title="Edit"
            onclick="editMedicine('${m.id}')"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-success me-1" title="Sell"
            onclick="quickSell('${m.id}')"><i class="bi bi-cart"></i></button>
          <button class="btn btn-sm btn-outline-danger" title="Delete"
            onclick="deleteMedicine('${m.id}','${esc(m.fullName)}')"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`;
  }).join('');

  count.textContent = `Showing ${list.length} medicine${list.length !== 1 ? 's' : ''}`;
}

// ── Search ──
function searchMedicines() {
  loadMedicines(document.getElementById('searchInput').value.trim());
}
function clearSearch() {
  document.getElementById('searchInput').value = '';
  loadMedicines();
}

// ── Delete ──
async function deleteMedicine(id, name) {
  if (!confirm(`Delete "${name}"?`)) return;
  try {
    const res = await fetch(`${API}/medicines/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    showToast('Medicine deleted.');
    loadMedicines(document.getElementById('searchInput').value.trim());
  } catch (err) {
    showToast(err.message, false);
  }
}

// ── Quick-sell shortcut from medicines grid ──
function quickSell(id) {
  showTab('recordSale');
  // Wait for dropdown to be populated then pre-select
  const pick = () => {
    const sel = document.getElementById('saleMedicine');
    if (sel.options.length > 1) {
      sel.value = id;
      onMedicineSelect();
    } else {
      setTimeout(pick, 100);
    }
  };
  pick();
}

// ══════════════════════════════════════════════════
//  MEDICINES — ADD / EDIT
// ══════════════════════════════════════════════════

function editMedicine(id) {
  const m = allMedicines.find(x => x.id === id);
  if (!m) return;
  document.getElementById('medicineId').value       = m.id;
  document.getElementById('fldFullName').value      = m.fullName;
  document.getElementById('fldBrand').value         = m.brand;
  document.getElementById('fldExpiryDate').value    = m.expiryDate.split('T')[0];
  document.getElementById('fldQuantity').value      = m.quantity;
  document.getElementById('fldPrice').value         = parseFloat(m.price).toFixed(2);
  document.getElementById('fldNotes').value         = m.notes ?? '';
  document.getElementById('medicineFormTitle').innerHTML =
    `<i class="bi bi-pencil-square me-2"></i>Edit Medicine`;
  showTab('addMedicine');
}

function resetMedicineForm() {
  document.getElementById('medicineForm').reset();
  document.getElementById('medicineId').value = '';
  document.getElementById('medicineFormTitle').innerHTML =
    `<i class="bi bi-plus-circle me-2"></i>Add New Medicine`;
}

async function saveMedicine(e) {
  e.preventDefault();
  const form = e.target;
  if (!form.checkValidity()) { form.reportValidity(); return; }

  const id = document.getElementById('medicineId').value;
  const payload = {
    FullName:   document.getElementById('fldFullName').value.trim(),
    Brand:      document.getElementById('fldBrand').value.trim(),
    ExpiryDate: document.getElementById('fldExpiryDate').value,
    Quantity:   parseInt(document.getElementById('fldQuantity').value, 10),
    Price:      parseFloat(document.getElementById('fldPrice').value),
    Notes:      document.getElementById('fldNotes').value.trim()
  };
  if (id) payload.Id = id;

  try {
    const res = await fetch(
      id ? `${API}/medicines/${id}` : `${API}/medicines`,
      {
        method:  id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `Server error ${res.status}`);
    }
    showToast(id ? 'Medicine updated!' : 'Medicine added!');
    resetMedicineForm();
    showTab('medicines');
  } catch (err) {
    showToast(err.message, false);
  }
}

// ══════════════════════════════════════════════════
//  SALES — LIST
// ══════════════════════════════════════════════════

async function loadSales() {
  try {
    const res = await fetch(`${API}/sales`);
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const sales = await res.json();
    renderSales(sales);
  } catch (err) {
    showToast(err.message, false);
  }
}

function renderSales(list) {
  const tbody = document.getElementById('salesTableBody');
  const totEl = document.getElementById('salesTotal');

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">
      <i class="bi bi-inbox fs-3 d-block mb-1"></i>No sales records yet</td></tr>`;
    totEl.textContent = '';
    return;
  }

  let grandTotal = 0;
  tbody.innerHTML = list.map(s => {
    grandTotal += parseFloat(s.totalAmount);
    return `
      <tr>
        <td>${esc(s.medicineName)}</td>
        <td>${esc(s.brand)}</td>
        <td>${s.quantitySold}</td>
        <td>${fmtMoney(s.unitPrice)}</td>
        <td class="fw-semibold text-success">${fmtMoney(s.totalAmount)}</td>
        <td>${fmtDate(s.saleDate)}</td>
      </tr>`;
  }).join('');

  totEl.innerHTML = `Grand Total: <span class="text-success">${fmtMoney(grandTotal)}</span>`;
}

// ══════════════════════════════════════════════════
//  SALES — RECORD
// ══════════════════════════════════════════════════

async function loadMedicinesDropdown() {
  try {
    const res = await fetch(`${API}/medicines`);
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const meds = await res.json();
    const sel = document.getElementById('saleMedicine');
    const prev = sel.value;

    sel.innerHTML = '<option value="">— Select Medicine —</option>';
    meds
      .filter(m => m.quantity > 0)
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .forEach(m => {
        const opt = new Option(
          `${m.fullName} (${m.brand})  —  Stock: ${m.quantity}`,
          m.id
        );
        opt.dataset.price = m.price;
        opt.dataset.stock = m.quantity;
        sel.appendChild(opt);
      });

    if (prev) { sel.value = prev; onMedicineSelect(); }
    saleDropdownReady = true;
  } catch (err) {
    showToast(err.message, false);
  }
}

function onMedicineSelect() {
  const sel = document.getElementById('saleMedicine');
  const opt = sel.options[sel.selectedIndex];
  const qtyEl = document.getElementById('saleQty');

  if (opt.value) {
    document.getElementById('saleUnitPrice').textContent = fmtMoney(opt.dataset.price);
    qtyEl.max = opt.dataset.stock;
    qtyEl.value = '';
    document.getElementById('saleTotalAmount').textContent = '—';
  } else {
    document.getElementById('saleUnitPrice').textContent = '—';
    document.getElementById('saleTotalAmount').textContent = '—';
  }
}

function onQtyChange() {
  const sel = document.getElementById('saleMedicine');
  const opt = sel.options[sel.selectedIndex];
  const qty = parseInt(document.getElementById('saleQty').value, 10);
  if (opt.value && qty > 0) {
    document.getElementById('saleTotalAmount').textContent = fmtMoney(parseFloat(opt.dataset.price) * qty);
  }
}

async function recordSale(e) {
  e.preventDefault();
  const form = e.target;
  if (!form.checkValidity()) { form.reportValidity(); return; }

  const sel = document.getElementById('saleMedicine');
  const qty = parseInt(document.getElementById('saleQty').value, 10);

  if (!sel.value) { showToast('Please select a medicine.', false); return; }
  if (qty < 1)    { showToast('Quantity must be at least 1.', false); return; }

  try {
    const res = await fetch(`${API}/sales`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ MedicineId: sel.value, QuantitySold: qty })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `Server error ${res.status}`);
    }
    showToast('Sale recorded successfully!');
    form.reset();
    document.getElementById('saleUnitPrice').textContent  = '—';
    document.getElementById('saleTotalAmount').textContent = '—';
    await loadMedicinesDropdown();   // refresh stock counts
  } catch (err) {
    showToast(err.message, false);
  }
}

// ══════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', () => {
  // Search on Enter
  document.getElementById('searchInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchMedicines();
  });
  // Kick off
  showTab('medicines');
});
