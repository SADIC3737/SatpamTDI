/**
 * generate_dashboard_node.js — Dashboard Generator (Node.js)
 * PT TwinK Digital Indonesia
 *
 * Usage: node generate_dashboard_node.js --data ../data/july2026_data.json
 *        node generate_dashboard_node.js --data ../data/july2026_data.json --out ../output/some.html
 */

const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(BASE, 'config.json'), 'utf8'));
const COMPANY = cfg.company.name;

const MONTH_ID = {1:'Januari',2:'Februari',3:'Maret',4:'April',5:'Mei',6:'Juni',7:'Juli',8:'Agustus',9:'September',10:'Oktober',11:'November',12:'Desember'};
const COLORS = ['#6366f1','#22c55e','#8b5cf6','#ec4899','#0ea5e9','#f97316','#ef4444','#eab308','#14b8a6','#a855f7','#f43f5e','#84cc16'];
const HOL_ICONS = [['Natal','🎄'],['Imlek','🧧'],['Isra','🌙'],['Nyepi','🪔'],['Idulfitri','🌙'],['Iduladha','🐑'],['Paskah','⛪'],['Agung','✝️'],['Kenaikan','✝️'],['Waisak','☸️'],['Pancasila','🇮🇩'],['Kemerdekaan','🇮🇩'],['Maulid','🌙'],['Buruh','⚙️'],['Tahun Baru','🎊']];

function arg(name) { const i = process.argv.indexOf(`--${name}`); return i >= 0 && i+1 < process.argv.length ? process.argv[i+1] : null; }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function holIcon(name) { for (const [k,ic] of HOL_ICONS) { if (name.toLowerCase().includes(k.toLowerCase())) return ic; } return '🏖️'; }

const dataPath = arg('data');
if (!dataPath) { console.error('Missing --data'); process.exit(1); }
const outArg = arg('out');

const data = JSON.parse(fs.readFileSync(path.resolve(dataPath), 'utf8'));
const year = data.year, mo = data.month_num, mid = MONTH_ID[mo];
const wd = data.working_days, tgt = data.expected_hours;
const hols = data.holidays || {}, sats = new Set(data.saturdays), suns = new Set(data.sundays);
const numDays = new Date(Date.UTC(year, mo, 0)).getUTCDate();
const DNAMES = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

// Staff
const staffArr = Object.entries(data.staff || {}).map(([name,s]) => ({
  name, h: s.total_hours,
  daily: s.daily || {},
  projects: s.projects || {},
  days: Object.entries(s.daily || {}).filter(([d,h]) => !sats.has(parseInt(d)) && !suns.has(parseInt(d)) && h>0).length
})).sort((a,b) => b.h - a.h);

staffArr.forEach((s,i) => {
  s.pct = wd ? Math.round(s.days/wd*100*10)/10 : 0;
  s.color = COLORS[i % COLORS.length];
  const top = Object.entries(s.projects).sort((a,b)=>b[1]-a[1])[0];
  s.top = top ? top[0].slice(0,45) : '–';
});

const totalH = staffArr.reduce((a,s)=>a+s.h,0);
const aboveTgt = staffArr.filter(s=>s.h>=tgt).length;

// Project totals
const projMap = {};
for (const s of Object.values(data.staff||{})) {
  for (const [k,v] of Object.entries(s.projects || {})) {
    if (v>0) projMap[k] = (projMap[k]||0) + v;
  }
}
const projTotals = Object.entries(projMap).sort((a,b)=>b[1]-a[1]);

// first day of week
const fdow = new Date(Date.UTC(year, mo-1, 1)).getUTCDay();
const RCLS = ['r1','r2','r3','r3',...Array(20).fill('rn')];
const RMED = ['🥇','🥈','🥉','🥉',...Array(20).fill('')];

// Holiday cards
const wkdHols = Object.entries(hols).filter(([d]) => {
  const dt = new Date(Date.UTC(year, mo-1, parseInt(d)));
  return dt.getUTCDay() >= 1 && dt.getUTCDay() <= 5;
});
let holHtml = '';
for (const [ds,hn] of Object.entries(hols).sort((a,b)=>parseInt(a[0])-parseInt(b[0]))) {
  const d = parseInt(ds);
  const dt = new Date(Date.UTC(year, mo-1, d));
  const hari = DNAMES[dt.getUTCDay()];
  const ic = holIcon(hn);
  const isSun = dt.getUTCDay()===0, isSat = dt.getUTCDay()===6, isWknd = isSat || isSun;
  const note = isSun ? 'Jatuh hari Minggu · tidak memotong hari kerja' : isSat ? 'Jatuh hari Sabtu · tidak memotong hari kerja' : 'Libur Nasional · memotong 1 hari kerja';
  const bg = isWknd ? '#fef9c3' : '#fee2e2', brd = isWknd ? '#fde68a' : '#fca5a5';
  const fc = isWknd ? '#854d0e' : '#b91c1c', fc2 = isWknd ? '#713f12' : '#991b1b', fc3 = isWknd ? '#78350f' : '#7f1d1d';
  holHtml += `<div class="hol-card" style="background:${bg};border:1.5px solid ${brd}"><div class="hico">${ic}</div><div><div class="hdate" style="color:${fc}">${hari}, ${ds} ${mid} ${year}</div><div class="hname" style="color:${fc2}">${esc(hn)}</div><div class="hnote" style="color:${fc3}">${note}</div></div></div>`;
}
holHtml += `<div class="hol-card" style="background:#dbeafe;border:1.5px solid #93c5fd"><div class="hico">🧮</div><div><div class="hdate" style="color:#1e40af">Perhitungan Hari Kerja</div><div class="hname" style="color:#1e3a8a">${numDays} &minus; ${sats.size} Sabtu &minus; ${suns.size} Minggu &minus; ${wkdHols.length} Libur = <strong>${wd} hari</strong></div><div class="hnote" style="color:#1d4ed8">Target: ${wd} &times; 8 = <strong>${tgt} jam / orang</strong></div></div></div>`;

// Calendar
const dm = {};
for (let d=1; d<=numDays; d++) dm[d] = {tot:0, staff:[]};
for (const s of staffArr) {
  for (const [ds2, h] of Object.entries(s.daily)) {
    const d = parseInt(ds2);
    if (h>0) { dm[d].tot += h; dm[d].staff.push({c:s.color, n:s.name, h}); }
  }
}
let calHtml = '';
for (let i=0; i<fdow; i++) calHtml += '<div class="cell empty"></div>';
for (let d=1; d<=numDays; d++) {
  const isSat = sats.has(d), isSun = suns.has(d), isHol = hols[String(d)] !== undefined, hasData = dm[d].tot > 0;
  let cls = 'cell' + (isSat ? ' sat' : isSun ? ' sun' : isHol ? ' hol' : hasData ? ' data' : '');
  const ty = isSat ? 'Sabtu' : isSun ? 'Minggu' : '';
  const htag = (isHol && !isSat && !isSun) ? `<div class="htag">🚫 ${esc(hols[String(d)])}</div>` : '';
  const dots = hasData ? '<div class="dots">' + dm[d].staff.map(x => `<div class="dot" style="background:${x.c}" title="${esc(x.n)}: ${x.h}h"></div>`).join('') + '</div>' : '';
  const ctot = hasData ? `<div class="ctot">${dm[d].tot}h</div>` : '';
  calHtml += `<div class="${cls}"><div class="cn">${d}</div>${ty ? `<div class="ct">${ty}</div>` : ''}${htag}${dots}${ctot}</div>`;
}

// Scorecards
const maxH = staffArr.length ? Math.max(...staffArr.map(s=>s.h)) : 168;
let scHtml = '';
staffArr.forEach((s,i) => {
  const w = Math.round(s.h/maxH*100*10)/10;
  scHtml += `<div class="sc ${RCLS[i]}"><div class="rnum">${i+1}</div>${RMED[i] ? `<span class="sc-crn">${RMED[i]}</span>` : ''}<div class="sc-name">${esc(s.name)}</div><div class="sc-val" style="color:${s.color}">${s.h.toFixed(0)}<span style="font-size:1rem;font-weight:600"> jam</span></div><div class="sc-sub">${s.days} hari diisi &nbsp;·&nbsp; ${s.pct}% pengisian</div><div class="prog"><div class="pbar" style="width:${w}%;background:${s.color}"></div></div><div class="sc-meta"><span>📁 ${esc(s.top)}</span></div></div>`;
});

// Bar charts
let bh = '', bp = '';
for (const s of staffArr) {
  const sh = s.name.split(' ')[0];
  const wh = Math.round(s.h/maxH*100*10)/10;
  const wp = Math.round(Math.min(s.pct/110*100, 100)*10)/10;
  bh += `<div class="bl-row"><div class="bl-lbl">${sh}</div><div class="bl-track"><div class="bl-fill" style="width:${wh}%;background:${s.color}">${s.h.toFixed(0)}j</div></div><div class="bl-val" style="color:${s.color}">${s.h.toFixed(0)}j</div></div>`;
  bp += `<div class="bl-row"><div class="bl-lbl">${sh}</div><div class="bl-track"><div class="bl-fill" style="width:${wp}%;background:${s.color}">${s.pct>=100?'✓ ':''}${s.pct}%</div></div><div class="bl-val" style="color:${s.color}">${s.pct}%</div></div>`;
}

// Project list
const PCOLS = ['#6366f1','#8b5cf6','#0ea5e9','#ec4899','#22c55e','#f97316','#eab308','#94a3b8','#fca5a5','#a78bfa','#fde68a','#cbd5e1'];
const maxP = projTotals.length ? projTotals[0][1] : 1;
let pj = '';
projTotals.forEach(([pn,ph],i) => {
  const w = Math.round(ph/maxP*100*10)/10;
  const c = PCOLS[i % PCOLS.length];
  pj += `<div class="proj-row"><div class="proj-rank">${i+1}</div><div class="proj-name" title="${esc(pn)}">${esc(pn)}</div><div class="proj-track"><div class="proj-fill" style="width:${w}%;background:${c}">${ph.toFixed(0)}j</div></div><div class="proj-val" style="color:${c}">${ph.toFixed(0)} jam</div></div>`;
});

// Table
let tb = '';
staffArr.forEach((s,i) => {
  const diff = s.h - tgt;
  const ds = diff >= 0 ? `<span style="color:#22c55e;font-weight:700">+${diff.toFixed(0)}j</span>` : `<span style="color:#ef4444;font-weight:700">${diff.toFixed(0)}j</span>`;
  let st, pc;
  if (s.h >= tgt * 1.1) { st = 'Excellent'; pc = 'p-gr'; }
  else if (s.h >= tgt) { st = 'Lengkap'; pc = 'p-bl'; }
  else if (s.h >= tgt * 0.9) { st = 'Hampir'; pc = 'p-yw'; }
  else { st = 'Kurang'; pc = 'p-rd'; }
  tb += `<tr><td>${RMED[i]}${i+1}</td><td><strong>${esc(s.name)}</strong></td><td>${s.h.toFixed(0)} jam</td><td>${s.days} hari</td><td><span class="pill p-bl">${s.pct}%</span></td><td>${ds}</td><td><span class="pill ${pc}">${st}</span></td><td style="font-size:.71rem;color:#94a3b8">${esc(s.top)}</td></tr>`;
});

const CSS = `
:root{--bg:#f0f4ff;--card:#fff;--border:#e2e8f0;--text:#334155;--muted:#94a3b8;--r:14px;--sh:0 2px 16px rgba(99,102,241,.08);--sat-bg:#fef9c3;--sat-b:#fde68a;--sat-fg:#854d0e;--sun-bg:#ffedd5;--sun-b:#fdba74;--sun-fg:#9a3412;--hol-bg:#fee2e2;--hol-b:#fca5a5;--hol-fg:#b91c1c;--work:#f8faff;--data-bg:#eff6ff;--data-b:#bfdbfe;--data-fg:#1e40af}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--text)}
.hdr{background:linear-gradient(135deg,#6366f1,#8b5cf6,#a78bfa);color:#fff;padding:26px 30px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
.hdr h1{font-size:1.5rem;font-weight:800}.hdr p{font-size:.78rem;opacity:.8;margin-top:3px}
.badges{display:flex;gap:9px;flex-wrap:wrap}.bdg{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);border-radius:9px;padding:7px 14px;text-align:center;min-width:68px}
.bdg .bv{font-size:1.35rem;font-weight:800;line-height:1}.bdg .bl{font-size:.63rem;opacity:.82;margin-top:1px}
.wrap{max-width:1260px;margin:0 auto;padding:22px 18px}
.sec{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin:0 0 11px}.mb{margin-bottom:26px}
.stat-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px;margin-bottom:26px}
.stat{background:var(--card);border-radius:var(--r);padding:15px 17px;box-shadow:var(--sh);border-left:4px solid transparent}
.stat .ico{font-size:1.2rem;margin-bottom:3px}.stat .sv{font-size:1.45rem;font-weight:800}.stat .sl{font-size:.68rem;color:var(--muted);margin-top:2px}
.hol-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:26px}
.hol-card{border-radius:var(--r);padding:14px 16px;display:flex;align-items:flex-start;gap:11px}
.hico{font-size:1.7rem;line-height:1}.hdate{font-size:.85rem;font-weight:700}.hname{font-size:.75rem;font-weight:600;margin-top:2px}.hnote{font-size:.65rem;margin-top:3px;opacity:.75}
.cal-card{background:var(--card);border-radius:var(--r);padding:20px;box-shadow:var(--sh);margin-bottom:26px}
.cal-top{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:9px;margin-bottom:14px}
.cal-top h2{font-size:1rem;font-weight:800}.cal-leg{display:flex;gap:9px;flex-wrap:wrap}
.li{display:flex;align-items:center;gap:4px;font-size:.64rem}.ld{width:10px;height:10px;border-radius:3px;flex-shrink:0}
.ch{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px}
.ch div{text-align:center;font-size:.64rem;font-weight:700;color:var(--muted);padding:2px 0}
.cgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.cell{border-radius:8px;min-height:70px;padding:6px 7px 4px;background:var(--work);border:1.5px solid var(--border);position:relative;transition:box-shadow .15s}
.cell:hover:not(.empty){box-shadow:0 3px 12px rgba(99,102,241,.13)}.cell.empty{background:transparent;border-color:transparent;min-height:0}
.cell.sat{background:var(--sat-bg);border-color:var(--sat-b)}.cell.sun{background:var(--sun-bg);border-color:var(--sun-b)}
.cell.hol{background:var(--hol-bg);border-color:var(--hol-b)}.cell.data{background:var(--data-bg);border-color:var(--data-b)}
.cn{font-size:.77rem;font-weight:800;line-height:1}
.cell.sat .cn{color:var(--sat-fg)}.cell.sun .cn{color:var(--sun-fg)}.cell.hol .cn{color:var(--hol-fg)}.cell.data .cn{color:var(--data-fg)}
.ct{font-size:.52rem;font-weight:600;margin-top:1px;opacity:.6}.cell.sat .ct{color:var(--sat-fg)}.cell.sun .ct{color:var(--sun-fg)}
.htag{background:#fee2e2;border:1px solid #fca5a5;border-radius:3px;padding:1px 4px;font-size:.52rem;font-weight:700;color:#b91c1c;margin-top:3px;line-height:1.3;display:inline-block}
.dots{display:flex;flex-wrap:wrap;gap:2px;margin-top:5px}.dot{width:6px;height:6px;border-radius:50%}
.ctot{position:absolute;bottom:3px;right:5px;font-size:.55rem;font-weight:800;color:var(--data-fg);opacity:.7}.cell:not(.data) .ctot{display:none}
.scores{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:26px}
.sc{background:var(--card);border-radius:var(--r);padding:16px 16px 13px;box-shadow:var(--sh);position:relative;overflow:hidden;transition:transform .15s}
.sc:hover{transform:translateY(-2px)}.sc::before{content:'';position:absolute;top:0;left:0;right:0;height:4px}
.sc.r1::before{background:linear-gradient(90deg,#fbbf24,#f59e0b)}.sc.r2::before{background:linear-gradient(90deg,#94a3b8,#64748b)}
.sc.r3::before{background:linear-gradient(90deg,#cd7c54,#b45309)}.sc.rn::before{background:linear-gradient(90deg,#a5b4fc,#818cf8)}
.rnum{position:absolute;top:9px;right:11px;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:800}
.r1 .rnum{background:#fef3c7;color:#92400e}.r2 .rnum{background:#f1f5f9;color:#475569}.r3 .rnum{background:#fef3c7;color:#a16207}.rn .rnum{background:#ede9fe;color:#5b21b6}
.sc-crn{font-size:.85rem;display:block;margin-bottom:1px}.sc-name{font-size:.8rem;font-weight:700;padding-right:30px;line-height:1.3;margin-bottom:7px}
.sc-val{font-size:2rem;font-weight:900;line-height:1}.sc-sub{font-size:.64rem;color:var(--muted);margin-top:2px}
.prog{margin-top:9px;background:#f1f5f9;border-radius:5px;height:5px;overflow:hidden}.pbar{height:100%;border-radius:5px}
.sc-meta{margin-top:7px;font-size:.64rem;color:var(--muted);display:flex;gap:7px;flex-wrap:wrap}
.cg2col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:26px}
@media(max-width:640px){.cg2col{grid-template-columns:1fr}}
.cc{background:var(--card);border-radius:var(--r);padding:18px;box-shadow:var(--sh)}
.cc h3{font-size:.67rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:12px}
.bl-list{display:flex;flex-direction:column;gap:8px}.bl-row{display:flex;align-items:center;gap:7px}
.bl-lbl{width:95px;font-size:.68rem;text-align:right;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bl-track{flex:1;height:17px;background:#f1f5f9;border-radius:4px;overflow:hidden}
.bl-fill{height:100%;border-radius:4px;display:flex;align-items:center;padding-left:5px;font-size:.6rem;font-weight:700;color:#fff;min-width:4px}
.bl-val{width:44px;font-size:.68rem;font-weight:700;flex-shrink:0}
.proj-card{background:var(--card);border-radius:var(--r);padding:20px 22px;box-shadow:var(--sh);margin-bottom:26px}
.proj-card h3{font-size:.67rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:16px}
.proj-list{display:flex;flex-direction:column;gap:9px}.proj-row{display:flex;align-items:center;gap:10px}
.proj-rank{width:22px;font-size:.7rem;font-weight:700;color:var(--muted);text-align:center;flex-shrink:0}
.proj-name{width:250px;font-size:.75rem;font-weight:600;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.proj-track{flex:1;height:20px;background:#f1f5f9;border-radius:5px;overflow:hidden}
.proj-fill{height:100%;border-radius:5px;display:flex;align-items:center;padding-left:6px;font-size:.62rem;font-weight:700;color:#fff;min-width:6px}
.proj-val{width:50px;font-size:.73rem;font-weight:700;flex-shrink:0;text-align:right}
.tbl{background:var(--card);border-radius:var(--r);padding:18px;box-shadow:var(--sh);overflow-x:auto;margin-bottom:26px}
table{width:100%;border-collapse:collapse;font-size:.78rem}
th{background:var(--bg);padding:8px 11px;text-align:left;font-size:.64rem;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);font-weight:700}
td{padding:8px 11px;border-top:1px solid var(--border);vertical-align:middle}tr:hover td{background:#f8faff}
.pill{display:inline-block;padding:2px 8px;border-radius:20px;font-size:.65rem;font-weight:700}
.p-gr{background:#dcfce7;color:#166534}.p-bl{background:#dbeafe;color:#1e40af}.p-yw{background:#fef9c3;color:#854d0e}.p-rd{background:#fee2e2;color:#991b1b}
.footer{text-align:center;font-size:.65rem;color:var(--muted);padding:18px;border-top:1px solid var(--border)}`;

const holSection = Object.keys(hols).length === 0
  ? `<p class="sec">Hari Libur Nasional ${mid} ${year}</p><div class="hol-row mb"><div class="hol-card" style="background:#dbeafe;border:1.5px solid #93c5fd"><div class="hico">✅</div><div><div class="hdate" style="color:#1e40af">Tidak Ada Libur Nasional</div><div class="hname" style="color:#1e3a8a">Bulan ${mid} ${year} tidak memiliki hari libur nasional</div><div class="hnote" style="color:#1d4ed8">Semua hari Senin-Jumat adalah hari kerja normal</div></div></div>${holHtml}</div>`
  : `<p class="sec">Hari Libur Nasional ${mid} ${year}</p><div class="hol-row mb">${holHtml}</div>`;

const topStaffName = staffArr.length ? esc(staffArr[0].name.split(' ')[0]) : '-';

const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Timesheet ${mid} ${year} — ${COMPANY}</title>
<style>${CSS}</style>
</head>
<body>
<div class="hdr">
  <div><h1>📋 Timesheet Dashboard — ${mid} ${year}</h1>
  <p>${COMPANY} &nbsp;·&nbsp; Summary Report Bulanan &nbsp;·&nbsp; H-5 (Snapshot ${new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})})</p></div>
  <div class="badges">
    <div class="bdg"><div class="bv">${wd}</div><div class="bl">Hari Kerja</div></div>
    <div class="bdg"><div class="bv">${tgt}</div><div class="bl">Jam Target/org</div></div>
    <div class="bdg"><div class="bv">${staffArr.length}</div><div class="bl">Staff</div></div>
    <div class="bdg"><div class="bv">${totalH.toFixed(0)}</div><div class="bl">Total Jam Diisi</div></div>
  </div>
</div>
<div class="wrap">
<p class="sec">Ringkasan Bulan</p>
<div class="stat-row">
  <div class="stat" style="border-left-color:#6366f1"><div class="ico">📅</div><div class="sv">${numDays}</div><div class="sl">Total Hari Kalender</div></div>
  <div class="stat" style="border-left-color:#22c55e"><div class="ico">💼</div><div class="sv">${wd}</div><div class="sl">Hari Kerja Efektif</div></div>
  <div class="stat" style="border-left-color:#ef4444"><div class="ico">🏖️</div><div class="sv">${Object.keys(hols).length}</div><div class="sl">Libur Nasional</div></div>
  <div class="stat" style="border-left-color:#eab308"><div class="ico">⏱️</div><div class="sv">${totalH.toFixed(0)}</div><div class="sl">Total Jam Diisi</div></div>
  <div class="stat" style="border-left-color:#0ea5e9"><div class="ico">✅</div><div class="sv">${aboveTgt}/${staffArr.length}</div><div class="sl">Staff &ge; Target Jam</div></div>
  <div class="stat" style="border-left-color:#8b5cf6"><div class="ico">🏆</div><div class="sv">${topStaffName}</div><div class="sl">Jam Terbanyak</div></div>
</div>
${holSection}
<p class="sec">Kalender ${mid} ${year}</p>
<div class="cal-card">
  <div class="cal-top"><h2>${mid} ${year}</h2>
  <div class="cal-leg">
    <div class="li"><div class="ld" style="background:#eff6ff;border:1.5px solid #bfdbfe"></div>Ada timesheet</div>
    <div class="li"><div class="ld" style="background:#fef9c3;border:1.5px solid #fde68a"></div>Sabtu</div>
    <div class="li"><div class="ld" style="background:#ffedd5;border:1.5px solid #fdba74"></div>Minggu</div>
    <div class="li"><div class="ld" style="background:#fee2e2;border:1.5px solid #fca5a5"></div>Libur Nasional</div>
  </div></div>
  <div class="ch"><div>Min</div><div>Sen</div><div>Sel</div><div>Rab</div><div>Kam</div><div>Jum</div><div style="color:#854d0e">Sab</div></div>
  <div class="cgrid">${calHtml}</div>
</div>

<p class="sec">&#127942; Leaderboard &mdash; Total Jam Diisi (${mid} ${year})</p>
<div class="scores">${scHtml}</div>
<div class="cg2col">
<div class="cc"><h3>Total Jam per Staff</h3><div class="bl-list">${bh}</div></div>
<div class="cc"><h3>% Pengisian Hari Kerja (vs ${wd} hari)</h3><div class="bl-list">${bp}</div></div>
</div>
<p class="sec">Beban Jam per Project &mdash; ${mid} ${year}</p>
<div class="proj-card"><h3>Total jam seluruh staff per project</h3><div class="proj-list">${pj}</div></div>
<p class="sec">Detail per Staff</p>
<div class="tbl"><table>
<thead><tr><th>Rank</th><th>Nama Staff</th><th>Total Jam</th><th>Hari Diisi</th><th>% Hari Kerja</th><th>vs Target ${tgt}j</th><th>Status</th><th>Project Utama</th></tr></thead>
<tbody>${tb}</tbody></table></div>
</div>
<div class="footer">Timesheet Dashboard ${mid} ${year} &nbsp;&middot;&nbsp; ${COMPANY} &nbsp;&middot;&nbsp; Snapshot H-5 Akhir Bulan</div>
</body></html>`;

const slug = `${MONTH_ID[mo].toLowerCase()}${year}`;
const outPath = outArg || path.join(BASE, 'output', slug, `Dashboard Timesheet ${mid} ${year}.html`);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html, 'utf8');
console.log(`Dashboard saved -> ${outPath}`);
console.log(JSON.stringify({ path: outPath, staff: staffArr.length, totalH: totalH.toFixed(0), wd, tgt, aboveTgt }));
