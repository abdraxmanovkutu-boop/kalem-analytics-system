const STORAGE_KEY = 'kalemAnalytics';
const ADMIN_TOKEN = 'kalemAdminAuth';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'Kalem2026!';

function isLoginPage() {
  return location.pathname.endsWith('login.html');
}

function requireAuth() {
  if (!isLoginPage() && sessionStorage.getItem(ADMIN_TOKEN) !== 'ok') {
    location.href = 'login.html';
  }
}

function bindLogin() {
  const form = document.getElementById('adminLoginForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('adminUser').value.trim();
    const pass = document.getElementById('adminPass').value.trim();
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      sessionStorage.setItem(ADMIN_TOKEN, 'ok');
      location.href = 'dashboard.html';
    } else {
      alert('Неверный логин или пароль');
    }
  });
}

function getData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function sumValues(obj = {}) {
  return Object.values(obj).reduce((acc, val) => acc + Number(val || 0), 0);
}

function updateMetrics(data) {
  const visits = Number(data.visits || 0);
  const pageViews = sumValues(data.pageViews || {});
  const clicks = Number(data.clicks || 0);
  const favorites = Number(data.favorites || 0);
  const orders = Number(data.orders || 0);
  const productCount = Object.keys(data.products || {}).length;
  const surveyCount = (data.surveyEntries || []).length;
  const conversion = visits ? ((orders / visits) * 100).toFixed(1) : '0.0';

  setText('visitsValue', visits);
  setText('pageViewsValue', pageViews);
  setText('clicksValue', clicks);
  setText('favoritesValue', favorites);
  setText('ordersValue', orders);
  setText('productsCountValue', productCount);
  setText('surveyCount', surveyCount);
  setText('conversionValue', `${conversion}%`);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function getLastDaysMap(data, days = 7) {
  const map = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map[key] = Number((data.dailyVisits || {})[key] || 0);
  }
  return map;
}

function renderVisitsChart(data) {
  const svg = document.getElementById('visitsChart');
  if (!svg) return;
  const pointsMap = getLastDaysMap(data, 7);
  const entries = Object.entries(pointsMap);
  const values = entries.map(([, v]) => v);
  const max = Math.max(...values, 5);
  const width = 700;
  const height = 240;
  const padX = 40;
  const padY = 28;
  const stepX = (width - padX * 2) / (entries.length - 1 || 1);
  const points = entries.map(([, value], index) => {
    const x = padX + index * stepX;
    const y = height - padY - ((value / max) * (height - padY * 2));
    return `${x},${y}`;
  }).join(' ');

  const grid = [0,1,2,3,4].map(i => {
    const y = padY + i * ((height - padY * 2) / 4);
    return `<line x1="${padX}" y1="${y}" x2="${width-padX}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
  }).join('');

  const labels = entries.map(([day], index) => {
    const x = padX + index * stepX;
    const label = day.slice(5);
    return `<text x="${x}" y="226" fill="rgba(255,255,255,0.6)" font-size="12" text-anchor="middle">${label}</text>`;
  }).join('');

  const dots = entries.map(([, value], index) => {
    const x = padX + index * stepX;
    const y = height - padY - ((value / max) * (height - padY * 2));
    return `<circle cx="${x}" cy="${y}" r="5" fill="#29d5bd" stroke="#6fa8ff" stroke-width="3"/>`;
  }).join('');

  svg.innerHTML = `
    ${grid}
    <polyline fill="none" stroke="url(#gradient)" stroke-width="4" points="${points}" stroke-linecap="round" stroke-linejoin="round"></polyline>
    ${dots}
    ${labels}
    <defs>
      <linearGradient id="gradient" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stop-color="#6fa8ff"/>
        <stop offset="100%" stop-color="#29d5bd"/>
      </linearGradient>
    </defs>
  `;
}

function renderAge(data) {
  const entries = data.surveyEntries || [];
  const groups = {
    'до 18': 0,
    '18–24': 0,
    '25–34': 0,
    '35+': 0
  };
  entries.forEach(item => {
    const age = Number(item.age || 0);
    if (age < 18) groups['до 18'] += 1;
    else if (age <= 24) groups['18–24'] += 1;
    else if (age <= 34) groups['25–34'] += 1;
    else groups['35+'] += 1;
  });

  const total = Object.values(groups).reduce((a, b) => a + b, 0) || 1;
  const colors = ['#6fa8ff', '#29d5bd', '#ffc84d', '#f77ca1'];
  const segments = Object.values(groups).map(v => (v / total) * 100);
  let cumulative = 0;
  const pieces = segments.map((value, i) => {
    const start = cumulative;
    cumulative += value;
    return `${colors[i]} ${start}% ${cumulative}%`;
  }).join(', ');

  const donut = document.getElementById('ageDonut');
  if (donut) donut.style.background = `conic-gradient(${pieces})`;

  const legend = document.getElementById('ageLegend');
  if (legend) {
    legend.innerHTML = Object.entries(groups).map(([label, val], i) => `
      <div class="legend-item">
        <div><span class="dot" style="background:${colors[i]}"></span>${label}</div>
        <strong>${val}</strong>
      </div>
    `).join('');
  }
}

function renderRegions(data) {
  const regionCounts = {};
  (data.surveyEntries || []).forEach(item => {
    const key = item.region || 'Не указано';
    regionCounts[key] = (regionCounts[key] || 0) + 1;
  });
  const sorted = Object.entries(regionCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = Math.max(...sorted.map(([, v]) => v), 1);
  const wrap = document.getElementById('regionBars');
  if (!wrap) return;
  wrap.innerHTML = sorted.length ? sorted.map(([label, value]) => `
    <div class="bar-row">
      <div class="bar-label"><span>${label}</span><strong>${value}</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width:${(value/max)*100}%"></div></div>
    </div>
  `).join('') : '<p style="color:var(--muted)">Пока нет данных по регионам.</p>';
}

function renderProducts(data) {
  const body = document.getElementById('productsTableBody');
  if (!body) return;
  const rows = Object.entries(data.products || {}).sort((a, b) => (b[1].views + b[1].orders) - (a[1].views + a[1].orders));
  body.innerHTML = rows.length ? rows.map(([name, stat]) => `
    <tr>
      <td>${name}</td>
      <td>${stat.views || 0}</td>
      <td>${stat.favorites || 0}</td>
      <td>${stat.orders || 0}</td>
    </tr>
  `).join('') : '<tr><td colspan="4" style="color:var(--muted)">Пока нет статистики по товарам.</td></tr>';
}

function bindDashboardActions() {
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    sessionStorage.removeItem(ADMIN_TOKEN);
    location.href = 'login.html';
  });
  document.getElementById('resetDataBtn')?.addEventListener('click', () => {
    if (confirm('Удалить все сохранённые данные аналитики?')) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  });
}

function initDashboard() {
  if (isLoginPage()) return;
  const data = getData();
  updateMetrics(data);
  renderVisitsChart(data);
  renderAge(data);
  renderRegions(data);
  renderProducts(data);
  bindDashboardActions();
}

requireAuth();
bindLogin();
initDashboard();
