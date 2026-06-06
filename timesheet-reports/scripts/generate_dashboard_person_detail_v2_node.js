const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(BASE, 'config.json'), 'utf8'));
const COMPANY = cfg.company?.name || 'PT TwinK Digital Indonesia';

const MONTH_ID = {1:'Januari',2:'Februari',3:'Maret',4:'April',5:'Mei',6:'Juni',7:'Juli',8:'Agustus',9:'September',10:'Oktober',11:'November',12:'Desember'};
const DAY_NAMES = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function safeJson(o){ return JSON.stringify(o).replace(/</g, '\\u003c'); }
function fmt(n){ return Number(n || 0).toLocaleString('id-ID', {maximumFractionDigits:1}); }
function arg(name){ const i = process.argv.indexOf(`--${name}`); return i >= 0 && i+1 < process.argv.length ? process.argv[i+1] : null; }
function dow(year, month, day){ return new Date(Date.UTC(year, month-1, day)).getUTCDay(); }
function firstDowMon(year, month){ return (dow(year, month, 1) + 6) % 7; }
function daysInMonth(year, month){ return new Date(Date.UTC(year, month, 0)).getUTCDate(); }

function makePayload(data){
  const people = Object.entries(data.staff || {}).map(([name, s]) => {
    const tasks = (s.tasks || []).slice().sort((a,b)=>(a.day||0)-(b.day||0) || String(a.project||'').localeCompare(String(b.project||'')));
    const projectRows = Object.entries(s.projects || {}).sort((a,b)=>Number(b[1])-Number(a[1]));
    const taskTypes = {};
    for(const t of tasks) taskTypes[t.task || 'Unspecified'] = (taskTypes[t.task || 'Unspecified'] || 0) + Number(t.time || 0);
    return {
      name,
      total_hours: Number(s.total_hours || 0),
      utilization: Number(s.utilization || (data.expected_hours ? (s.total_hours || 0) / data.expected_hours * 100 : 0)),
      daily: s.daily || {},
      projects: s.projects || {},
      projectRows,
      taskTypes: Object.entries(taskTypes).sort((a,b)=>b[1]-a[1]),
      tasks
    };
  }).sort((a,b)=>b.total_hours-a.total_hours || a.name.localeCompare(b.name));

  const projectTotals = {};
  for(const p of people) for(const [k,v] of Object.entries(p.projects || {})) projectTotals[k] = (projectTotals[k] || 0) + Number(v || 0);
  const projectRowsAll = Object.entries(projectTotals).sort((a,b)=>b[1]-a[1]);

  const totalHours = people.reduce((a,p)=>a+p.total_hours,0);
  const aboveTarget = people.filter(p=>p.total_hours >= Number(data.expected_hours || 0)).length;

  return {
    company: COMPANY,
    year: Number(data.year),
    month_num: Number(data.month_num),
    month_name: MONTH_ID[data.month_num] || data.month,
    numDays: daysInMonth(Number(data.year), Number(data.month_num)),
    expected_hours: Number(data.expected_hours || 0),
    working_days: Number(data.working_days || 0),
    holidays: data.holidays || {},
    saturdays: data.saturdays || [],
    sundays: data.sundays || [],
    dayNames: DAY_NAMES,
    people,
    projectRowsAll,
    totalHours,
    aboveTarget
  };
}

const CSS = `
:root{--bg:#f0f4ff;--card:#fff;--ink:#223047;--muted:#64748b;--line:#e2e8f0;--blue:#2563eb;--violet:#7c3aed;--green:#16a34a;--red:#dc2626;--amber:#d97706;--shadow:0 16px 45px rgba(37,99,235,.10)}
*{box-sizing:border-box}body{margin:0;background:linear-gradient(135deg,#eef2ff,#f8fafc 48%,#ecfeff);font-family:Segoe UI,system-ui,Arial,sans-serif;color:var(--ink)}
.hdr{background:linear-gradient(135deg,#4f46e5,#7c3aed,#0891b2);color:white;padding:28px 32px;display:flex;gap:18px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.hdr h1{margin:0;font-size:26px}.hdr p{margin:5px 0 0;opacity:.86}
.badges{display:flex;gap:10px;flex-wrap:wrap}
.bdg{background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);border-radius:14px;padding:10px 14px;min-width:92px;text-align:center}
.bdg b{font-size:22px;display:block}.bdg span{font-size:11px;opacity:.84}
.wrap{max-width:1320px;margin:0 auto;padding:22px}
.notice{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:16px;padding:12px 16px;margin-bottom:16px;font-weight:700}
.grid{display:grid;gap:14px}.stats{grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin:14px 0}
.card,.panel{background:rgba(255,255,255,.95);border:1px solid var(--line);border-radius:20px;padding:18px;box-shadow:var(--shadow)}
.card b{font-size:28px;display:block}.card small{color:var(--muted);font-weight:650}
.sec{margin:28px 0 12px;font-size:12px;color:var(--muted);font-weight:900;letter-spacing:1px;text-transform:uppercase}
.control{display:grid;grid-template-columns:minmax(240px,420px) 1fr;gap:14px;align-items:end}
.control label{font-size:12px;color:var(--muted);font-weight:900;text-transform:uppercase;letter-spacing:.8px}
.control select{width:100%;margin-top:7px;padding:13px 14px;border:1px solid #cbd5e1;border-radius:14px;background:#f8fafc;font-size:15px}
.hint{color:var(--muted);line-height:1.45}
.split{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.barrow{display:grid;grid-template-columns:minmax(150px,310px) 1fr 72px;gap:10px;align-items:center;margin:10px 0}
.barrow label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px;color:#334155}
.barbox{height:24px;background:#eef2ff;border-radius:999px;overflow:hidden}
.bar{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--blue),var(--violet));min-width:3px}
.barrow span:last-child{text-align:right;font-weight:800}
.calendar{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.dow{text-align:center;font-size:12px;color:var(--muted);font-weight:900}
.day{min-height:82px;border:1px solid var(--line);border-radius:14px;background:#f8fafc;padding:8px;position:relative}
.day.empty{background:transparent;border:0}.day.sat{background:#fef9c3;border-color:#fde68a}.day.sun{background:#ffedd5;border-color:#fdba74}
.day.holiday{background:#fee2e2;border-color:#fca5a5}.day.active{background:#dbeafe;border-color:#60a5fa;box-shadow:inset 0 0 0 2px rgba(37,99,235,.15)}
.day strong{font-size:14px}.day small{display:block;font-size:10px;color:var(--muted);margin-top:3px}
.day em{display:block;font-style:normal;font-size:10px;line-height:1.1;color:#991b1b;font-weight:800;margin-top:3px}
.day b{position:absolute;right:8px;bottom:7px;color:#1d4ed8;font-size:13px}
.tablewrap{overflow:auto;border:1px solid var(--line);border-radius:16px}
table{width:100%;border-collapse:collapse;background:white}
th,td{padding:10px 11px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{background:#f8fafc;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.6px}td{font-size:13px}
.pill{display:inline-block;border-radius:999px;background:#eef2ff;color:#3730a3;padding:4px 8px;font-weight:800}
.good{color:var(--green)}.bad{color:var(--red)}.warn{color:var(--amber)}
.footer{color:var(--muted);font-size:12px;text-align:center;margin:24px 0 6px}
@media(max-width:900px){.control,.split{grid-template-columns:1fr}.barrow{grid-template-columns:1fr}.barrow span:last-child{text-align:left}.wrap{padding:12px}.hdr{padding:22px 18px}.day{min-height:68px;padding:5px}.calendar{gap:3px}}
`;

const JS = `
const DATA=__DATA__;
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function person(){return DATA.people.find(p=>p.name===document.getElementById('ps').value)||DATA.people[0];}
function wkFilled(p){const sat=new Set(DATA.saturdays),sun=new Set(DATA.sundays);return Object.entries(p.daily||{}).filter(([d,h])=>Number(h)>0&&!sat.has(Number(d))&&!sun.has(Number(d))).length;}
function statusOf(p){const t=DATA.expected_hours;if(p.total_hours>=t*1.1)return['Excellent','good'];if(p.total_hours>=t)return['Lengkap','good'];if(p.total_hours>=t*.9)return['Hampir','warn'];return['Kurang','bad'];}

function renderStats(p){
  const diff=p.total_hours-DATA.expected_hours;
  const filled=wkFilled(p);
  const st=statusOf(p);
  const taskCount=(p.tasks||[]).length;
  const prjCount=Object.keys(p.projects||{}).length;
  document.getElementById('stats').innerHTML=
    '<div class="card"><b>'+esc(fmt(p.total_hours))+'</b><small>Total jam tercatat</small></div>'+
    '<div class="card"><b class="'+(p.utilization>=100?'good':p.utilization>=90?'warn':'bad')+'">'+esc(fmt(p.utilization))+'%</b><small>Utilisasi vs target</small></div>'+
    '<div class="card"><b class="'+(diff>=0?'good':'bad')+'">'+(diff>=0?'+':'')+esc(fmt(diff))+'j</b><small>Selisih dari target</small></div>'+
    '<div class="card"><b>'+filled+'/'+DATA.working_days+'</b><small>Hari kerja ada input</small></div>'+
    '<div class="card"><b>'+taskCount+'</b><small>Jumlah record/task</small></div>'+
    '<div class="card"><b class="'+st[1]+'">'+st[0]+'</b><small>Status akhir bulan</small></div>';
}

function renderProjects(p){
  const rows=p.projectRows||[];
  const max=rows.length?(rows[0][1]||1):1;
  document.getElementById('projects').innerHTML=rows.length?rows.map(([n,h])=>'<div class="barrow"><label title="'+esc(n)+'">'+esc(n)+'</label><div class="barbox"><span class="bar" style="width:'+Math.max(3,Number(h)/max*100)+'%"></span></div><span>'+esc(fmt(h))+'j</span></div>').join(''):'<span class="pill">Belum ada project</span>';
}

function renderTaskTypes(p){
  const rows=p.taskTypes||[];
  const max=rows.length?(rows[0][1]||1):1;
  document.getElementById('tasktypes').innerHTML=rows.length?rows.map(([n,h])=>'<div class="barrow"><label title="'+esc(n)+'">'+esc(n)+'</label><div class="barbox"><span class="bar" style="width:'+Math.max(3,Number(h)/max*100)+'%"></span></div><span>'+esc(fmt(h))+'j</span></div>').join(''):'<span class="pill">Tidak ada data task type</span>';
}

function renderDaily(p){
  const rows=Object.entries(p.daily||{}).sort((a,b)=>Number(a[0])-Number(b[0]));
  const max=Math.max(8,...rows.map(([,h])=>Number(h)||0));
  document.getElementById('daily').innerHTML=rows.length?rows.map(([d,h])=>'<div class="barrow"><label>'+esc(d)+' '+DATA.month_name+' '+DATA.year+'</label><div class="barbox"><span class="bar" style="width:'+Math.max(3,Number(h)/max*100)+'%"></span></div><span>'+esc(fmt(h))+'j</span></div>').join(''):'<span class="pill">Belum ada data harian</span>';
}

function renderCalendar(p){
  const daily=p.daily||{},sat=new Set(DATA.saturdays),sun=new Set(DATA.sundays),hol=DATA.holidays||{};
  const firstDow=firstDowMon(DATA.year,DATA.month_num);
  let html=['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(d=>'<div class="dow">'+d+'</div>').join('');
  for(let i=0;i<firstDow;i++)html+='<div class="day empty"></div>';
  for(let d=1;d<=DATA.numDays;d++){
    const di=dow(DATA.year,DATA.month_num,d);
    const cls=sat.has(d)?'sat':sun.has(d)?'sun':hol[d]&&di<5?'holiday':daily[d]?'active':'';
    const h=Number(daily[d]||0);
    html+='<div class="day '+cls+'"><strong>'+d+'</strong><small>'+DATA.dayNames[di]+'</small>'+
      (hol[d]&&di<5?'<em>'+esc(hol[d])+'</em>':'')+
      (h?'<b>'+esc(fmt(h))+'j</b>':'')+'</div>';
  }
  document.getElementById('calendar').innerHTML=html;
}

function renderTasks(p){
  const rows=p.tasks||[];
  document.getElementById('taskRows').innerHTML=rows.length?rows.map(t=>{
    const di=dow(DATA.year,DATA.month_num,Number(t.day||1));
    return '<tr><td><span class="pill">'+esc(t.date||(DATA.month_num+'/'+(t.day||1)+'/'+DATA.year))+'</span></td>'+
      '<td>'+esc(DATA.dayNames[di])+'</td><td>'+esc(t.project||'-')+'</td><td>'+esc(t.task||'-')+'</td>'+
      '<td><b>'+esc(fmt(t.time))+'</b></td><td style="max-width:220px;font-size:12px;color:#64748b">'+esc(t.notes||'')+'</td></tr>';
  }).join(''):'<tr><td colspan="6">Belum ada record.</td></tr>';
}

function render(){
  const p=person();
  renderStats(p);renderProjects(p);renderTaskTypes(p);renderDaily(p);renderCalendar(p);renderTasks(p);
}

document.getElementById('ps').addEventListener('change',render);
function fmt(n){return Number(n||0).toLocaleString('id-ID',{maximumFractionDigits:1});}
function firstDowMon(year,month){return (dow(year,month,1)+6)%7;}
function dow(year,month,day){return new Date(Date.UTC(year,month-1,day)).getUTCDay();}
render();
`;

const dataPath = arg('data') || process.argv[2] || path.join(BASE, 'data', 'mei2026_data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const payload = makePayload(data);
const slug = `${MONTH_ID[data.month_num].toLowerCase()}${data.year}`;
const outDir = path.join(BASE, 'output', slug);
const outPath = path.join(outDir, 'person-detail-v2.html');
const options = payload.people.map((p,i)=>`<option value="${esc(p.name)}"${i===0?' selected':''}>${esc(p.name)}</option>`).join('');
const generatedAt = new Date().toLocaleString('id-ID',{timeZone:'Asia/Jakarta'});
const jsCode = JS.replace('__DATA__', safeJson(payload));
const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Detail Timesheet Per Orang — ${esc(payload.month_name)} ${payload.year}</title>
<style>${CSS}</style>
</head>
<body>
<div class="hdr">
  <div><h1>👤 Detail Timesheet Per Orang</h1><p>${esc(payload.company)} · ${esc(payload.month_name)} ${payload.year} · Generated ${esc(generatedAt)}</p></div>
  <div class="badges">
    <div class="bdg"><b>${payload.people.length}</b><span>Staff</span></div>
    <div class="bdg"><b>${payload.working_days}</b><span>@error_days</span></div>
    <div class="bdg"><b>${payload.expected_hours}</b><span>Target/org</span></div>
    <div class="bdg"><b>${fmt(payload.totalHours)}</b><span>Total jam</span></div>
  </div>
</div>
<main class="wrap">
  <div class="notice">🧪 Test Case — Person Detail View. Pilih nama di dropdown untuk melihat data individual.</div>
  <section class="control">
    <div>
      <label for="ps">Pilih Staff</label>
      <select id="ps">${options}</select>
    </div>
    <div class="hint">Panel di bawah berubah otomatis mengikuti nama yang dipilih: stats, project breakdown, task type breakdown, kalender personal, dan detail record harian.</div>
  </section>
  <section class="grid stats" id="stats"></section>
  <div class="split">
    <section>
      <h2 class="sec">Project Breakdown</h2>
      <div class="panel" id="projects"></div>
    </section>
    <section>
      <h2 class="sec">Task Type Breakdown</h2>
      <div class="panel" id="tasktypes"></div>
    </section>
  </div>
  <h2 class="sec">Ringkasan Harian</h2>
  <section class="panel"><div id="daily"></div></section>
  <h2 class="sec">Kalender Personal ${esc(payload.month_name)} ${payload.year}</h2>
  <section class="panel"><div class="calendar" id="calendar"></div></section>
  <h2 class="sec">Detail Record / Task Harian</h2>
  <section class="tablewrap">
    <table>
      <thead><tr><th>Tanggal</th><th>Hari</th><th>Project</th><th>Task</th><th>Jam</th><th>Notes</th></tr></thead>
      <tbody id="taskRows"></tbody>
    </table>
  </section>
  <p class="footer">Timesheet ${esc(payload.month_name)} ${payload.year} &middot; ${esc(payload.company)} &middot; Person Detail View v2</p>
</main>
<script>${jsCode}</script>
</body></html>`;
fs.mkdirSync(outDir, {recursive:true});
fs.writeFileSync(outPath, html, 'utf8');
console.log('Generated -> '+outPath);
console.log('Staff: '+payload.people.length+' | Total hours: '+fmt(payload.totalHours));
