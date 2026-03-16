/* ═══════════════════════════════════════════
   Ask-Us — script.js  (all 5 new features)
   ═══════════════════════════════════════════ */

const API = 'http://localhost:8000';

let chartInstances = [];
let queryCount     = 0;
let isLoading      = false;
let isDark         = false;
let queryHistory   = [];   // ← Feature: Query History

const PALETTE_LIGHT = ['#C1654A','#C9962C','#7A9E7E','#C4956A','#8B6652','#5C3D2E','#A0522D','#6B8E6B','#D4956A','#4A7C59'];
const PALETTE_DARK  = ['#E8856A','#E8B24C','#9ABE9E','#E4B58A','#AABB9E','#C4956A','#D4956A','#7A9E7E','#C1654A','#6BAA7E'];

// ── Loading tips ──────────────────────────────────────────
// Feature: Loading Tips
const LOADING_TIPS = [
  "💡 You can ask follow-up questions to refine your charts!",
  "📊 Try asking 'Show only India data' to filter results.",
  "🎯 Mention a specific metric like 'views' or 'likes' for focused charts.",
  "📁 Upload your own CSV to analyse your real data!",
  "🔍 Ask 'Compare categories' to see a side-by-side chart.",
  "💬 Use plain English — no technical terms needed!",
  "🧞 The AI picks the best chart type for your question automatically.",
  "📈 Ask about trends over time to get a line chart.",
  "🏆 Ask 'Which category is best?' to get a ranked bar chart.",
  "✨ Toggle Follow-up mode ON to refine your last dashboard.",
];

function randomTip() {
  return LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
}

// ── DOM refs ──────────────────────────────────────────────
const sendBtn        = document.getElementById('sendBtn');
const queryInput     = document.getElementById('queryInput');
const chartsGrid     = document.getElementById('chartsGrid');
const chartsContainer= document.getElementById('chartsContainer');
const insightsRow    = document.getElementById('insightsRow');
const loadingState   = document.getElementById('loadingState');
const welcomeScreen  = document.getElementById('welcomeScreen');
const chatHistory    = document.getElementById('chatHistory');
const followUpToggle = document.getElementById('followUpToggle');
const followUpBadge  = document.getElementById('followUpBadge');
const sidebar        = document.getElementById('sidebar');
const statusDot      = document.getElementById('statusDot');
const statusText     = document.getElementById('statusText');
const csvInput       = document.getElementById('csvInput');
const uploadZone     = document.getElementById('uploadZone');
const schemaList     = document.getElementById('schemaList');
const historyList    = document.getElementById('historyList');
const loadingTip     = document.getElementById('loadingTip');

// ── Feature: Dark / Light Mode ────────────────────────────
document.getElementById('themeToggleBtn').addEventListener('click', () => {
  isDark = !isDark;
  document.getElementById('htmlRoot').classList.toggle('dark', isDark);
  document.getElementById('themeIcon').textContent  = isDark ? '☀️' : '🌙';
  document.getElementById('themeLabel').textContent = isDark ? 'Light Mode' : 'Dark Mode';
  // Redraw charts with new palette
  if (chartInstances.length > 0) {
    showToast('🎨 Theme changed — refreshing charts…', 'info');
  }
});

// ── Feature: Animation Toggle ─────────────────────────────
const animToggle = document.getElementById('animToggle');
function getAnimDuration() {
  return animToggle.checked ? 700 : 0;
}

// ── Health check ──────────────────────────────────────────
async function checkHealth() {
  try {
    const r = await fetch(`${API}/health`);
    const d = await r.json();
    statusDot.className = 'dot dot-green';
    statusText.textContent = d.gemini_configured ? 'AI Connected ✓' : 'Demo Mode';
    document.getElementById('modelBadge').textContent = 'Gemini AI';
    document.getElementById('sumRows').textContent = d.rows.toLocaleString();
    renderSchema(['timestamp','video_id','category','language','region',
                  'duration_sec','views','likes','comments','shares',
                  'sentiment_score','ads_enabled']);
  } catch {
    statusDot.className = 'dot dot-red';
    statusText.textContent = 'Not connected';
    showToast('⚠️ Cannot reach the backend. Please start it in Terminal 1.', 'warn');
  }
}

function renderSchema(cols) {
  schemaList.innerHTML = cols.map(c =>
    `<div class="schema-item"><div class="schema-dot"></div><span>${c}</span></div>`
  ).join('');
  document.getElementById('sumCols').textContent = cols.length;
}

// ── Feature: Query History ────────────────────────────────
function addToHistory(query) {
  queryHistory.unshift(query);
  if (queryHistory.length > 8) queryHistory.pop();
  renderHistory();
}

function renderHistory() {
  if (queryHistory.length === 0) {
    historyList.innerHTML = `<div style="font-size:0.75rem;color:var(--text3);padding:4px 0">No queries yet — ask something below!</div>`;
    return;
  }
  historyList.innerHTML = queryHistory.map((q, i) =>
    `<div class="history-item" onclick="rerunQuery(${i})" title="Click to re-run">
       <div class="history-num">${i + 1}</div>
       <div class="history-text">${esc(q)}</div>
     </div>`
  ).join('');
}

window.rerunQuery = function(idx) {
  queryInput.value = queryHistory[idx];
  queryInput.focus();
  showToast('💡 Query loaded — press Ask to run it!', 'info');
};

window.clearHistory = function() {
  queryHistory = [];
  renderHistory();
  showToast('🗑️ History cleared', 'info');
};

// ── Feature: Summary Card ─────────────────────────────────
function updateSummaryCard(data) {
  // Try to extract top category from insights or charts
  if (data && data.charts && data.charts.length > 0) {
    const firstChart = data.charts[0];
    if (firstChart.labels && firstChart.labels.length > 0) {
      const topLabel = firstChart.labels[0];
      if (topLabel && topLabel.length < 20) {
        document.getElementById('sumTopCat').textContent = topLabel;
      }
    }
  }
  document.getElementById('sumQueries').textContent = queryCount;
}

// ── Sidebar toggle ────────────────────────────────────────
document.getElementById('toggleBtn').addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

// ── Follow-up toggle ──────────────────────────────────────
followUpToggle.addEventListener('change', () => {
  followUpBadge.classList.toggle('show', followUpToggle.checked);
});

// ── Demo pills ────────────────────────────────────────────
document.querySelectorAll('.demo-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    queryInput.value = pill.dataset.q;
    queryInput.focus();
  });
});

// ── CSV Upload ────────────────────────────────────────────
uploadZone.addEventListener('click', () => csvInput.click());
uploadZone.addEventListener('dragover',  e => { e.preventDefault(); uploadZone.style.borderColor = 'var(--brown3)'; });
uploadZone.addEventListener('dragleave', () => { uploadZone.style.borderColor = ''; });
uploadZone.addEventListener('drop', e => {
  e.preventDefault(); uploadZone.style.borderColor = '';
  if (e.dataTransfer.files[0]) uploadCSV(e.dataTransfer.files[0]);
});
csvInput.addEventListener('change', () => { if (csvInput.files[0]) uploadCSV(csvInput.files[0]); });

async function uploadCSV(file) {
  showToast('⏳ Uploading your file…', 'info');
  const fd = new FormData();
  fd.append('file', file);
  try {
    const r = await fetch(`${API}/upload-csv`, { method: 'POST', body: fd });
    const d = await r.json();
    if (!r.ok) throw new Error(d.detail || 'Upload failed');
    showToast(`✅ ${d.message}`, 'success');
    document.getElementById('datasetName').textContent = file.name.replace('.csv','');
    document.getElementById('datasetSub').textContent  = `${d.rows} rows · ${d.columns.length} columns`;
    document.getElementById('sumRows').textContent     = d.rows.toLocaleString();
    renderSchema(d.columns);
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
  }
}

// ── Reset ─────────────────────────────────────────────────
document.getElementById('resetBtn').addEventListener('click', async () => {
  await fetch(`${API}/reset`, { method: 'POST' });
  showToast('↺ Reset to sample YouTube data', 'success');
  document.getElementById('datasetName').textContent = 'YouTube Sample';
  document.getElementById('sumRows').textContent = '40';
  renderSchema(['timestamp','video_id','category','language','region',
                'duration_sec','views','likes','comments','shares',
                'sentiment_score','ads_enabled']);
  checkHealth();
});

// ── Send query ────────────────────────────────────────────
sendBtn.addEventListener('click', sendQuery);
queryInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuery(); }
});

async function sendQuery() {
  const q = queryInput.value.trim();
  if (!q || isLoading) return;

  isLoading = true;
  sendBtn.disabled = true;
  queryCount++;
  document.getElementById('queryCount').textContent = `${queryCount} question${queryCount > 1 ? 's' : ''} asked`;
  document.getElementById('sumQueries').textContent = queryCount;

  addToHistory(q);         // ← Feature: add to history
  appendBubble(q, 'user');
  queryInput.value = '';
  queryInput.style.height = 'auto';

  // Feature: Random loading tip
  loadingTip.textContent = randomTip();

  welcomeScreen.style.display = 'none';
  chartsGrid.classList.remove('active');
  loadingState.classList.add('active');

  try {
    const r = await fetch(`${API}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, follow_up: followUpToggle.checked }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.detail || 'Something went wrong');
    renderDashboard(d);
    updateSummaryCard(d);   // ← Feature: update summary card
    appendBubble(`Done! Here are ${d.charts.length} charts based on your question.`, 'ai');
  } catch (err) {
    loadingState.classList.remove('active');
    welcomeScreen.style.display = 'flex';
    appendBubble(`Sorry, something went wrong: ${err.message}`, 'ai');
    showToast(`❌ ${err.message}`, 'error');
  } finally {
    isLoading = false;
    sendBtn.disabled = false;
  }
}

// ── Render dashboard ──────────────────────────────────────
function renderDashboard(data) {
  chartInstances.forEach(c => c.destroy());
  chartInstances = [];

  insightsRow.innerHTML = '';
  (data.insights || []).forEach((ins, i) => {
    const div = document.createElement('div');
    div.className = 'insight-card';
    div.style.animationDelay = `${i * 80}ms`;
    div.textContent = ins;
    insightsRow.appendChild(div);
  });

  chartsContainer.innerHTML = '';
  const n = data.charts.length;
  chartsContainer.style.gridTemplateColumns = n === 1 ? '1fr' : '1fr 1fr';

  data.charts.forEach((chart, idx) => {
    const card = document.createElement('div');
    card.className = 'chart-card';
    card.style.animationDelay = `${idx * 100}ms`;
    card.innerHTML = `
      <div class="chart-card-header">
        <div class="chart-title">${esc(chart.title)}</div>
        <span class="chart-type-badge">${chart.type} chart</span>
        <button class="chart-dl-btn" onclick="downloadChart(${idx})" title="Download this chart">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
        </button>
      </div>
      <div class="chart-wrapper"><canvas id="chart-${idx}"></canvas></div>
    `;
    chartsContainer.appendChild(card);
    setTimeout(() => {
      const canvas = document.getElementById(`chart-${idx}`);
      if (canvas) chartInstances.push(buildChart(canvas, chart));
    }, 60);
  });

  loadingState.classList.remove('active');
  chartsGrid.classList.add('active');
}

// ── Build Chart.js chart ──────────────────────────────────
function buildChart(canvas, cfg) {
  const ctx    = canvas.getContext('2d');
  const isPie  = cfg.type === 'pie' || cfg.type === 'doughnut';
  const pal    = isDark ? PALETTE_DARK : PALETTE_LIGHT;  // ← respects dark mode
  const animDur = getAnimDuration();                      // ← respects anim toggle

  let datasets;
  if (isPie) {
    datasets = [{
      label: cfg.datasets?.[0]?.label || 'Value',
      data: cfg.datasets?.[0]?.data || [],
      backgroundColor: pal.slice(0, (cfg.labels || []).length).map(c => c + 'DD'),
      borderColor: isDark ? '#231E1A' : '#FAF6F0',
      borderWidth: 3, hoverOffset: 10,
    }];
  } else {
    datasets = (cfg.datasets || []).map((ds, i) => {
      const color  = pal[i % pal.length];
      const isLine = cfg.type === 'line';
      return {
        label: ds.label,
        data: ds.data,
        backgroundColor: isLine ? color + '25' : pal.map(c => c + 'CC')[i % pal.length],
        borderColor: color,
        borderWidth: isLine ? 2.5 : 0,
        fill: isLine, tension: 0.4,
        pointBackgroundColor: color,
        pointRadius: isLine ? 4 : 0,
        pointHoverRadius: isLine ? 7 : 0,
        borderRadius: isLine ? 0 : 6,
      };
    });
  }

  const tickColor  = isDark ? '#8A7060' : '#9C7B6B';
  const gridColor  = isDark ? '#3A2E24' : '#E8DDD0';
  const tooltipBg  = isDark ? '#231E1A' : '#FFFCF8';
  const tooltipFg  = isDark ? '#F0E6D8' : '#2C1810';
  const tooltipBdr = isDark ? '#A0724A' : '#C4956A';

  return new Chart(ctx, {
    type: cfg.type,
    data: { labels: cfg.labels || [], datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: animDur, easing: 'easeInOutQuart' },  // ← anim toggle
      plugins: {
        legend: {
          display: true,
          position: isPie ? 'right' : 'top',
          labels: {
            color: tickColor,
            font: { family: 'Inter', size: 11 },
            boxWidth: 12, padding: 12,
          },
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: tooltipFg,
          bodyColor: tickColor,
          borderColor: tooltipBdr,
          borderWidth: 1, padding: 10, cornerRadius: 8,
          titleFont: { family: 'Lora', size: 13 },
          bodyFont:  { family: 'Inter', size: 12 },
          callbacks: {
            label: ctx => {
              const v = ctx.parsed?.y ?? ctx.parsed;
              if (typeof v === 'number') return `  ${v.toLocaleString()}`;
              return `  ${v}`;
            }
          }
        },
      },
      scales: isPie ? {} : {
        x: {
          grid: { color: gridColor, drawBorder: false },
          ticks: { color: tickColor, font: { family: 'Inter', size: 10 }, maxRotation: 35, autoSkip: true, maxTicksLimit: 10 },
        },
        y: {
          grid: { color: gridColor, drawBorder: false },
          ticks: {
            color: tickColor, font: { family: 'Inter', size: 10 },
            callback: v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(1)}k` : v,
          },
        },
      },
    },
  });
}

// ── Download single chart ─────────────────────────────────
window.downloadChart = function(idx) {
  const canvas = document.getElementById(`chart-${idx}`);
  if (!canvas) return;
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `ask-us-chart-${idx + 1}.png`;
  a.click();
};

// ── Export PNG ────────────────────────────────────────────
document.getElementById('exportPngBtn').addEventListener('click', async () => {
  if (!chartsGrid.classList.contains('active')) {
    showToast('💡 Ask a question first to generate a dashboard!', 'info'); return;
  }
  showToast('📸 Saving your dashboard…', 'info');
  const canvas = await html2canvas(chartsGrid, {
    backgroundColor: isDark ? '#1A1512' : '#FAF6F0', scale: 2
  });
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'ask-us-dashboard.png';
  a.click();
  showToast('✅ Dashboard saved as PNG!', 'success');
});

// ── Export HTML ───────────────────────────────────────────
document.getElementById('exportHtmlBtn').addEventListener('click', () => {
  if (!chartsGrid.classList.contains('active')) {
    showToast('💡 Ask a question first to generate a dashboard!', 'info'); return;
  }
  const imgs = chartInstances.map((_, i) => {
    const el = document.getElementById(`chart-${i}`);
    return el ? `<img src="${el.toDataURL()}" style="max-width:100%;border-radius:12px;margin:8px;" />` : '';
  }).join('');
  const bg = isDark ? '#1A1512' : '#FAF6F0';
  const fg = isDark ? '#F0E6D8' : '#2C1810';
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Ask-Us Dashboard</title>
<style>body{background:${bg};color:${fg};font-family:Georgia,serif;padding:30px;}
h1{color:#C1654A;font-size:1.8rem;margin-bottom:8px;}
p{color:#9C7B6B;font-size:.85rem;margin-bottom:24px;}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
img{border-radius:12px;border:1.5px solid #E8DDD0;}</style></head>
<body><h1>🧞 Ask-Us Dashboard</h1>
<p>Exported on ${new Date().toLocaleString()} — Ask-Us × GFG Hackathon 2024</p>
<div class="grid">${imgs}</div></body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ask-us-dashboard.html';
  a.click();
  showToast('✅ Dashboard saved as HTML!', 'success');
});

// ── Chat bubbles ──────────────────────────────────────────
function appendBubble(text, role) {
  const div = document.createElement('div');
  div.className = `msg msg-${role}`;
  div.innerHTML = role === 'ai'
    ? `<span class="msg-label" style="color:var(--terra)">Ask-Us</span>${esc(text)}`
    : `<span class="msg-label" style="color:var(--text3)">You</span>${esc(text)}`;
  chatHistory.appendChild(div);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

// ── Toast ─────────────────────────────────────────────────
function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  const colors = { success:'#7A9E7E', error:'#C1654A', warn:'#C9962C', info:'#C4956A' };
  t.style.borderColor = colors[type] || colors.info;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

// ── Escape HTML ───────────────────────────────────────────
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Auto-resize textarea ──────────────────────────────────
queryInput.addEventListener('input', () => {
  queryInput.style.height = 'auto';
  queryInput.style.height = Math.min(queryInput.scrollHeight, 110) + 'px';
});

// ── Init ──────────────────────────────────────────────────
checkHealth();
setInterval(checkHealth, 30000);