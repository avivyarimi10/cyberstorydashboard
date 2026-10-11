/* Cyber Story Tracker. No build step, no server. Data lives in localStorage. */
(() => {
'use strict';

const KEY = 'cyber-story-tracker:v1';
const LENSES = ['Risk reduction, and how','Velocity','Resource allocation','Accountability','Assurance and compliance','Third-party risk','Resilience','Trend and confidence','Cost and avoided loss','Forward look and asks'];
const DIRS = ['Safer','Same','Less safe'];
const QWORDS = [['headline','Quarter headline'],['better','What got better'],['worse','What got worse or stalled'],['decision','Biggest decision'],['watch','What we will watch next quarter']];

// ---------- helpers
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const todayYM = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const addMonth = k => { const [y, m] = k.split('-').map(Number); const d = new Date(Date.UTC(y, m, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
const label = k => { const [y, m] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }); };
const quarter = k => { const [y, m] = k.split('-').map(Number); return `Q${Math.ceil(m / 3)} ${y}`; };
const num = v => (v === '' || v == null || isNaN(v)) ? null : Number(v);
const round = x => Math.round(x * 100) / 100;
const fmt = x => x == null ? '' : String(round(x));
const dirOf = (better, ch) => ch == null ? '' : ch === 0 ? 'Flat' : better === 'Lower' ? (ch < 0 ? 'Better' : 'Worse') : better === 'Higher' ? (ch > 0 ? 'Better' : 'Worse') : '–';

// ---------- state
const empty = () => ({ months: [todayYM()], story: {}, metrics: [], asks: [], quarters: {} });
let state = load() || empty();
let tab = 'story';

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    return valid(s) ? s : null;
  } catch { return null; }
}
function valid(s) {
  return s && Array.isArray(s.months) && s.months.length && Array.isArray(s.metrics) && Array.isArray(s.asks) && s.story && typeof s.story === 'object' && s.quarters && typeof s.quarters === 'object';
}
function save() {
  const el = $('#save-status');
  try { localStorage.setItem(KEY, JSON.stringify(state)); el.textContent = 'Saved in this browser.'; }
  catch { el.textContent = 'Could not save here. Export JSON to keep your work.'; }
}

// ---------- calculations
function series(m) { return state.months.map(k => [k, num(m.values[k])]).filter(([, v]) => v !== null); }
function calc(m) {
  const s = series(m);
  const latest = s.length ? s[s.length - 1][1] : null;
  const prior = s.length > 1 ? s[s.length - 2][1] : null;
  const ch = latest != null && prior != null ? round(latest - prior) : null;
  return { latest, ch, dir: dirOf(m.better, ch) };
}
function quarters() { return [...new Set(state.months.map(quarter))]; }
function qValue(m, q) {
  const vals = state.months.filter(k => quarter(k) === q).map(k => num(m.values[k])).filter(v => v !== null);
  if (!vals.length) return null;
  const sum = vals.reduce((a, b) => a + b, 0);
  return m.rollup === 'Sum' ? sum : sum / vals.length;
}

// ---------- rendering pieces
const ta = (attrs, v) => `<textarea ${attrs}>${esc(v)}</textarea>`;
const opts = (list, cur, blank) => (blank ? `<option value=""${cur ? '' : ' selected'}>${esc(blank)}</option>` : '') + list.map(o => `<option${o === cur ? ' selected' : ''}>${esc(o)}</option>`).join('');
const pill = v => v ? `<span class="pill ${esc(v)}">${esc(v)}</span>` : '';

function viewStory() {
  const ms = state.months;
  const head = ms.map(k => `<th class="month">${label(k)}<div class="q">${quarter(k)}</div></th>`).join('');
  const cells = (f, extra = '') => ms.map(k => `<td>${extra === 'dir'
    ? `<select class="dir" data-k="dir" data-m="${k}" data-v="${esc(state.story[k]?.direction || '')}">${opts(DIRS, state.story[k]?.direction, '—')}</select>`
    : ta(`data-k="story" data-m="${k}" data-f="${f}"${extra}`, state.story[k]?.[f])}</td>`).join('');
  const lensRows = LENSES.map(l => `<tr><td class="rowlabel">${esc(l)}</td>${ms.map(k => `<td>${ta(`data-k="lens" data-m="${k}" data-lens="${esc(l)}"`, state.story[k]?.lenses?.[l])}</td>`).join('')}</tr>`).join('');
  return `<div><h2>Monthly story</h2><p class="note">One plain line per lens per month, 15 words or less. Read across a row to see the story change. Pick an overall direction for each month; it feeds the quarterly count.</p></div>
  <div class="scroll"><table><thead><tr><th class="rowlabel">Row</th>${head}</tr></thead><tbody>
  <tr><td class="rowlabel">Headline of the month</td>${cells('headline')}</tr>
  <tr><td class="rowlabel">Overall direction</td>${cells('direction', 'dir')}</tr>
  ${lensRows}
  <tr><td class="rowlabel">Decision or ask this month</td>${cells('decision')}</tr>
  <tr><td class="rowlabel">What we can't say yet</td>${cells('cantSay')}</tr>
  </tbody></table></div>
  <div class="row"><button type="button" data-act="add-month">Add ${label(addMonth(ms[ms.length - 1]))}</button></div>`;
}

function metricRow(m) {
  const c = calc(m);
  const vals = state.months.map(k => `<td class="num"><input type="number" step="any" data-k="mval" data-id="${m.id}" data-m="${k}" value="${esc(m.values[k] ?? '')}" aria-label="${esc(m.name)} ${label(k)}"></td>`).join('');
  return `<tr data-row="${m.id}">
  <td><select data-k="metric" data-id="${m.id}" data-f="lens">${opts(LENSES, m.lens, 'Lens')}</select></td>
  <td><input data-k="metric" data-id="${m.id}" data-f="name" value="${esc(m.name)}" placeholder="Metric name"></td>
  <td><input data-k="metric" data-id="${m.id}" data-f="unit" value="${esc(m.unit)}" placeholder="Unit"></td>
  <td><select data-k="metric" data-id="${m.id}" data-f="better">${opts(['Lower', 'Higher', 'Neither'], m.better)}</select></td>
  <td><select data-k="metric" data-id="${m.id}" data-f="rollup">${opts(['Average', 'Sum'], m.rollup)}</select></td>
  ${vals}
  <td class="calc" data-calc="latest">${fmt(c.latest)}</td><td class="calc" data-calc="ch">${fmt(c.ch)}</td><td class="calc center" data-calc="dir">${pill(c.dir)}</td>
  <td class="center"><button type="button" class="small danger" data-act="del-metric" data-id="${m.id}" aria-label="Delete ${esc(m.name)}">Delete</button></td></tr>`;
}
function viewMetrics() {
  const head = state.months.map(k => `<th class="num">${label(k)}</th>`).join('');
  const body = state.metrics.length ? state.metrics.map(metricRow).join('') : '';
  return `<div><h2>Metrics</h2><p class="note">Numbers by month. Leave a cell blank if the number is not available; blanks never count as zero. <b>Better when</b> says whether lower or higher is good. <b>Roll up</b> says whether a quarter adds its months or averages them.</p></div>
  ${state.metrics.length ? '' : '<div class="empty">No metrics yet. Add one, or load the sample data.</div>'}
  <div class="scroll"><table class="metrics"><thead><tr><th>Lens</th><th>Metric</th><th>Unit</th><th>Better when</th><th>Roll up</th>${head}<th>Latest</th><th>Change</th><th>Direction</th><th></th></tr></thead><tbody>${body}</tbody></table></div>
  <div class="row"><button type="button" data-act="add-metric">Add metric</button></div>`;
}

function viewAsks() {
  const rows = state.asks.map(a => `<tr>
  <td><input type="month" data-k="ask" data-id="${a.id}" data-f="raised" value="${esc(a.raised)}" placeholder="YYYY-MM"></td>
  <td>${ta(`data-k="ask" data-id="${a.id}" data-f="text"`, a.text)}</td>
  <td><select data-k="ask" data-id="${a.id}" data-f="lens">${opts(LENSES, a.lens, 'Lens')}</select></td>
  <td><input data-k="ask" data-id="${a.id}" data-f="owner" value="${esc(a.owner)}"></td>
  <td><input type="date" data-k="ask" data-id="${a.id}" data-f="decideBy" value="${esc(a.decideBy)}"></td>
  <td><select data-k="ask" data-id="${a.id}" data-f="status">${opts(['Open', 'Decided', 'Dropped'], a.status)}</select></td>
  <td><input type="month" data-k="ask" data-id="${a.id}" data-f="closed" value="${esc(a.closed)}" placeholder="YYYY-MM"></td>
  <td>${ta(`data-k="ask" data-id="${a.id}" data-f="outcome"`, a.outcome)}</td>
  <td class="center"><button type="button" class="small danger" data-act="del-ask" data-id="${a.id}">Delete</button></td></tr>`).join('');
  return `<div><h2>Asks and decisions</h2><p class="note">Every ask, who owns it, and how it ended. Decided asks count toward the quarter they closed in.</p></div>
  ${state.asks.length ? '' : '<div class="empty">No asks yet. Add one, or load the sample data.</div>'}
  <div class="scroll"><table class="asks"><thead><tr><th>Raised</th><th>Ask or decision</th><th>Lens</th><th>Owner</th><th>Decide by</th><th>Status</th><th>Closed</th><th>Outcome</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
  <div class="row"><button type="button" data-act="add-ask">Add ask</button></div>`;
}

function quarterData() {
  const qs = quarters();
  const monthsIn = q => state.months.filter(k => quarter(k) === q);
  const count = (q, f) => monthsIn(q).filter(k => f(state.story[k]?.direction || '')).length;
  const rows = state.metrics.filter(m => m.name).map(m => {
    const vals = qs.map(q => qValue(m, q));
    const have = vals.filter(v => v !== null);
    const ch = have.length > 1 ? round(have[have.length - 1] - have[have.length - 2]) : null;
    return { m, vals, ch, dir: dirOf(m.better, ch) };
  });
  return {
    qs, rows,
    logged: qs.map(q => count(q, d => d !== '')),
    safer: qs.map(q => count(q, d => d === 'Safer')),
    same: qs.map(q => count(q, d => d === 'Same')),
    less: qs.map(q => count(q, d => d === 'Less safe')),
    raised: qs.map(q => state.asks.filter(a => a.raised && quarter(a.raised) === q).length),
    decided: qs.map(q => state.asks.filter(a => a.status === 'Decided' && a.closed && quarter(a.closed) === q).length)
  };
}
function viewQuarter() {
  const d = quarterData();
  const n = d.qs.length;
  const cnt = (label, arr) => `<tr><td class="rowlabel">${label}</td>${arr.map(v => `<td class="center bold">${v}</td>`).join('')}<td></td><td></td></tr>`;
  const band = t => `<tr class="band"><td colspan="${n + 3}">${t}</td></tr>`;
  const metricRows = d.rows.map(r => `<tr><td class="rowlabel">${esc(r.m.name)} <span class="note">${esc(r.m.unit)}</span></td>${r.vals.map(v => `<td class="center">${fmt(v)}</td>`).join('')}<td class="center">${fmt(r.ch)}</td><td class="center">${pill(r.dir)}</td></tr>`).join('');
  const words = QWORDS.map(([f, t]) => `<tr><td class="rowlabel">${t}</td>${d.qs.map(q => `<td>${ta(`data-k="qtext" data-q="${q}" data-f="${f}"`, state.quarters[q]?.[f])}</td>`).join('')}<td></td><td></td></tr>`).join('');
  return `<div><h2>Quarterly roll-up</h2><p class="note">Calendar quarters, filled in from the other tabs. Write the five lines at the bottom yourself.</p></div>
  <div class="scroll"><table><thead><tr><th class="rowlabel"></th>${d.qs.map(q => `<th class="month">${q}</th>`).join('')}<th>Latest change</th><th>Direction</th></tr></thead><tbody>
  ${band('The story in months')}${cnt('Months logged', d.logged)}${cnt('Months safer', d.safer)}${cnt('Months the same', d.same)}${cnt('Months less safe', d.less)}
  ${band('Numbers, rolled up from Metrics')}${metricRows || `<tr><td class="rowlabel">No metrics yet</td><td colspan="${n + 2}"></td></tr>`}
  ${band('Asks and decisions')}${cnt('Asks raised', d.raised)}${cnt('Asks decided', d.decided)}
  ${band('The quarter in words (you write these)')}${words}
  </tbody></table></div>
  <div class="row"><button type="button" data-act="copy-summary">Copy a text summary of the latest quarter</button><span id="copy-note" class="note"></span></div>`;
}

function render() {
  document.querySelectorAll('.tabs [role=tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  const v = { story: viewStory, metrics: viewMetrics, asks: viewAsks, quarter: viewQuarter }[tab]();
  $('#view').innerHTML = v;
  document.querySelectorAll('#view textarea').forEach(t => { t.style.height = 'auto'; t.style.height = Math.max(62, t.scrollHeight + 2) + 'px'; });
}

// ---------- events
document.addEventListener('input', e => {
  const t = e.target, d = t.dataset;
  if (!d.k) return;
  if (d.k === 'story') { (state.story[d.m] ||= {})[d.f] = t.value; }
  else if (d.k === 'lens') { ((state.story[d.m] ||= {}).lenses ||= {})[d.lens] = t.value; }
  else if (d.k === 'metric') { const m = state.metrics.find(x => x.id === d.id); if (m) m[d.f] = t.value; refreshCalc(d.id); }
  else if (d.k === 'mval') { const m = state.metrics.find(x => x.id === d.id); if (m) { if (t.value === '') delete m.values[d.m]; else m.values[d.m] = Number(t.value); } refreshCalc(d.id); }
  else if (d.k === 'ask') { const a = state.asks.find(x => x.id === d.id); if (a) a[d.f] = t.value; }
  else if (d.k === 'qtext') { (state.quarters[d.q] ||= {})[d.f] = t.value; }
  else if (d.k === 'dir') { (state.story[d.m] ||= {}).direction = t.value; t.dataset.v = t.value; }
  if (t.tagName === 'TEXTAREA') { t.style.height = 'auto'; t.style.height = Math.max(62, t.scrollHeight + 2) + 'px'; }
  save();
});

function refreshCalc(id) {
  const m = state.metrics.find(x => x.id === id), row = $(`tr[data-row="${id}"]`);
  if (!m || !row) return;
  const c = calc(m);
  row.querySelector('[data-calc=latest]').textContent = fmt(c.latest);
  row.querySelector('[data-calc=ch]').textContent = fmt(c.ch);
  row.querySelector('[data-calc=dir]').innerHTML = pill(c.dir);
}

document.addEventListener('click', e => {
  const tabBtn = e.target.closest('[data-tab]');
  if (tabBtn) { tab = tabBtn.dataset.tab; render(); return; }
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'add-month') state.months.push(addMonth(state.months[state.months.length - 1]));
  else if (act === 'add-metric') state.metrics.push({ id: uid(), lens: '', name: '', unit: '', better: 'Lower', rollup: 'Average', values: {} });
  else if (act === 'del-metric') { if (!confirm('Delete this metric and its numbers?')) return; state.metrics = state.metrics.filter(m => m.id !== b.dataset.id); }
  else if (act === 'add-ask') state.asks.push({ id: uid(), raised: state.months[state.months.length - 1], text: '', lens: '', owner: '', decideBy: '', status: 'Open', closed: '', outcome: '' });
  else if (act === 'del-ask') { if (!confirm('Delete this ask?')) return; state.asks = state.asks.filter(a => a.id !== b.dataset.id); }
  else if (act === 'copy-summary') { copySummary(); return; }
  save(); render();
});

function summaryText() {
  const d = quarterData();
  const i = d.qs.length - 1, q = d.qs[i];
  const w = state.quarters[q] || {};
  const lines = [`Cyber update, ${q}`, ''];
  QWORDS.forEach(([f, t]) => { if (w[f]) lines.push(`${t}: ${w[f]}`); });
  lines.push('', `Months safer: ${d.safer[i]} of ${d.logged[i]} logged. Asks raised: ${d.raised[i]}. Asks decided: ${d.decided[i]}.`);
  const nums = d.rows.filter(r => r.vals[i] !== null).map(r => `- ${r.m.name}: ${fmt(r.vals[i])} ${r.m.unit}${r.dir ? ` (${r.dir.toLowerCase()} than last quarter)` : ''}`);
  if (nums.length) lines.push('', ...nums);
  return lines.join('\n');
}
async function copySummary() {
  const note = $('#copy-note'), text = summaryText();
  try { await navigator.clipboard.writeText(text); note.textContent = 'Copied.'; }
  catch { window.prompt('Copy this summary:', text); note.textContent = ''; }
}

// header actions
$('#btn-sample').addEventListener('click', () => {
  if (!confirm('Replace your current data with the sample data?')) return;
  state = JSON.parse(JSON.stringify(SAMPLE)); save(); render();
});
$('#btn-reset').addEventListener('click', () => {
  if (!confirm('Erase everything in this browser and start fresh?')) return;
  state = empty(); save(); render();
});
$('#btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `cyber-story-tracker-${todayYM()}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('#file-import').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const s = JSON.parse(r.result);
      if (!valid(s)) throw new Error('shape');
      state = s; save(); render();
    } catch { alert('That file is not a Cyber Story Tracker export.'); }
  };
  r.readAsText(f); e.target.value = '';
});

// ---------- sample data (made up, a fictional manufacturer)
const SAMPLE = {
  months: ['2026-08', '2026-09'],
  story: {
    '2026-09': {
      headline: 'We moved faster and got safer. One item needs a decision.',
      direction: 'Safer',
      lenses: {
        'Risk reduction, and how': 'Fewer serious problems than last month.',
        'Velocity': 'Vendors approved in 12 days, down from 17.',
        'Resource allocation': 'Most effort went to supplier reviews. One budget decision needed.',
        'Accountability': 'Every open ask has an owner and a date.',
        'Assurance and compliance': 'Audit passed with one minor finding.',
        'Third-party risk': 'Two key suppliers approved. One still pending.',
        'Resilience': 'Not enough data yet.',
        'Trend and confidence': "Figures come from system records. Last month's baseline needs a source.",
        'Cost and avoided loss': 'Not shown yet.',
        'Forward look and asks': 'One decision needed: lab computer budget.'
      },
      decision: 'Budget to replace an unsupported lab computer. Owner: CIO. Decide by Oct 31.',
      cantSay: 'August baseline has no source. Phishing results not compared, samples differ.'
    }
  },
  metrics: [
    { id: 'm1', lens: 'Velocity', name: 'Time to approve a vendor', unit: 'business days', better: 'Lower', rollup: 'Average', values: { '2026-08': 17, '2026-09': 12 } },
    { id: 'm2', lens: 'Velocity', name: 'Customer questionnaire turnaround (median)', unit: 'days', better: 'Lower', rollup: 'Average', values: { '2026-09': 4 } },
    { id: 'm3', lens: 'Third-party risk', name: 'Key suppliers approved', unit: 'count', better: 'Higher', rollup: 'Sum', values: { '2026-09': 2 } },
    { id: 'm4', lens: 'Risk reduction, and how', name: 'Fixes running late', unit: 'count', better: 'Lower', rollup: 'Average', values: { '2026-09': 2 } },
    { id: 'm5', lens: 'Risk reduction, and how', name: 'Factory downtime taken to close a risk', unit: 'minutes', better: 'Lower', rollup: 'Sum', values: { '2026-09': 25 } },
    { id: 'm6', lens: 'Assurance and compliance', name: 'Access reviews completed', unit: '% of due', better: 'Higher', rollup: 'Average', values: { '2026-09': 86 } },
    { id: 'm7', lens: 'Resilience', name: 'Incidents handled', unit: 'count', better: 'Neither', rollup: 'Sum', values: { '2026-09': 4 } }
  ],
  asks: [
    { id: 'a1', raised: '2026-09', text: 'Budget to replace an unsupported lab computer', lens: 'Resource allocation', owner: 'CIO (sample)', decideBy: '2026-10-31', status: 'Open', closed: '', outcome: '' },
    { id: 'a2', raised: '2026-09', text: 'Close the serious remote-access flaw. Safeguards in place until 10/10', lens: 'Risk reduction, and how', owner: 'IT lead (sample)', decideBy: '2026-10-10', status: 'Open', closed: '', outcome: '' }
  ],
  quarters: { 'Q3 2026': { headline: 'First report: vendor approvals got faster. One budget decision still open. (Sample, partial quarter.)' } }
};

render();
})();
