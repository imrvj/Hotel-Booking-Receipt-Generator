/* ═══════════════════════════════════════════════════
   AUTH & API LAYER
═══════════════════════════════════════════════════ */
const API = 'http://localhost:3000/api';
function getToken()  { return localStorage.getItem('hrp_token'); }
function setToken(t) { localStorage.setItem('hrp_token', t); }
function clearToken(){ localStorage.removeItem('hrp_token'); localStorage.removeItem('hrp_user'); }
function getUser()   { return localStorage.getItem('hrp_user') || ''; }
function setUser(u)  { localStorage.setItem('hrp_user', u); }

function switchAuthTab(tab) {
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
  document.getElementById('loginError').textContent = '';
  document.getElementById('registerError').textContent = '';
}

function togglePass(inputId, btn) {
  const el = document.getElementById(inputId);
  el.type = el.type === 'password' ? 'text' : 'password';
  btn.textContent = el.type === 'password' ? '👁' : '🙈';
}

async function doLogin(e) {
  e.preventDefault();
  const errEl = document.getElementById('loginError');
  const btn   = document.getElementById('loginBtn');
  errEl.textContent = ''; btn.disabled = true; btn.textContent = 'Signing in…';
  try {
    const res  = await fetch(`${API}/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username: document.getElementById('loginUser').value.trim(), password: document.getElementById('loginPass').value }) });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Login failed'; return; }
    setToken(data.token); setUser(data.username); await showApp();
  } catch { errEl.textContent = 'Cannot connect to server. Is it running?'; }
  finally { btn.disabled = false; btn.textContent = 'Sign In →'; }
}

async function doRegister(e) {
  e.preventDefault();
  const errEl = document.getElementById('registerError');
  const btn   = document.getElementById('registerBtn');
  errEl.textContent = '';
  const pass = document.getElementById('regPass').value;
  const pass2 = document.getElementById('regPass2').value;
  if (pass !== pass2) { errEl.textContent = 'Passwords do not match'; return; }
  btn.disabled = true; btn.textContent = 'Creating account…';
  try {
    const res  = await fetch(`${API}/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username: document.getElementById('regUser').value.trim(), password: pass }) });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Registration failed'; return; }
    setToken(data.token); setUser(data.username); await showApp();
  } catch { errEl.textContent = 'Cannot connect to server. Is it running?'; }
  finally { btn.disabled = false; btn.textContent = 'Create Account →'; }
}

function doLogout() {
  clearToken();
  document.getElementById('appScreen').classList.add('hidden');
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  switchAuthTab('login');
}

async function showApp() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');
  document.getElementById('headerUsername').textContent = getUser();
  await loadAndFillDefaults();
}

async function loadAndFillDefaults() {
  try {
    const res = await fetch(`${API}/settings`, { headers:{ Authorization:`Bearer ${getToken()}` } });
    if (!res.ok) return;
    const s = await res.json();
    if (s.hotel_name)     setVal('hotelName', s.hotel_name);
    if (s.hotel_address)  setVal('hotelAddress', s.hotel_address);
    if (s.hotel_phone)    setVal('hotelPhone', s.hotel_phone);
    if (s.hotel_email)    setVal('hotelEmail', s.hotel_email);
    if (s.hotel_website)  setVal('hotelWebsite', s.hotel_website);
    if (s.hotel_gstin)    setVal('hotelGSTIN', s.hotel_gstin);
    if (s.default_room_type)    setSelVal('roomType', s.default_room_type);
    if (s.default_meal_plan)    setSelVal('mealPlan', s.default_meal_plan);
    if (s.default_gst_slab)     setSelVal('gstSlab', s.default_gst_slab);
    if (s.default_payment_mode) setSelVal('paymentMode', s.default_payment_mode);
    if (s.hotel_name) showToastMsg('✅ Hotel defaults auto-filled!', 'gold');
  } catch { /* server offline */ }
}

function setVal(id,v)    { const e=document.getElementById(id); if(e&&v) e.value=v; }
function setSelVal(id,v) { const e=document.getElementById(id); if(!e||!v)return; for(const o of e.options)if(o.value===v){e.value=v;break;} }

async function saveDefaults() {
  try {
    const res = await fetch(`${API}/settings`, { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${getToken()}`},
      body: JSON.stringify({ hotel_name:document.getElementById('hotelName').value.trim(), hotel_address:document.getElementById('hotelAddress').value.trim(), hotel_phone:document.getElementById('hotelPhone').value.trim(), hotel_email:document.getElementById('hotelEmail').value.trim(), hotel_website:document.getElementById('hotelWebsite').value.trim(), hotel_gstin:document.getElementById('hotelGSTIN').value.trim(), default_room_type:document.getElementById('roomType').value, default_meal_plan:document.getElementById('mealPlan').value, default_gst_slab:document.getElementById('gstSlab').value, default_payment_mode:document.getElementById('paymentMode').value })
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || 'Could not save'); return; }
    showToastMsg('💾 Hotel defaults saved!', 'gold');
  } catch { alert('Cannot connect to server.'); }
}

function openSettings()  { document.getElementById('settingsModal').classList.remove('hidden'); }
function closeSettings() {
  document.getElementById('settingsModal').classList.add('hidden');
  ['cpCurrent','cpNew','cpConfirm'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('cpError').textContent='';
}

async function changePassword() {
  const errEl=document.getElementById('cpError'); errEl.textContent='';
  const curr=document.getElementById('cpCurrent').value, npw=document.getElementById('cpNew').value, conf=document.getElementById('cpConfirm').value;
  if(npw!==conf){errEl.textContent='New passwords do not match';return;}
  try {
    const res=await fetch(`${API}/change-password`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify({currentPassword:curr,newPassword:npw})});
    const data=await res.json();
    if(!res.ok){errEl.textContent=data.error||'Failed';return;}
    closeSettings(); showToastMsg('🔒 Password updated!','');
  } catch { errEl.textContent='Cannot connect to server.'; }
}

function showToastMsg(msg, cls) {
  const t=document.getElementById('toast');
  t.textContent=msg; t.className='toast'+(cls?' '+cls:'');
  t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),3500);
}

// ===== SECTION NAVIGATION =====
function nextSection(current) {
  if (!validateSection(current)) return;
  const curr = document.getElementById(`section-${current}`);
  const next = document.getElementById(`section-${current + 1}`);
  const indCurr = document.getElementById(`step-indicator-${current}`);
  const indNext = document.getElementById(`step-indicator-${current + 1}`);
  curr.classList.remove('active');
  next.classList.add('active');
  indCurr.classList.remove('active');
  indCurr.classList.add('done');
  indNext.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevSection(current) {
  const curr = document.getElementById(`section-${current}`);
  const prev = document.getElementById(`section-${current - 1}`);
  const indCurr = document.getElementById(`step-indicator-${current}`);
  const indPrev = document.getElementById(`step-indicator-${current - 1}`);
  curr.classList.remove('active');
  prev.classList.add('active');
  indCurr.classList.remove('active');
  indPrev.classList.remove('done');
  indPrev.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== VALIDATION (all fields optional) =====
function validateSection(section) {
  return true; // No mandatory fields
}
// ===== TOGGLE NUMBER OF ROOMS (hidden for Villa/Cottage) =====
function toggleNumRooms() {
  const roomType = document.getElementById('roomType').value;
  const group    = document.getElementById('numRoomsGroup');
  const isVilla  = roomType === 'Cottage / Villa';
  group.style.display = isVilla ? 'none' : '';
  if (isVilla) {
    document.getElementById('numRooms').value = 1; // treat as 1 for billing
  }
  calcBilling();
}


function calcNights() {
  const ci = document.getElementById('checkinDate').value;
  const co = document.getElementById('checkoutDate').value;
  if (ci && co) {
    const d1 = new Date(ci), d2 = new Date(co);
    let nights = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    if (nights < 1) nights = 1;
    document.getElementById('numNights').value = nights;
  }
  calcBilling();
}

// ===== BILLING CALCULATION =====
function calcBilling() {
  const nights   = parseInt(document.getElementById('numNights').value) || 1;
  const rooms    = parseInt(document.getElementById('numRooms').value) || 1;
  const tariff   = parseFloat(document.getElementById('roomTariff').value) || 0;
  const extraBed = parseFloat(document.getElementById('extraBed').value) || 0;
  const earlyCi  = parseFloat(document.getElementById('earlyCheckin').value) || 0;
  const lateCo   = parseFloat(document.getElementById('lateCheckout').value) || 0;
  const food     = parseFloat(document.getElementById('restaurantCharges').value) || 0;
  const laundry  = parseFloat(document.getElementById('laundryCharges').value) || 0;
  const spa      = parseFloat(document.getElementById('spaCharges').value) || 0;
  const other    = parseFloat(document.getElementById('otherCharges').value) || 0;
  const gstSlab  = parseInt(document.getElementById('gstSlab').value) || 0;
  const discType = document.getElementById('discountType').value;
  const discVal  = parseFloat(document.getElementById('discountValue').value) || 0;
  const advance  = parseFloat(document.getElementById('advancePaid').value) || 0;

  const roomCharges = tariff * nights * rooms;
  const checkTimeCharges = earlyCi + lateCo;
  const subtotal = roomCharges + extraBed + checkTimeCharges + food + laundry + spa + other;

  let discount = 0;
  if (discType === 'fixed') discount = Math.min(discVal, subtotal);
  else if (discType === 'percent') discount = (discVal / 100) * subtotal;

  const taxable = subtotal - discount;
  const halfGst = gstSlab / 2;
  const cgst = taxable * (halfGst / 100);
  const sgst = taxable * (halfGst / 100);
  const grandTotal = taxable + cgst + sgst;
  const balance = Math.max(0, grandTotal - advance);

  // Update room label dynamically
  const roomType = document.getElementById('roomType')?.value || '';
  const isVilla  = roomType === 'Cottage / Villa';
  const roomLabelEl = document.querySelector('.summary-row span:first-child');
  if (roomLabelEl) roomLabelEl.textContent = isVilla
    ? 'Villa Charges (Entire Property × Tariff)'
    : 'Room Charges (Nights × Rooms × Tariff)';

  setText('s-room', fmt(roomCharges));
  setText('s-extrabed', fmt(extraBed));
  setText('s-checktimes', fmt(checkTimeCharges));
  setText('s-food', fmt(food));
  setText('s-laundry', fmt(laundry));
  setText('s-spa', fmt(spa));
  setText('s-other', fmt(other));
  setText('s-subtotal', fmt(subtotal));
  setText('s-discount', `-${fmt(discount)}`);
  setText('s-taxable', fmt(taxable));
  setText('s-cgst', fmt(cgst));
  setText('s-sgst', fmt(sgst));
  setText('s-total', fmt(grandTotal));
  document.getElementById('s-balance').value = fmt(balance);

  const halfGstLabel = `${halfGst}%`;
  document.getElementById('cgst-label').textContent = `CGST (${halfGstLabel})`;
  document.getElementById('sgst-label').textContent = `SGST (${halfGstLabel})`;
  document.getElementById('cgstPct').value = halfGstLabel;
  document.getElementById('sgstPct').value = halfGstLabel;
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function fmt(n) {
  return '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function rawNum(n) {
  return Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ===== AMOUNT IN WORDS =====
function numberToWords(num) {
  num = Math.round(num);
  if (num === 0) return 'Zero Rupees Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function convert(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }
  return convert(num) + ' Rupees Only';
}

// ===== DATE FORMAT =====
function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(str) {
  if (!str) return '';
  const [h, m] = str.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

// ===== GET VALUE HELPERS =====
const g    = id => document.getElementById(id)?.value?.trim() || '';
const gSel = id => document.getElementById(id)?.value || '';

// ===== GENERATE PDF via PRINT =====
function generatePDF() {
  if (!validateSection(4)) return;

  // --- Recalculate all billing values ---
  const nights   = parseInt(g('numNights')) || 1;
  const rooms    = parseInt(g('numRooms')) || 1;
  const tariff   = parseFloat(g('roomTariff')) || 0;
  const extraBed = parseFloat(g('extraBed')) || 0;
  const earlyCi  = parseFloat(g('earlyCheckin')) || 0;
  const lateCo   = parseFloat(g('lateCheckout')) || 0;
  const food     = parseFloat(g('restaurantCharges')) || 0;
  const laundry  = parseFloat(g('laundryCharges')) || 0;
  const spa      = parseFloat(g('spaCharges')) || 0;
  const other    = parseFloat(g('otherCharges')) || 0;
  const gstSlab  = parseInt(gSel('gstSlab')) || 0;
  const discType = gSel('discountType');
  const discVal  = parseFloat(g('discountValue')) || 0;
  const advance  = parseFloat(g('advancePaid')) || 0;

  const roomCharges      = tariff * nights * rooms;
  const checkTimeCharges = earlyCi + lateCo;
  const subtotal         = roomCharges + extraBed + checkTimeCharges + food + laundry + spa + other;
  let discount = 0;
  if (discType === 'fixed') discount = Math.min(discVal, subtotal);
  else if (discType === 'percent') discount = (subtotal * discVal) / 100;
  const taxable    = subtotal - discount;
  const halfGst    = gstSlab / 2;
  const cgst       = taxable * (halfGst / 100);
  const sgst       = taxable * (halfGst / 100);
  const grandTotal = taxable + cgst + sgst;
  const balance    = Math.max(0, grandTotal - advance);

  // --- Build charge rows ---
  let chargeRows = '';
  let rowIdx = 0;

  function addRow(desc, amount, important = false) {
    if (amount === 0 && !important) return;
    const shade = rowIdx % 2 === 0 ? '#f9fafb' : '#ffffff';
    rowIdx++;
    chargeRows += `
      <tr style="background:${shade};">
        <td style="padding:8px 12px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">${desc}</td>
        <td style="padding:8px 12px;font-size:13px;color:#374151;text-align:right;border-bottom:1px solid #e5e7eb;font-weight:500;">₹${rawNum(amount)}</td>
      </tr>`;
  }

  const roomType2   = gSel('roomType');
  const isVilla2     = roomType2 === 'Cottage / Villa';
  const roomChargeDesc = isVilla2
    ? `Villa Charges – Entire Property (${nights} Night${nights > 1 ? 's' : ''} × ₹${rawNum(tariff)})`
    : `Room Charges (${rooms} Room × ${nights} Night${nights > 1 ? 's' : ''} × ₹${rawNum(tariff)})`;
  addRow(roomChargeDesc, roomCharges, true);
  addRow('Extra Bed Charges', extraBed);
  addRow('Early Check-in Charges', earlyCi);
  addRow('Late Check-out Charges', lateCo);
  addRow('Restaurant / Food Charges', food);
  addRow('Laundry Charges', laundry);
  addRow('Spa / Recreation Charges', spa);
  if (other > 0) {
    const desc = g('otherChargesDesc') ? `Other Charges – ${g('otherChargesDesc')}` : 'Other Charges';
    addRow(desc, other);
  }

  // --- Totals block ---
  const discLabel = discType === 'percent' ? `Discount (${discVal}%)` : discType === 'fixed' ? 'Discount (Fixed)' : 'Discount';
  const discRowHtml = discount > 0 ? `
    <tr style="background:#f0fdf4;">
      <td style="padding:8px 12px;font-size:13px;color:#166534;border-bottom:1px solid #e5e7eb;">${discLabel}</td>
      <td style="padding:8px 12px;font-size:13px;color:#166534;text-align:right;border-bottom:1px solid #e5e7eb;font-weight:600;">-₹${rawNum(discount)}</td>
    </tr>` : '';

  const cgstRowHtml = halfGst > 0 ? `
    <tr style="background:#eff6ff;">
      <td style="padding:7px 12px;font-size:12.5px;color:#1e3a8a;">CGST @ ${halfGst}%</td>
      <td style="padding:7px 12px;font-size:12.5px;color:#1e3a8a;text-align:right;">₹${rawNum(cgst)}</td>
    </tr>
    <tr style="background:#eff6ff;">
      <td style="padding:7px 12px;font-size:12.5px;color:#1e3a8a;">SGST @ ${halfGst}%</td>
      <td style="padding:7px 12px;font-size:12.5px;color:#1e3a8a;text-align:right;">₹${rawNum(sgst)}</td>
    </tr>` : `
    <tr style="background:#eff6ff;">
      <td style="padding:7px 12px;font-size:12.5px;color:#1e3a8a;">GST @ 0% (Exempt)</td>
      <td style="padding:7px 12px;font-size:12.5px;color:#1e3a8a;text-align:right;">₹0.00</td>
    </tr>`;

  // --- Compose full HTML receipt ---
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8"/>
    <title>Tax Invoice – ${g('hotelName') || 'Hotel'} – ${g('receiptNo')}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Inter', Arial, sans-serif; color: #111827; background: #fff; }
      .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 0; background: #fff; }

      /* Header */
      .header { background: #0f172a; color: white; padding: 20px 28px; display: flex; justify-content: space-between; align-items: flex-start; }
      .hotel-name { font-size: 22px; font-weight: 700; color: #fbbf24; letter-spacing: -0.5px; }
      .hotel-meta { font-size: 11px; color: #94a3b8; margin-top: 4px; line-height: 1.7; }
      .invoice-box { text-align: right; }
      .invoice-tag { background: #fbbf24; color: #111827; padding: 5px 14px; border-radius: 4px; font-weight: 700; font-size: 11px; letter-spacing: 1px; display: inline-block; }
      .invoice-info { font-size: 11px; color: #94a3b8; margin-top: 6px; line-height: 1.7; }
      .gold-bar { height: 4px; background: linear-gradient(90deg,#fbbf24,#f59e0b,#d97706); }

      /* Info Grid */
      .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-bottom: 1px solid #e5e7eb; }
      .info-block { padding: 16px 20px; }
      .info-block:first-child { border-right: 1px solid #e5e7eb; }
      .info-block-title { font-size: 10px; font-weight: 700; letter-spacing: 1.2px; color: #6b7280; text-transform: uppercase; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #fbbf24; display: inline-block; }
      .info-row { display: flex; gap: 6px; margin-bottom: 5px; font-size: 12px; }
      .info-label { color: #6b7280; min-width: 110px; flex-shrink: 0; }
      .info-value { color: #111827; font-weight: 600; }

      /* Charges Table */
      .table-wrap { padding: 0 0; }
      .section-label { background: #1e293b; color: #fbbf24; font-size: 10.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 8px 14px; }
      table { width: 100%; border-collapse: collapse; }
      thead tr { background: #f1f5f9; }
      thead th { padding: 9px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; text-align: left; border-bottom: 2px solid #e2e8f0; }
      thead th:last-child { text-align: right; }

      /* Totals */
      .totals-table { width: 100%; border-collapse: collapse; }
      .subtotal-row td { padding: 8px 12px; font-size: 13px; font-weight: 600; color: #374151; border-top: 2px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; background: #f8fafc; }
      .taxable-row td { padding: 7px 12px; font-size: 12.5px; color: #374151; background: #f8fafc; }
      .grand-row td { padding: 12px 14px; font-size: 15px; font-weight: 800; color: #fff; background: #0f172a; }
      .grand-row td span { color: #fbbf24; }
      .amount-words { background: #fefce8; border: 1px solid #fde68a; padding: 10px 14px; font-size: 12px; color: #713f12; }
      .amount-words strong { font-weight: 700; }

      /* Payment Strip */
      .payment-strip { display: grid; grid-template-columns: 1fr 1fr 1fr; border-top: 3px solid #fbbf24; }
      .pay-cell { padding: 14px 16px; border-right: 1px solid #e5e7eb; }
      .pay-cell:last-child { border-right: none; }
      .pay-label { font-size: 9.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; }
      .pay-value { font-size: 15px; font-weight: 800; }
      .pay-value.green { color: #15803d; }
      .pay-value.red { color: #b91c1c; }
      .pay-value.blue { color: #1d4ed8; }
      .pay-cell .pay-sub { font-size: 10.5px; color: #6b7280; margin-top: 2px; }

      /* Notes & Footer */
      .notes-block { padding: 12px 20px; background: #eff6ff; border-top: 1px solid #bfdbfe; font-size: 11.5px; color: #1e40af; }
      .notes-block strong { font-weight: 700; }
      .footer { background: #0f172a; color: #64748b; padding: 14px 20px; font-size: 10px; line-height: 1.8; }
      .footer-center { text-align: center; color: #fbbf24; font-size: 11px; font-weight: 600; margin-top: 6px; }
      .footer-disc { font-size: 9.5px; color: #475569; }

      /* Signature Row */
      .sig-row { display: grid; grid-template-columns: 1fr 1fr; padding: 20px 20px 10px; border-top: 1px solid #e5e7eb; gap: 20px; }
      .sig-box { border-top: 1px dashed #94a3b8; padding-top: 6px; font-size: 10.5px; color: #6b7280; text-align: center; padding-top: 30px; }

      @media print {
        /* Zero out @page margin — this removes browser-injected
           print date, URL, title, and page number from the output */
        @page {
          size: A4;
          margin: 0mm;
        }
        html, body {
          width: 210mm;
          margin: 0;
          padding: 0;
        }
        /* Add internal padding so content doesn't touch edges */
        .page {
          box-shadow: none;
          padding: 0;          /* page itself has the gold bars at edges */
        }
      }

      /* ===== FORCE BACKGROUND COLORS IN PDF ===== */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
    </style>
  </head>
  <body>
  <div class="page">

    <!-- Gold bar top -->
    <div class="gold-bar"></div>

    <!-- Header -->
    <div class="header">
      <div>
        <div class="hotel-name">&#127976; ${g('hotelName') || 'Hotel Name'}</div>
        <div class="hotel-meta">
          ${g('hotelAddress') ? g('hotelAddress').replace(/\n/g, ' &bull; ') : ''}<br/>
          ${g('hotelPhone') ? '&#128222; ' + g('hotelPhone') : ''}
          ${g('hotelEmail') ? ' &nbsp;|&nbsp; &#9993; ' + g('hotelEmail') : ''}
          ${g('hotelWebsite') ? ' &nbsp;|&nbsp; &#127760; ' + g('hotelWebsite') : ''}<br/>
          ${g('hotelGSTIN') ? '<strong style="color:#fbbf24;">GSTIN:</strong> ' + g('hotelGSTIN').toUpperCase() : ''}
        </div>
      </div>
      <div class="invoice-box">
        <div class="invoice-tag">TAX INVOICE</div>
        <div class="invoice-info">
          <strong style="color:#e2e8f0;">Receipt No.:</strong> ${g('receiptNo')}<br/>
          <strong style="color:#e2e8f0;">Date:</strong> ${formatDate(g('receiptDate'))}<br/>
          ${g('bookingRef') ? '<strong style="color:#e2e8f0;">Booking Ref:</strong> ' + g('bookingRef') : ''}
        </div>
      </div>
    </div>

    <!-- Guest + Booking Info -->
    <div class="info-section">
      <div class="info-block">
        <div class="info-block-title">Guest Information</div>
        <div class="info-row"><span class="info-label">Guest Name</span><span class="info-value">${gSel('salutation')} ${g('guestName')}</span></div>
        <div class="info-row"><span class="info-label">Mobile</span><span class="info-value">${g('guestPhone')}</span></div>
        ${g('guestEmail') ? `<div class="info-row"><span class="info-label">Email</span><span class="info-value">${g('guestEmail')}</span></div>` : ''}
        ${g('guestAddress') ? `<div class="info-row"><span class="info-label">Address</span><span class="info-value">${g('guestAddress').replace(/\n/g, ', ')}</span></div>` : ''}
        <div class="info-row"><span class="info-label">Nationality</span><span class="info-value">${gSel('nationality')}</span></div>
        <div class="info-row"><span class="info-label">${gSel('idProofType') || 'ID Proof'}</span><span class="info-value">${g('idProofNo')}</span></div>
        <div class="info-row"><span class="info-label">Guests</span><span class="info-value">${g('numAdults')} Adult${g('numAdults') != '1' ? 's' : ''}${g('numChildren') > '0' ? ' + ' + g('numChildren') + ' Child/Children' : ''}</span></div>
        <div class="info-row"><span class="info-label">Purpose</span><span class="info-value">${gSel('purpose')}</span></div>
        ${g('companyName') ? `<div class="info-row"><span class="info-label">Company</span><span class="info-value">${g('companyName')}</span></div>` : ''}
      </div>
      <div class="info-block">
        <div class="info-block-title">Booking Details</div>
        <div class="info-row"><span class="info-label">Check-in</span><span class="info-value">${formatDate(g('checkinDate'))} &nbsp;${formatTime(g('checkinTime'))}</span></div>
        <div class="info-row"><span class="info-label">Check-out</span><span class="info-value">${formatDate(g('checkoutDate'))} &nbsp;${formatTime(g('checkoutTime'))}</span></div>
        <div class="info-row"><span class="info-label">Duration</span><span class="info-value">${nights} Night${nights > 1 ? 's' : ''}</span></div>
        <div class="info-row"><span class="info-label">Room No.</span><span class="info-value">${g('roomNo') || '—'}</span></div>
        <div class="info-row"><span class="info-label">${isVilla2 ? 'Property Type' : 'Room Type'}</span><span class="info-value">${gSel('roomType')}</span></div>
        ${isVilla2 ? '' : `<div class="info-row"><span class="info-label">No. of Rooms</span><span class="info-value">${rooms}</span></div>`}
        <div class="info-row"><span class="info-label">Meal Plan</span><span class="info-value">${gSel('mealPlan')}</span></div>
        ${g('floor') ? `<div class="info-row"><span class="info-label">Floor / Wing</span><span class="info-value">${g('floor')}</span></div>` : ''}
        <div class="info-row"><span class="info-label">Booking Via</span><span class="info-value">${gSel('bookingSource')}</span></div>
      </div>
    </div>

    <!-- Charges Table -->
    <div class="table-wrap">
      <div class="section-label">&#128179; Itemised Charges</div>
      <table>
        <thead>
          <tr>
            <th style="width:70%">Description</th>
            <th style="text-align:right">Amount (INR)</th>
          </tr>
        </thead>
        <tbody>
          ${chargeRows}
        </tbody>
      </table>

      <!-- Totals -->
      <table class="totals-table">
        <tr class="subtotal-row">
          <td style="text-align:left;width:70%">Sub Total</td>
          <td style="text-align:right">₹${rawNum(subtotal)}</td>
        </tr>
        ${discRowHtml}
        <tr class="taxable-row">
          <td>Taxable Amount</td>
          <td style="text-align:right">₹${rawNum(taxable)}</td>
        </tr>
        ${cgstRowHtml}
        <tr class="grand-row">
          <td>GRAND TOTAL &nbsp;<span style="font-size:11px;color:#94a3b8;font-weight:400;">(Inclusive of all taxes)</span></td>
          <td style="text-align:right"><span>₹${rawNum(grandTotal)}</span></td>
        </tr>
      </table>

      <!-- Amount in Words -->
      <div class="amount-words">
        <strong>Amount in Words:</strong> ${numberToWords(Math.round(grandTotal))}
      </div>
    </div>

    <!-- Payment Strip -->
    <div class="payment-strip">
      <div class="pay-cell">
        <div class="pay-label">Advance Paid</div>
        <div class="pay-value green">₹${rawNum(advance)}</div>
        <div class="pay-sub">Mode: ${gSel('paymentMode')}</div>
      </div>
      <div class="pay-cell">
        <div class="pay-label">Balance Due</div>
        <div class="pay-value ${balance > 0 ? 'red' : 'green'}">₹${rawNum(balance)}</div>
        ${g('transactionId') ? `<div class="pay-sub">Ref: ${g('transactionId')}</div>` : ''}
      </div>
      <div class="pay-cell">
        <div class="pay-label">GST Details</div>
        <div class="pay-value blue" style="font-size:13px;">${gstSlab}% GST</div>
        <div class="pay-sub">CGST ${halfGst}% + SGST ${halfGst}%</div>
      </div>
    </div>

    ${g('specialNotes') ? `<div class="notes-block"><strong>&#128221; Special Notes / Remarks:</strong> ${g('specialNotes')}</div>` : ''}

    <!-- Signature Row -->
    <div class="sig-row">
      <div class="sig-box">Guest Signature</div>
      <div class="sig-box">Authorised Signatory<br/><span style="font-weight:600;color:#374151;">${g('hotelName')}</span></div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-disc">
        &bull; This is a computer-generated Tax Invoice and does not require a physical signature. &nbsp;
        &bull; GST applicable as per GOI Notification No. 11/2017-CT (Rate). &nbsp;
        &bull; Disputes subject to local jurisdiction only.
      </div>
      <div class="footer-center">Thank you for choosing ${g('hotelName') || 'us'}. We hope to see you again! &#10084;&#65039;</div>
    </div>

    <!-- Gold bar bottom -->
    <div class="gold-bar"></div>

  </div>
  </body>
  </html>`;

  // ---- Open print window ----
  const printWin = window.open('', '_blank', 'width=900,height=700');
  if (!printWin) {
    alert('Pop-up blocked! Please allow pop-ups for this page and try again.');
    return;
  }
  printWin.document.write(html);
  printWin.document.close();

  // Wait for fonts/resources then print
  printWin.onload = function () {
    setTimeout(() => {
      printWin.focus();
      printWin.print();
    }, 600);
  };

  showToast();
}

// ===== TOAST =====
function showToast() {
  const t = document.getElementById('toast');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  // ── Date/billing init (runs whether logged in or not) ──
  function initFormDefaults() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('receiptDate').value = today;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('checkinDate').value = today;
    document.getElementById('checkoutDate').value = tomorrow.toISOString().split('T')[0];
    calcNights();

    document.getElementById('roomTariff').addEventListener('input', function () {
      const val = parseFloat(this.value) || 0;
      const slab = document.getElementById('gstSlab');
      if (val <= 1000)      slab.value = '0';
      else if (val <= 7500) slab.value = '12';
      else                  slab.value = '18';
      calcBilling();
    });

    const rno = 'RCP-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000);
    document.getElementById('receiptNo').value = rno;
    calcBilling();
  }

  // ── Auto-login if token exists ──────────────────
  if (getToken()) {
    initFormDefaults();
    await showApp();
  } else {
    initFormDefaults();
    // Auth screen is shown by default (appScreen is hidden)
  }
});
