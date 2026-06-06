import json
from pathlib import Path
from datetime import datetime, timezone, timedelta

BASE = Path(__file__).resolve().parent.parent
data_path = BASE / 'data' / 'mei2026_data.json'
out_dir = BASE / 'output' / 'mei2026'
out_html = out_dir / 'person-detail-test.html'

data = json.loads(data_path.read_text(encoding='utf-8'))
company = 'PT TwinK Digital Indonesia'
try:
    cfg = json.loads((BASE / 'config.json').read_text(encoding='utf-8'))
    company = cfg.get('company', {}).get('name') or company
except Exception:
    pass

MONTH_ID = {1:'Januari',2:'Februari',3:'Maret',4:'April',5:'Mei',6:'Juni',7:'Juli',8:'Agustus',9:'September',10:'Oktober',11:'November',12:'Desember'}
day_names = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
month_name = MONTH_ID.get(data['month_num'], data.get('month',''))
year = data['year']
num_days = 31 if data['month_num'] == 5 else 30

def esc(s):
    return str(s if s is not None else '').replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('"','&quot;').replace("'",'&#39;')

people = []
for name, s in data.get('staff', {}).items():
    people.append({
        'name': name,
        'total_hours': s.get('total_hours', 0),
        'utilization': s.get('utilization') or ((s.get('total_hours', 0) / data.get('expected_hours', 1) * 100) if data.get('expected_hours') else 0),
        'daily': s.get('daily', {}),
        'projects': s.get('projects', {}),
        'tasks': sorted(s.get('tasks', []), key=lambda t: (t.get('day', 0), str(t.get('project',''))))
    })
people.sort(key=lambda p: p['name'])

select_options = '\n'.join(f'<option value="{esc(p["name"])}">{esc(p["name"])}</option>' for p in people)
js_data = json.dumps({
    'people': people,
    'expected_hours': data.get('expected_hours', 0),
    'working_days': data.get('working_days', 0),
    'month_num': data.get('month_num'),
    'month_name': month_name,
    'year': year,
    'numDays': num_days,
    'saturdays': data.get('saturdays', []),
    'sundays': data.get('sundays', []),
    'holidays': data.get('holidays', {}),
    'dayNames': day_names,
}, ensure_ascii=False).replace('</', '<\\/')

generated_at = datetime.now(timezone(timedelta(hours=7))).strftime('%d/%m/%Y %H:%M:%S WIB')
css = """
:root{--blue:#2563eb;--violet:#7c3aed;--cyan:#0891b2;--green:#16a34a;--red:#dc2626;--ink:#172033;--muted:#64748b;--line:#e5e7eb;--bg:#f6f8ff}*{box-sizing:border-box}body{margin:0;font-family:Segoe UI,Arial,sans-serif;background:linear-gradient(135deg,#eef2ff,#f8fafc 45%,#ecfeff);color:var(--ink)}.hero{padding:28px 34px;background:linear-gradient(135deg,#1d4ed8,#7c3aed,#0891b2);color:white}.hero h1{margin:0;font-size:30px}.hero p{margin:8px 0 0;opacity:.92}.wrap{max-width:1280px;margin:auto;padding:22px}.notice{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:16px;padding:12px 16px;margin-bottom:16px;font-weight:650}.control{display:grid;grid-template-columns:minmax(260px,420px) 1fr;gap:16px;align-items:end;background:white;border:1px solid var(--line);border-radius:20px;padding:18px;box-shadow:0 14px 40px rgba(37,99,235,.08)}label{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;font-weight:800}select{width:100%;margin-top:7px;padding:13px 14px;border:1px solid #cbd5e1;border-radius:14px;font-size:16px;background:#f8fafc}.hint{color:var(--muted);line-height:1.45}.grid{display:grid;gap:14px}.stats{grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-top:16px}.card,.panel{background:rgba(255,255,255,.94);border:1px solid var(--line);border-radius:20px;padding:18px;box-shadow:0 14px 40px rgba(37,99,235,.07)}.card b{font-size:30px;display:block}.card small{color:var(--muted);font-weight:650}.good{color:var(--green)}.bad{color:var(--red)}h2{margin:28px 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:var(--muted)}.split{display:grid;grid-template-columns:1.05fr .95fr;gap:16px}.barrow{display:grid;grid-template-columns:minmax(180px,320px) 1fr 70px;gap:10px;align-items:center;margin:10px 0}.barrow label{text-transform:none;letter-spacing:0;color:#334155;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.barbox{height:26px;background:#eef2ff;border-radius:999px;overflow:hidden}.bar{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--blue),var(--violet));min-width:3px}.barrow span:last-child{text-align:right;font-weight:800;color:#334155}.calendar{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}.dow{text-align:center;font-size:12px;color:var(--muted);font-weight:900}.day{min-height:86px;border:1px solid var(--line);border-radius:14px;background:#f8fafc;padding:8px;position:relative}.day.empty{background:transparent;border:0}.day.sat{background:#fef9c3;border-color:#fde68a}.day.sun{background:#ffedd5;border-color:#fdba74}.day.holiday{background:#fee2e2;border-color:#fca5a5}.day.active{background:#dbeafe;border-color:#60a5fa;box-shadow:inset 0 0 0 2px rgba(37,99,235,.16)}.day strong{font-size:14px}.day em{display:block;font-style:normal;font-size:10px;color:#991b1b;font-weight:800;margin-top:3px;line-height:1.1}.day b{position:absolute;right:8px;bottom:7px;color:#1d4ed8;font-size:13px}.day small{display:block;color:#64748b;font-size:10px;margin-top:4px}.tablewrap{overflow:auto;border-radius:16px;border:1px solid var(--line)}table{width:100%;border-collapse:collapse;background:white}th,td{padding:10px 11px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{background:#f8fafc;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.6px}td{font-size:13px}.pill{display:inline-block;border-radius:999px;background:#eef2ff;color:#3730a3;padding:4px 8px;font-weight:750}.footer{color:var(--muted);font-size:12px;margin:22px 0 4px}@media(max-width:900px){.control,.split{grid-template-columns:1fr}.calendar{gap:3px}.day{min-height:70px;padding:5px}.barrow{grid-template-columns:1fr}.barrow span:last-child{text-align:left}.wrap{padding:12px}.hero{padding:22px 18px}}
"""

script = r"""
const DATA = __DATA__;
const rup = n => Number(n || 0).toLocaleString('id-ID', {maximumFractionDigits:1});
const pct = n => Number(n || 0).toLocaleString('id-ID', {maximumFractionDigits:1});
function esc(s){return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function currentPerson(){const name=document.getElementById('personSelect').value; return DATA.people.find(p=>p.name===name) || DATA.people[0];}
function weekdayCountFilled(p){const sat=new Set(DATA.saturdays), sun=new Set(DATA.sundays); return Object.entries(p.daily || {}).filter(([d,h]) => Number(h)>0 && !sat.has(Number(d)) && !sun.has(Number(d))).length;}
function renderStats(p){const diff=p.total_hours-DATA.expected_hours; const filled=weekdayCountFilled(p); const taskCount=(p.tasks||[]).length; document.getElementById('stats').innerHTML='<div class="card"><b>'+esc(rup(p.total_hours))+'</b><small>Total jam tercatat</small></div><div class="card"><b>'+esc(pct(p.utilization))+'%</b><small>Utilisasi vs target '+DATA.expected_hours+' jam</small></div><div class="card"><b class="'+(diff>=0?'good':'bad')+'">'+(diff>=0?'+':'')+esc(rup(diff))+'</b><small>Selisih dari target</small></div><div class="card"><b>'+filled+'/'+DATA.working_days+'</b><small>Hari kerja ada input</small></div><div class="card"><b>'+taskCount+'</b><small>Jumlah detail record/task</small></div>';}
function renderProjects(p){const rows=Object.entries(p.projects||{}).sort((a,b)=>b[1]-a[1]); const max=(rows[0]&&rows[0][1])||1; document.getElementById('projects').innerHTML=rows.length?rows.map(([name,h])=>'<div class="barrow"><label title="'+esc(name)+'">'+esc(name)+'</label><div class="barbox"><span class="bar" style="width:'+Math.max(3,h/max*100)+'%"></span></div><span>'+esc(rup(h))+'j</span></div>').join(''):'<span class="pill">Belum ada project</span>';}
function renderDailySummary(p){const rows=Object.entries(p.daily||{}).sort((a,b)=>Number(a[0])-Number(b[0])); const max=Math.max(8,...rows.map(([,h])=>Number(h)||0)); document.getElementById('dailySummary').innerHTML=rows.length?rows.map(([d,h])=>'<div class="barrow"><label>'+d+' '+DATA.month_name+' '+DATA.year+'</label><div class="barbox"><span class="bar" style="width:'+Math.max(3,Number(h)/max*100)+'%"></span></div><span>'+esc(rup(h))+'j</span></div>').join(''):'<span class="pill">Belum ada data harian</span>';}
function renderCalendar(p){const daily=p.daily||{}, sat=new Set(DATA.saturdays), sun=new Set(DATA.sundays), hol=DATA.holidays||{}; const firstDow=(new Date(Date.UTC(DATA.year,DATA.month_num-1,1)).getUTCDay()+6)%7; let html=['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(d=>'<div class="dow">'+d+'</div>').join(''); for(let i=0;i<firstDow;i++) html+='<div class="day empty"></div>'; for(let d=1;d<=DATA.numDays;d++){const dow=new Date(Date.UTC(DATA.year,DATA.month_num-1,d)).getUTCDay(); const cls=sat.has(d)?'sat':sun.has(d)?'sun':hol[d]?'holiday':daily[d]?'active':''; const h=Number(daily[d]||0); html+='<div class="day '+cls+'"><strong>'+d+'</strong><small>'+DATA.dayNames[dow]+'</small>'+(hol[d]?'<em>'+esc(hol[d])+'</em>':'')+(h?'<b>'+esc(rup(h))+'j</b>':'')+'</div>'; } document.getElementById('calendar').innerHTML=html;}
function renderTasks(p){const rows=p.tasks||[]; document.getElementById('taskRows').innerHTML=rows.length?rows.map(t=>{const dow=new Date(Date.UTC(DATA.year,DATA.month_num-1,Number(t.day||1))).getUTCDay(); return '<tr><td><span class="pill">'+esc(t.date||t.date_iso||'')+'</span></td><td>'+esc(DATA.dayNames[dow])+'</td><td>'+esc(t.project||'-')+'</td><td>'+esc(t.task||'-')+'</td><td>'+esc(t.category||'-')+'</td><td><b>'+esc(rup(t.time))+'</b></td><td>'+esc(t.notes||'')+'</td></tr>';}).join(''):'<tr><td colspan="7">Belum ada record.</td></tr>';}
function render(){const p=currentPerson(); renderStats(p); renderProjects(p); renderDailySummary(p); renderCalendar(p); renderTasks(p);} document.getElementById('personSelect').addEventListener('change', render); render();
""".replace('__DATA__', js_data)

html = f'''<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Test Case Detail Per Orang — Timesheet {esc(month_name)} {year}</title><style>{css}</style></head><body>
<section class="hero"><h1>🧪 Test Case — Detail Timesheet Per Orang</h1><p>{esc(company)} · {esc(month_name)} {year} · Generated {esc(generated_at)}</p></section>
<main class="wrap">
  <div class="notice">Ini test case terpisah. Template workflow utama belum diubah.</div>
  <section class="control"><div><label for="personSelect">Pilih orang</label><select id="personSelect">{select_options}</select></div><div class="hint">Semua panel di bawah berubah mengikuti nama yang dipilih: ringkasan jam, target, project breakdown, kalender personal, dan detail task/record harian.</div></section>
  <section class="grid stats" id="stats"></section>
  <div class="split"><section><h2>Project Breakdown Orang Terpilih</h2><div class="panel" id="projects"></div></section><section><h2>Ringkasan Harian</h2><div class="panel" id="dailySummary"></div></section></div>
  <h2>Kalender Personal {esc(month_name)} {year}</h2><section class="panel"><div class="calendar" id="calendar"></div></section>
  <h2>Detail Record / Task Orang Terpilih</h2><section class="tablewrap"><table><thead><tr><th>Tanggal</th><th>Hari</th><th>Project</th><th>Task</th><th>Kategori</th><th>Jam</th><th>Notes</th></tr></thead><tbody id="taskRows"></tbody></table></section>
  <p class="footer">Output: timesheet-reports/output/mei2026/person-detail-test.html</p>
</main><script>{script}</script></body></html>'''

out_dir.mkdir(parents=True, exist_ok=True)
out_html.write_text(html, encoding='utf-8')
print(f'Generated -> {out_html}')
print(f'People: {len(people)}')
