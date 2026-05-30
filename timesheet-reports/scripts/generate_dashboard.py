"""
generate_dashboard.py — Generic Dashboard Generator
PT TwinK Digital Indonesia

Usage:
    python generate_dashboard.py --data ../data/may2026_data.json
    python generate_dashboard.py --data ../data/may2026_data.json --send-tg
"""

import argparse, calendar, datetime, json, os, sys, urllib.request

_BASE     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_cfg      = json.load(open(os.path.join(_BASE, 'config.json'), encoding='utf-8'))
BOT_TOKEN = _cfg['telegram']['bot_token']
CHAT_IDS  = _cfg['telegram'].get('chat_ids', [_cfg['telegram'].get('chat_id', '')])
COMPANY   = _cfg['company']['name']

MONTH_ID = {1:'Januari',2:'Februari',3:'Maret',4:'April',5:'Mei',6:'Juni',
            7:'Juli',8:'Agustus',9:'September',10:'Oktober',11:'November',12:'Desember'}

COLORS = ['#6366f1','#22c55e','#8b5cf6','#ec4899','#0ea5e9',
          '#f97316','#ef4444','#eab308','#14b8a6','#a855f7','#f43f5e','#84cc16']

HOL_ICONS = [('Natal','🎄'),('Imlek','🧧'),('Isra','🌙'),('Nyepi','🪔'),('Idulfitri','🌙'),
             ('Iduladha','🐑'),('Paskah','⛪'),('Agung','✝️'),('Kenaikan','✝️'),
             ('Waisak','☸️'),('Pancasila','🇮🇩'),('Kemerdekaan','🇮🇩'),('Maulid','🌙'),
             ('Buruh','⚙️'),('Tahun Baru','🎊')]

def load_data(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def hol_icon(name):
    for k, ic in HOL_ICONS:
        if k.lower() in name.lower(): return ic
    return '🏖️'

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--data',    required=True)
    p.add_argument('--out',     default=None)
    p.add_argument('--send-tg', action='store_true')
    return p.parse_args()

def first_dow(year, month):
    return datetime.date(year, month, 1).weekday()

def build_staff(data):
    sat = set(data['saturdays']); sun = set(data['sundays'])
    wd  = data['working_days'];   tgt = data['expected_hours']
    out = []
    for i,(name,s) in enumerate(sorted(data['staff'].items(), key=lambda x:-x[1]['total_hours'])):
        days = sum(1 for d,h in s['daily'].items() if int(d) not in sat and int(d) not in sun and h>0)
        top  = max(s['projects'].items(), key=lambda x:x[1]) if s['projects'] else ('–',0)
        out.append(dict(name=name, h=s['total_hours'], days=days,
                        pct=round(days/wd*100,1) if wd else 0,
                        color=COLORS[i%len(COLORS)], top=top[0][:45],
                        daily=s['daily'], projects=s['projects']))
    return out

def build_proj(data):
    proj = {}
    for s in data['staff'].values():
        for k,v in s['projects'].items():
            if v>0: proj[k]=proj.get(k,0)+v
    return sorted(proj.items(), key=lambda x:-x[1])

def esc(s): return str(s).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('"','&quot;')

def generate(data, staff, proj_totals):
    year=data['year']; mo=data['month_num']; mid=MONTH_ID[mo]
    wd=data['working_days']; tgt=data['expected_hours']
    hols=data['holidays']; sats=set(data['saturdays']); suns=set(data['sundays'])
    num_days=calendar.monthrange(year,mo)[1]
    total_h=sum(s['h'] for s in staff)
    above_tgt=sum(1 for s in staff if s['h']>=tgt)
    fdow=first_dow(year,mo)

    RCLS=['r1','r2','r3','r3']+['rn']*20
    RMED=['🥇','🥈','🥉','🥉']+['']*20
    DNAMES=['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu']

    # Holiday cards
    hol_html=''
    wkd_hols=[d for d,n in hols.items() if datetime.date(year,mo,int(d)).weekday()<5]
    for ds,hn in sorted(hols.items(),key=lambda x:int(x[0])):
        dt=datetime.date(year,mo,int(ds)); hari=DNAMES[dt.weekday()]
        ic=hol_icon(hn); is_sun=(dt.weekday()==6); is_sat=(dt.weekday()==5)
        is_wknd=dt.weekday()>=5
        note=('Jatuh hari Minggu · tidak memotong hari kerja' if is_sun else
              'Jatuh hari Sabtu · tidak memotong hari kerja' if is_sat else
              'Libur Nasional · memotong 1 hari kerja')
        bg='#fef9c3' if is_wknd else '#fee2e2'; brd='#fde68a' if is_wknd else '#fca5a5'
        fc='#854d0e' if is_wknd else '#b91c1c'; fc2='#713f12' if is_wknd else '#991b1b'; fc3='#78350f' if is_wknd else '#7f1d1d'
        hol_html+=f'<div class="hol-card" style="background:{bg};border:1.5px solid {brd}"><div class="hico">{ic}</div><div><div class="hdate" style="color:{fc}">{hari}, {ds} {mid} {year}</div><div class="hname" style="color:{fc2}">{esc(hn)}</div><div class="hnote" style="color:{fc3}">{note}</div></div></div>'
    hol_html+=f'<div class="hol-card" style="background:#dbeafe;border:1.5px solid #93c5fd"><div class="hico">🧮</div><div><div class="hdate" style="color:#1e40af">Perhitungan Hari Kerja</div><div class="hname" style="color:#1e3a8a">{num_days} &minus; {len(sats)} Sabtu &minus; {len(suns)} Minggu &minus; {len(wkd_hols)} Libur = <strong>{wd} hari</strong></div><div class="hnote" style="color:#1d4ed8">Target: {wd} &times; 8 = <strong>{tgt} jam / orang</strong></div></div></div>'

    # Calendar
    dm={d:{'tot':0,'staff':[]} for d in range(1,num_days+1)}
    for s in staff:
        for ds2,h in s['daily'].items():
            d=int(ds2)
            if h>0: dm[d]['tot']+=h; dm[d]['staff'].append({'c':s['color'],'n':s['name'],'h':h})
    cal_html=''
    for _ in range(fdow): cal_html+='<div class="cell empty"></div>'
    for d in range(1,num_days+1):
        is_sat=d in sats; is_sun=d in suns; is_hol=str(d) in hols; has_data=dm[d]['tot']>0
        cls='cell'+(' sat' if is_sat else ' sun' if is_sun else ' hol' if is_hol else ' data' if has_data else '')
        ty='Sabtu' if is_sat else 'Minggu' if is_sun else ''
        htag=f'<div class="htag">🚫 {esc(hols[str(d)])}</div>' if is_hol and not is_sat and not is_sun else ''
        dots=('<div class="dots">'+''.join(f'<div class="dot" style="background:{x["c"]}" title="{esc(x["n"])}: {x["h"]}h"></div>' for x in dm[d]['staff'])+'</div>') if has_data else ''
        ctot=f'<div class="ctot">{dm[d]["tot"]}h</div>' if has_data else ''
        cal_html+=f'<div class="{cls}"><div class="cn">{d}</div>{f"<div class=ct>{ty}</div>" if ty else ""}{htag}{dots}{ctot}</div>'

    # Scorecards
    maxH=max(s['h'] for s in staff) if staff else 168
    sc_html=''
    for i,s in enumerate(staff):
        w=round(s['h']/maxH*100,1)
        sc_html+=f'<div class="sc {RCLS[i]}"><div class="rnum">{i+1}</div>{f"<span class=sc-crn>{RMED[i]}</span>" if RMED[i] else ""}<div class="sc-name">{esc(s["name"])}</div><div class="sc-val" style="color:{s["color"]}">{s["h"]:.0f}<span style="font-size:1rem;font-weight:600"> jam</span></div><div class="sc-sub">{s["days"]} hari diisi &nbsp;·&nbsp; {s["pct"]}% pengisian</div><div class="prog"><div class="pbar" style="width:{w}%;background:{s["color"]}"></div></div><div class="sc-meta"><span>📁 {esc(s["top"])}</span></div></div>'

    # Bar charts
    bh=''; bp=''
    for s in staff:
        sh=s['name'].split()[0]; wh=round(s['h']/maxH*100,1); wp=round(min(s['pct']/110*100,100),1)
        bh+=f'<div class="bl-row"><div class="bl-lbl">{sh}</div><div class="bl-track"><div class="bl-fill" style="width:{wh}%;background:{s["color"]}">{s["h"]:.0f}j</div></div><div class="bl-val" style="color:{s["color"]}">{s["h"]:.0f}j</div></div>'
        bp+=f'<div class="bl-row"><div class="bl-lbl">{sh}</div><div class="bl-track"><div class="bl-fill" style="width:{wp}%;background:{s["color"]}">{"✓ " if s["pct"]>=100 else ""}{s["pct"]}%</div></div><div class="bl-val" style="color:{s["color"]}">{s["pct"]}%</div></div>'

    # Project list
    PCOLS=['#6366f1','#8b5cf6','#0ea5e9','#ec4899','#22c55e','#f97316','#eab308','#94a3b8','#fca5a5','#a78bfa','#fde68a','#cbd5e1']
    maxP=proj_totals[0][1] if proj_totals else 1; pj=''
    for i,(pn,ph) in enumerate(proj_totals):
        w=round(ph/maxP*100,1); c=PCOLS[i%len(PCOLS)]
        pj+=f'<div class="proj-row"><div class="proj-rank">{i+1}</div><div class="proj-name" title="{esc(pn)}">{esc(pn)}</div><div class="proj-track"><div class="proj-fill" style="width:{w}%;background:{c}">{ph:.0f}j</div></div><div class="proj-val" style="color:{c}">{ph:.0f} jam</div></div>'

    # Table
    tb=''
    for i,s in enumerate(staff):
        diff=s['h']-tgt
        ds2=f'<span style="color:#22c55e;font-weight:700">+{diff:.0f}j</span>' if diff>=0 else f'<span style="color:#ef4444;font-weight:700">{diff:.0f}j</span>'
        if s['h']>=tgt*1.1: st,pc='Excellent','p-gr'
        elif s['h']>=tgt:    st,pc='Lengkap',  'p-bl'
        elif s['h']>=tgt*.9: st,pc='Hampir',   'p-yw'
        else:                st,pc='Kurang',   'p-rd'
        tb+=f'<tr><td>{RMED[i]}{i+1}</td><td><strong>{esc(s["name"])}</strong></td><td>{s["h"]:.0f} jam</td><td>{s["days"]} hari</td><td><span class="pill p-bl">{s["pct"]}%</span></td><td>{ds2}</td><td><span class="pill {pc}">{st}</span></td><td style="font-size:.71rem;color:#94a3b8">{esc(s["top"])}</td></tr>'

    CSS="""
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
.footer{text-align:center;font-size:.65rem;color:var(--muted);padding:18px;border-top:1px solid var(--border)}"""

    html_out = f"""<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Timesheet {mid} {year} — PT TwinK Digital Indonesia</title>
<style>{CSS}</style>
</head>
<body>
<div class="hdr">
  <div><h1>📋 Timesheet Dashboard — {mid} {year}</h1>
  <p>PT TwinK Digital Indonesia &nbsp;·&nbsp; Summary Report Bulanan</p></div>
  <div class="badges">
    <div class="bdg"><div class="bv">{wd}</div><div class="bl">Hari Kerja</div></div>
    <div class="bdg"><div class="bv">{tgt}</div><div class="bl">Jam Target/org</div></div>
    <div class="bdg"><div class="bv">{len(staff)}</div><div class="bl">Staff</div></div>
    <div class="bdg"><div class="bv">{total_h:.0f}</div><div class="bl">Total Jam Diisi</div></div>
  </div>
</div>
<div class="wrap">
<p class="sec">Ringkasan Bulan</p>
<div class="stat-row">
  <div class="stat" style="border-left-color:#6366f1"><div class="ico">📅</div><div class="sv">{num_days}</div><div class="sl">Total Hari Kalender</div></div>
  <div class="stat" style="border-left-color:#22c55e"><div class="ico">💼</div><div class="sv">{wd}</div><div class="sl">Hari Kerja Efektif</div></div>
  <div class="stat" style="border-left-color:#ef4444"><div class="ico">🏖️</div><div class="sv">{len(hols)}</div><div class="sl">Libur Nasional</div></div>
  <div class="stat" style="border-left-color:#eab308"><div class="ico">⏱️</div><div class="sv">{total_h:.0f}</div><div class="sl">Total Jam Diisi</div></div>
  <div class="stat" style="border-left-color:#0ea5e9"><div class="ico">✅</div><div class="sv">{above_tgt}/{len(staff)}</div><div class="sl">Staff &ge; Target Jam</div></div>
  <div class="stat" style="border-left-color:#8b5cf6"><div class="ico">🏆</div><div class="sv">{esc(staff[0]["name"].split()[0]) if staff else "-"}</div><div class="sl">Jam Terbanyak</div></div>
</div>
<p class="sec">Hari Libur Nasional {mid} {year}</p>
<div class="hol-row mb">{hol_html}</div>
<p class="sec">Kalender {mid} {year}</p>
<div class="cal-card">
  <div class="cal-top"><h2>{mid} {year}</h2>
  <div class="cal-leg">
    <div class="li"><div class="ld" style="background:#eff6ff;border:1.5px solid #bfdbfe"></div>Ada timesheet</div>
    <div class="li"><div class="ld" style="background:#fef9c3;border:1.5px solid #fde68a"></div>Sabtu</div>
    <div class="li"><div class="ld" style="background:#ffedd5;border:1.5px solid #fdba74"></div>Minggu</div>
    <div class="li"><div class="ld" style="background:#fee2e2;border:1.5px solid #fca5a5"></div>Libur Nasional</div>
  </div></div>
  <div class="ch"><div>Sen</div><div>Sel</div><div>Rab</div><div>Kam</div><div>Jum</div><div style="color:#854d0e">Sab</div><div style="color:#9a3412">Min</div></div>
  <div class="cgrid">{cal_html}</div>
</div>

<p class="sec">&#127942; Leaderboard &mdash; Total Jam Diisi ({mid} {year})</p>
<div class="scores">{sc_html}</div>
<div class="cg2col">
<div class="cc"><h3>Total Jam per Staff</h3><div class="bl-list">{bh}</div></div>
<div class="cc"><h3>% Pengisian Hari Kerja (vs {wd} hari)</h3><div class="bl-list">{bp}</div></div>
</div>
<p class="sec">Beban Jam per Project &mdash; {mid} {year}</p>
<div class="proj-card"><h3>Total jam seluruh staff per project</h3><div class="proj-list">{pj}</div></div>
<p class="sec">Detail per Staff</p>
<div class="tbl"><table>
<thead><tr><th>Rank</th><th>Nama Staff</th><th>Total Jam</th><th>Hari Diisi</th><th>% Hari Kerja</th><th>vs Target {tgt}j</th><th>Status</th><th>Project Utama</th></tr></thead>
<tbody>{tb}</tbody></table></div>
</div>
<div class="footer">Timesheet Dashboard {mid} {year} &nbsp;&middot;&nbsp; PT TwinK Digital Indonesia</div>
</body></html>
"""
    return html_out


def send_telegram(file_path, month_name, year):
    with open(file_path, 'rb') as f:
        content = f.read()
    boundary = b'----TGBoundary99'
    CRLF = b'\r\n'
    caption = f'\U0001f4ca Timesheet Dashboard {month_name} {year}\nBuka di browser untuk tampilan penuh.'.encode('utf-8')
    results = []
    for chat_id in CHAT_IDS:
        if not chat_id: continue
        body = (
            b'--' + boundary + CRLF
            + b'Content-Disposition: form-data; name="chat_id"' + CRLF + CRLF
            + chat_id.encode() + CRLF
            + b'--' + boundary + CRLF
            + b'Content-Disposition: form-data; name="caption"' + CRLF + CRLF
            + caption + CRLF
            + b'--' + boundary + CRLF
            + b'Content-Disposition: form-data; name="document"; filename="' + os.path.basename(file_path).encode() + b'"' + CRLF
            + b'Content-Type: text/html' + CRLF + CRLF
            + content + CRLF
            + b'--' + boundary + b'--' + CRLF
        )
        url = 'https://api.telegram.org/bot' + BOT_TOKEN + '/sendDocument'
        req = urllib.request.Request(url, data=body,
              headers={'Content-Type': 'multipart/form-data; boundary=' + boundary.decode()})
        try:
            with urllib.request.urlopen(req) as r:
                res = json.loads(r.read())
            results.append(res)
        except Exception as e:
            results.append({'ok': False, 'error': str(e)})
    return results


def main():
    args   = parse_args()
    data   = load_data(args.data)
    staff  = build_staff(data)
    projs  = build_proj(data)
    html   = generate(data, staff, projs)

    year   = data['year']; mo = data['month_num']
    mname  = MONTH_ID[mo]; slug = f"{mname.lower()}{year}"

    if args.out:
        out_path = args.out
    else:
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        out_dir  = os.path.join(base, 'output', slug)
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, 'dashboard.html')

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Dashboard saved -> {out_path}")

    if args.send_tg:
        results = send_telegram(out_path, mname, year)
        for i, res in enumerate(results):
            chat = CHAT_IDS[i] if i < len(CHAT_IDS) else '?'
            if res.get('ok'):
                mid = res['result'].get('message_id', '?')
                print(f'Telegram -> {chat}: OK | msg_id={mid}')
            else:
                print(f'Telegram -> {chat}: FAILED | {res.get("error", "unknown")}')

    return out_path

if __name__ == '__main__':
    main()