const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(BASE, 'config.json'), 'utf8'));

const MONTH_ID = {1:'Januari',2:'Februari',3:'Maret',4:'April',5:'Mei',6:'Juni',7:'Juli',8:'Agustus',9:'September',10:'Oktober',11:'November',12:'Desember'};
const COLORS = ['#6366f1','#22c55e','#8b5cf6','#ec4899','#0ea5e9','#f97316','#ef4444','#eab308','#14b8a6','#a855f7','#f43f5e','#84cc16'];

function esc(s){return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function num(v, digits=1){return Number(v || 0).toFixed(digits)}
function dowMonFirst(year, month, day){return (new Date(Date.UTC(year, month-1, day)).getUTCDay()+6)%7}
function weekdayName(year, month, day){return ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'][dowMonFirst(year, month, day)]}

function build(data){
  const year = data.year;
  const month = data.month_num;
  const mid = MONTH_ID[month];
  const numDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const sats = new Set(data.saturdays || []);
  const suns = new Set(data.sundays || []);
  const hols = data.holidays || {};
  const expected = Number(data.expected_hours || 0);
  const workingDays = Number(data.working_days || 0);

  const staff = Object.entries(data.staff || {}).map(([name, s]) => {
    const daily = s.daily || {};
    const projects = s.projects || {};
    const workingFilledDays = Object.entries(daily).filter(([d,h]) => Number(h) > 0 && !sats.has(Number(d)) && !suns.has(Number(d))).length;
    const topProject = Object.entries(projects).sort((a,b)=>Number(b[1])-Number(a[1]))[0] || ['-', 0];
    return {name, h:Number(s.total_hours || 0), daily, projects, days:workingFilledDays, pct: expected ? Number(s.total_hours || 0)/expected*100 : 0, topProject};
  }).sort((a,b)=>b.h-a.h || a.name.localeCompare(b.name));
  staff.forEach((s,i)=>s.color=COLORS[i%COLORS.length]);

  const totalHours = staff.reduce((a,s)=>a+s.h,0);
  const aboveTarget = staff.filter(s=>s.h>=expected).length;
  const maxHours = staff[0]?.h || 1;

  const dayMap = {};
  for(let d=1; d<=numDays; d++) dayMap[d] = {hours:0, staff:new Set()};
  for(const s of staff){
    for(const [d,hRaw] of Object.entries(s.daily || {})){
      const h = Number(hRaw || 0);
      if(h>0 && dayMap[d]){ dayMap[d].hours += h; dayMap[d].staff.add(s.name); }
    }
  }

  const projects = {};
  for(const s of staff){
    for(const [p,h] of Object.entries(s.projects || {})) if(Number(h)>0) projects[p]=(projects[p]||0)+Number(h);
  }
  const projectRows = Object.entries(projects).sort((a,b)=>b[1]-a[1]);
  const maxProject = projectRows[0]?.[1] || 1;

  const holidayCards = Object.entries(hols).sort((a,b)=>Number(a[0])-Number(b[0])).map(([d,name]) => {
    const isWeekend = sats.has(Number(d)) || suns.has(Number(d));
    return `<div class="holiday ${isWeekend?'weekend':'weekday'}"><b>${d} ${mid}</b><br>${esc(name)}<small>${isWeekend?'Weekend · tidak memotong hari kerja':'Libur weekday · memotong hari kerja'}</small></div>`;
  }).join('');

  let calendarHtml = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(d=>`<div class="week">${d}</div>`).join('');
  for(let i=0; i<dowMonFirst(year, month, 1); i++) calendarHtml += '<div></div>';
  for(let d=1; d<=numDays; d++){
    const isSat=sats.has(d), isSun=suns.has(d), isHol=Object.prototype.hasOwnProperty.call(hols, String(d)), hasData=dayMap[d].hours>0;
    const cls = isHol ? 'hol' : isSat ? 'sat' : isSun ? 'sun' : hasData ? 'data' : '';
    const holText = isHol ? `<small>🚫 ${esc(hols[String(d)])}</small>` : '';
    const dataText = hasData ? `<span>${num(dayMap[d].hours,1)}h · ${dayMap[d].staff.size} staff</span>` : '';
    const weekendText = (!isHol && (isSat || isSun)) ? `<small>${isSat?'Sabtu':'Minggu'}</small>` : '';
    calendarHtml += `<div class="cell ${cls}"><b>${d}</b>${holText}${weekendText}${dataText}</div>`;
  }

  const leaderHtml = staff.map((s,i)=>{
    const width = Math.max(3, s.h/maxHours*100);
    return `<div class="card"><b>#${i+1} ${esc(s.name)}</b><div class="big" style="color:${s.color}">${num(s.h)}h</div><div>${s.days} hari diisi · ${num(s.pct)}% target</div><div class="bar"><i style="width:${width}%;background:${s.color}"></i></div></div>`;
  }).join('');

  const projectHtml = projectRows.map(([p,h],i)=>{
    const width = Math.max(3, h/maxProject*100);
    const c = COLORS[i%COLORS.length];
    return `<div class="proj"><b>${i+1}. ${esc(p)}</b><span>${num(h)} jam</span><div class="bar"><i style="width:${width}%;background:${c}"></i></div></div>`;
  }).join('');

  const detailHtml = staff.map((s,i)=>{
    const diff = s.h - expected;
    return `<tr><td>${i+1}</td><td><b>${esc(s.name)}</b></td><td>${num(s.h)}</td><td>${s.days}</td><td>${num(s.days/(workingDays||1)*100)}%</td><td class="${diff>=0?'ok':'bad'}">${diff>=0?'+':''}${num(diff)}h</td><td>${esc(s.topProject[0])}</td></tr>`;
  }).join('');

  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Timesheet ${mid} ${year}</title><style>
body{font-family:Segoe UI,Arial,sans-serif;background:#f1f5ff;color:#334155;margin:0}.hdr{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:26px 34px}.hdr h1{margin:0;font-size:28px}.hdr p{opacity:.92}.wrap{max-width:1200px;margin:auto;padding:22px}.stats,.leader,.hols{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.stat,.card,.holiday,.panel{background:white;border-radius:14px;padding:16px;box-shadow:0 2px 16px #6366f114}.stat b{font-size:28px}.stat small,.holiday small{display:block;color:#64748b;margin-top:4px}.sec{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:800;margin:26px 0 10px}.calendar{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}.week{text-align:center;color:#64748b;font-weight:800;font-size:12px}.cell{min-height:74px;background:#f8faff;border:1px solid #e2e8f0;border-radius:9px;padding:7px}.cell small,.cell span{display:block;font-size:11px;margin-top:4px}.cell.sat{background:#fef9c3}.cell.sun{background:#ffedd5}.cell.hol{background:#fee2e2}.cell.data{background:#eff6ff}.holiday.weekday{background:#fee2e2;border:1px solid #fca5a5}.holiday.weekend{background:#fef9c3;border:1px solid #fde68a}.big{font-size:30px;font-weight:900;margin:6px 0}.bar{height:7px;background:#e2e8f0;border-radius:99px;overflow:hidden;margin-top:8px}.bar i{display:block;height:100%}.proj{margin:10px 0}.proj span{float:right;color:#64748b}table{width:100%;border-collapse:collapse;background:white;border-radius:14px;overflow:hidden}th,td{padding:10px;border-bottom:1px solid #e2e8f0;text-align:left}th{background:#e0e7ff;color:#475569;font-size:12px;text-transform:uppercase}.ok{color:#16a34a;font-weight:800}.bad{color:#dc2626;font-weight:800}@media(max-width:700px){.calendar{font-size:12px}.cell{min-height:62px;padding:5px}.wrap{padding:12px}.proj span{float:none;display:block;margin-top:3px}}
</style></head><body><div class="hdr"><h1>📋 Timesheet Dashboard — ${mid} ${year}</h1><p>${esc(cfg.company?.name || 'PT TwinK Digital Indonesia')} · Generated from Google Sheets</p></div><main class="wrap"><div class="stats"><div class="stat"><b>${workingDays}</b><br>Hari kerja</div><div class="stat"><b>${expected}</b><br>Target jam/orang</div><div class="stat"><b>${staff.length}</b><br>Staff</div><div class="stat"><b>${num(totalHours)}</b><br>Total jam</div><div class="stat"><b>${aboveTarget}/${staff.length}</b><br>Staff ≥ target</div><div class="stat"><b>${Object.keys(hols).length}</b><br>Libur nasional</div></div><p class="sec">Hari Libur Nasional</p><div class="hols">${holidayCards}</div><p class="sec">Kalender</p><div class="panel"><div class="calendar">${calendarHtml}</div></div><p class="sec">Leaderboard — Total Jam</p><div class="leader">${leaderHtml}</div><p class="sec">Project Breakdown</p><div class="panel">${projectHtml}</div><p class="sec">Detail Staff</p><table><thead><tr><th>Rank</th><th>Staff</th><th>Total Jam</th><th>Hari Diisi</th><th>% Hari Kerja</th><th>vs Target</th><th>Project Utama</th></tr></thead><tbody>${detailHtml}</tbody></table></main></body></html>`;
}

const dataPath = process.argv[2] || path.join(BASE, 'data', 'mei2026_data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const monthName = MONTH_ID[data.month_num];
const outDir = path.join(BASE, 'output', `${monthName.toLowerCase()}${data.year}`);
const outPath = path.join(outDir, 'dashboard.html');
fs.mkdirSync(outDir, {recursive:true});
fs.writeFileSync(outPath, build(data), 'utf8');
console.log(`Dashboard sample-style saved -> ${outPath}`);
