const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(BASE, 'config.json'), 'utf8'));
const spreadsheetId = cfg.google_sheets.spreadsheet_id;
const sheetTab = cfg.google_sheets.sheet_tab || 'Timesheet';
const outData = path.join(BASE, 'data', 'mei2026_data.json');
const outDir = path.join(BASE, 'output', 'mei2026');
const outHtml = path.join(outDir, 'dashboard.html');

const YEAR = 2026, MONTH = 5;
const MONTH_ID = {1:'Januari',2:'Februari',3:'Maret',4:'April',5:'Mei',6:'Juni',7:'Juli',8:'Agustus',9:'September',10:'Oktober',11:'November',12:'Desember'};
const MONTH_EN = {1:'January',2:'February',3:'March',4:'April',5:'May',6:'June',7:'July',8:'August',9:'September',10:'October',11:'November',12:'December'};
const HOLIDAYS = {
  '2026-05-01': 'Hari Buruh Internasional',
  '2026-05-14': 'Kenaikan Yesus Kristus',
  '2026-05-15': 'Cuti Bersama Kenaikan Yesus Kristus',
  '2026-05-27': 'Idul Adha 1447 Hijriah',
  '2026-05-28': 'Cuti Bersama Idul Adha 1447 Hijriah',
  '2026-05-31': 'Hari Raya Waisak 2570 BE'
};
const COLORS = ['#6366f1','#22c55e','#8b5cf6','#ec4899','#0ea5e9','#f97316','#ef4444','#eab308','#14b8a6','#a855f7','#f43f5e','#84cc16'];
function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function csvParse(text){
  const rows=[]; let row=[], cur='', q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(q){ if(c==='"'&&n==='"'){cur+='"'; i++;} else if(c==='"'){q=false;} else cur+=c; }
    else { if(c==='"') q=true; else if(c===','){row.push(cur); cur='';} else if(c==='\n'){row.push(cur); rows.push(row); row=[]; cur='';} else if(c==='\r'){} else cur+=c; }
  }
  if(cur.length || row.length){row.push(cur); rows.push(row)}
  return rows;
}
function meta(year,month){
  const numDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const holidays={}; for(const [ds,n] of Object.entries(HOLIDAYS)){const [y,m,d]=ds.split('-').map(Number); if(y===year&&m===month) holidays[d]=n;}
  const saturdays=[], sundays=[], working=[];
  for(let d=1; d<=numDays; d++){
    const dow = new Date(Date.UTC(year, month-1, d)).getUTCDay();
    if(holidays[d] && dow>=1 && dow<=5) continue;
    if(dow===6) saturdays.push(d); else if(dow===0) sundays.push(d); else working.push(d);
  }
  return {numDays, holidays, saturdays, sundays, working};
}
function buildData(records, m){
  const staff={};
  for(const r of records){
    if(!staff[r.name]) staff[r.name]={total_hours:0,daily:{},projects:{},tasks:[]};
    const s=staff[r.name]; s.total_hours += r.time; s.daily[r.day]=(s.daily[r.day]||0)+r.time; s.projects[r.project]=(s.projects[r.project]||0)+r.time; s.tasks.push(r);
  }
  const expected=m.working.length*8;
  for(const s of Object.values(staff)) s.utilization = expected ? s.total_hours/expected*100 : 0;
  return {month:`${MONTH_EN[MONTH]} ${YEAR}`, year:YEAR, month_num:MONTH, working_days:m.working.length, expected_hours:expected, holidays:Object.fromEntries(Object.entries(m.holidays).map(([k,v])=>[String(k),v])), saturdays:m.saturdays, sundays:m.sundays, staff};
}
function parseRecords(rows){
  const out=[];
  for(const row of rows.slice(1)){
    const name=(row[1]||'').trim(), dateStr=(row[2]||'').trim(), category=(row[3]||'').trim(), project=(row[4]||'').trim(), task=(row[5]||'').trim(), hours=(row[6]||'0').trim(), notes=(row[7]||'').trim();
    if(!name || !dateStr) continue;
    const p=dateStr.split('/').map(x=>parseInt(x,10)); if(p.length!==3 || p.some(Number.isNaN)) continue;
    const [m,d,y]=p; if(y===YEAR && m===MONTH) out.push({date:dateStr,day:d,name,project,task,time:parseFloat(hours)||0,category,notes,date_iso:`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`});
  }
  return out;
}
function render(data){
  const mid=MONTH_ID[data.month_num], year=data.year, numDays=new Date(Date.UTC(year,data.month_num,0)).getUTCDate();
  const staff=Object.entries(data.staff).map(([name,s],i)=>({name,h:s.total_hours,daily:s.daily,projects:s.projects,pct:data.expected_hours? +(s.total_hours/data.expected_hours*100).toFixed(1):0,color:COLORS[i%COLORS.length]})).sort((a,b)=>b.h-a.h);
  staff.forEach((s,i)=>s.color=COLORS[i%COLORS.length]);
  const totalH=staff.reduce((a,s)=>a+s.h,0), above=staff.filter(s=>s.h>=data.expected_hours).length;
  const proj={}; for(const s of Object.values(data.staff)) for(const [k,v] of Object.entries(s.projects)) if(v>0) proj[k]=(proj[k]||0)+v;
  const projects=Object.entries(proj).sort((a,b)=>b[1]-a[1]);
  const sats=new Set(data.saturdays), suns=new Set(data.sundays), hols=data.holidays;
  const firstDow=(new Date(Date.UTC(year,data.month_num-1,1)).getUTCDay()+6)%7;
  const dayMap={}; for(let d=1;d<=numDays;d++) dayMap[d]={tot:0,staff:[]};
  staff.forEach(s=>Object.entries(s.daily).forEach(([d,h])=>{if(h>0){dayMap[d].tot+=h;dayMap[d].staff.push({n:s.name,h,c:s.color})}}));
  const holidayCards=Object.entries(hols).sort((a,b)=>+a[0]-+b[0]).map(([d,n])=>{
    const dow=new Date(Date.UTC(year,data.month_num-1,+d)).getUTCDay(); const weekend=dow===0||dow===6; const hari=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][dow];
    return `<div class="hol ${weekend?'wknd':'weekday'}"><b>${hari}, ${d} ${mid}</b><span>${esc(n)}</span><small>${weekend?'Weekend · tidak memotong hari kerja':'Memotong 1 hari kerja'}</small></div>`;
  }).join('') + `<div class="hol calc"><b>Perhitungan Hari Kerja</b><span>${numDays} - ${data.saturdays.length} Sabtu - ${data.sundays.length} Minggu - ${Object.entries(hols).filter(([d])=>{const w=new Date(Date.UTC(year,data.month_num-1,+d)).getUTCDay();return w>=1&&w<=5}).length} libur weekday = ${data.working_days} hari</span><small>Target ${data.expected_hours} jam/orang</small></div>`;
  let cal=''; for(let i=0;i<firstDow;i++) cal+='<div class="cell empty"></div>';
  for(let d=1;d<=numDays;d++){
    const cls=sats.has(d)?'sat':suns.has(d)?'sun':hols[d]?'holiday':dayMap[d].tot>0?'data':'';
    const dots=dayMap[d].staff.slice(0,18).map(x=>`<i style="background:${x.c}" title="${esc(x.n)} ${x.h}h"></i>`).join('');
    cal += `<div class="cell ${cls}"><strong>${d}</strong>${hols[d]?`<em>${esc(hols[d])}</em>`:''}<div class="dots">${dots}</div>${dayMap[d].tot?`<b>${dayMap[d].tot}h</b>`:''}</div>`;
  }
  const leaderboard=staff.map((s,i)=>{const days=Object.entries(s.daily).filter(([d,h])=>h>0&&!sats.has(+d)&&!suns.has(+d)).length; const top=Object.entries(s.projects).sort((a,b)=>b[1]-a[1])[0]||['-',0]; const util=data.expected_hours?(s.h/data.expected_hours*100):0; const label=util>=110?'Excellent':util>=100?'Lengkap':util>=90?'Hampir':'Kurang'; return `<div class="person"><div class="rank">${i+1}</div><h3>${esc(s.name)}</h3><p style="color:${s.color}">${s.h.toFixed(1)} jam</p><small>${days} hari diisi · ${util.toFixed(1)}% target · ${label}</small><div class="bar"><span style="width:${Math.min(100,util)}%;background:${s.color}"></span></div><small>Project utama: ${esc(top[0])}</small></div>`}).join('');
  const projectRows=projects.map(([p,h],i)=>`<div class="prow"><label>${i+1}. ${esc(p)}</label><div><span style="width:${Math.max(3,h/(projects[0]?.[1]||1)*100)}%;background:${COLORS[i%COLORS.length]}">${h.toFixed(1)}j</span></div></div>`).join('');
  const table=staff.map((s,i)=>{const days=Object.entries(s.daily).filter(([d,h])=>h>0&&!sats.has(+d)&&!suns.has(+d)).length; const diff=s.h-data.expected_hours; return `<tr><td>${i+1}</td><td>${esc(s.name)}</td><td>${s.h.toFixed(1)}</td><td>${days}</td><td>${s.pct}%</td><td class="${diff>=0?'good':'bad'}">${diff>=0?'+':''}${diff.toFixed(1)}</td></tr>`}).join('');
  const css=`body{margin:0;font-family:Segoe UI,Arial,sans-serif;background:linear-gradient(135deg,#eef2ff,#ecfeff,#fff7ed);color:#1f2937}.hero{background:linear-gradient(135deg,#6366f1,#a78bfa,#f0abfc);color:white;padding:28px 34px}.hero h1{margin:0;font-size:30px}.hero p{opacity:.9}.badges{display:flex;gap:12px;flex-wrap:wrap}.badge{background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.35);padding:10px 16px;border-radius:14px}.wrap{max-width:1240px;margin:auto;padding:24px}.stats,.hols,.leader{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px}.card,.hol,.person,.calendar,.projects,.table{background:rgba(255,255,255,.9);border-radius:20px;padding:18px;box-shadow:0 10px 30px rgba(99,102,241,.1)}.card b{font-size:30px}.hol{display:flex;flex-direction:column;gap:5px}.hol.weekday{background:#fee2e2;border:1px solid #fca5a5}.hol.wknd{background:#fef9c3;border:1px solid #fde68a}.hol.calc{background:#dbeafe;border:1px solid #93c5fd}h2{font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin:28px 0 12px}.grid7{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}.dow{text-align:center;font-weight:800;color:#64748b;font-size:12px}.cell{min-height:82px;border:1px solid #e5e7eb;border-radius:12px;padding:8px;background:#f8fafc;position:relative}.cell.empty{background:transparent;border:0}.cell.sat{background:#fef9c3;border-color:#fde68a}.cell.sun{background:#ffedd5;border-color:#fdba74}.cell.holiday{background:#fee2e2;border-color:#fca5a5}.cell.data{background:#eff6ff;border-color:#bfdbfe}.cell em{display:block;font-size:10px;color:#991b1b;font-style:normal;font-weight:700;margin-top:3px}.cell b{position:absolute;right:8px;bottom:5px;font-size:11px;color:#1d4ed8}.dots{display:flex;gap:3px;flex-wrap:wrap;margin-top:7px}.dots i{width:7px;height:7px;border-radius:50%;display:block}.person{position:relative}.rank{position:absolute;right:15px;top:14px;background:#ede9fe;color:#5b21b6;border-radius:999px;width:28px;height:28px;text-align:center;line-height:28px;font-weight:800}.person h3{padding-right:38px;margin:0 0 8px}.person p{font-size:30px;font-weight:900;margin:0}.bar{height:8px;background:#f1f5f9;border-radius:999px;overflow:hidden;margin:10px 0}.bar span{display:block;height:100%}.prow{display:grid;grid-template-columns:300px 1fr;gap:10px;align-items:center;margin:9px 0}.prow label{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.prow div{background:#f1f5f9;border-radius:8px;overflow:hidden}.prow span{display:block;color:white;font-weight:800;font-size:12px;padding:5px 8px;border-radius:8px}table{width:100%;border-collapse:collapse;background:white;border-radius:16px;overflow:hidden}th,td{padding:10px;border-bottom:1px solid #e5e7eb;text-align:left}th{background:#f8fafc;color:#64748b;text-transform:uppercase;font-size:12px}.good{color:#16a34a;font-weight:800}.bad{color:#dc2626;font-weight:800}@media(max-width:700px){.grid7{gap:3px}.cell{min-height:65px;padding:5px}.prow{grid-template-columns:1fr}.wrap{padding:12px}}`;
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Timesheet Dashboard ${mid} ${year}</title><style>${css}</style></head><body><section class="hero"><h1>📋 Timesheet Dashboard — ${mid} ${year}</h1><p>${esc(cfg.company.name)} · Generated ${new Date().toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})}</p><div class="badges"><div class="badge"><b>${data.working_days}</b><br>Hari Kerja</div><div class="badge"><b>${data.expected_hours}</b><br>Target Jam/org</div><div class="badge"><b>${staff.length}</b><br>Staff</div><div class="badge"><b>${totalH.toFixed(1)}</b><br>Total Jam</div></div></section><main class="wrap"><h2>Ringkasan Bulan</h2><div class="stats"><div class="card"><b>${numDays}</b><br>Total hari kalender</div><div class="card"><b>${Object.keys(hols).length}</b><br>Libur nasional/cuti bersama</div><div class="card"><b>${above}/${staff.length}</b><br>Staff ≥ target jam</div><div class="card"><b>${esc(staff[0]?.name?.split(' ')[0]||'-')}</b><br>Jam terbanyak</div></div><h2>Hari Libur Nasional ${mid} ${year}</h2><div class="hols">${holidayCards}</div><h2>Kalender ${mid} ${year}</h2><section class="calendar"><div class="grid7">${['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(d=>`<div class="dow">${d}</div>`).join('')}${cal}</div></section><h2>Leaderboard — Total Jam Diisi</h2><div class="leader">${leaderboard}</div><h2>Project Breakdown</h2><section class="projects">${projectRows}</section><h2>Detail Staff</h2><section class="table"><table><thead><tr><th>Rank</th><th>Nama</th><th>Total Jam</th><th>Hari Diisi</th><th>% Target</th><th>Selisih vs Target</th></tr></thead><tbody>${table}</tbody></table></section></main></body></html>`;
}
(async()=>{
  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetTab)}`;
  const res = await fetch(csvUrl);
  if(!res.ok) throw new Error(`Fetch Google Sheets CSV failed: HTTP ${res.status} ${await res.text()}`);
  const csv = await res.text();
  const rows = csvParse(csv);
  const m = meta(YEAR, MONTH);
  const records = parseRecords(rows);
  const data = buildData(records, m);
  fs.mkdirSync(path.dirname(outData), {recursive:true}); fs.writeFileSync(outData, JSON.stringify(data,null,2), 'utf8');
  fs.mkdirSync(outDir, {recursive:true}); fs.writeFileSync(outHtml, render(data), 'utf8');
  console.log(`Fetching timesheet: Mei ${YEAR}`);
  console.log(`  Hari kerja   : ${data.working_days}`);
  console.log(`  Hari libur   : ${JSON.stringify(Object.values(data.holidays))}`);
  console.log(`  Target jam   : ${data.expected_hours} jam/orang`);
  console.log(`  Records ditemukan: ${records.length}`);
  console.log(`Data saved -> ${outData}`);
  console.log(`Dashboard saved -> ${outHtml}`);
  console.log(`Staff: ${Object.keys(data.staff).join(', ')}`);
})().catch(e=>{console.error(e.stack||e); process.exit(1);});
