const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE_DIR = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'config.json'), 'utf8'));
const SPREADSHEET_ID = cfg.google_sheets.spreadsheet_id;
const KEY_FILE = cfg.google_sheets.service_account_key;
const SHEET_RANGE = cfg.google_sheets.range;
const DATA_DIR = path.join(BASE_DIR, cfg.output.data_dir);

const INDONESIA_HOLIDAYS = {
  '2026-01-01': 'Tahun Baru 2026 Masehi',
  '2026-01-16': "Isra Mi'raj Nabi Muhammad SAW",
  '2026-02-16': 'Cuti Bersama Tahun Baru Imlek 2577 Kongzili',
  '2026-02-17': 'Tahun Baru Imlek 2577 Kongzili',
  '2026-03-18': 'Cuti Bersama Hari Suci Nyepi (Tahun Baru Saka 1948)',
  '2026-03-19': 'Hari Suci Nyepi (Tahun Baru Saka 1948)',
  '2026-03-20': 'Cuti Bersama Idul Fitri 1447 Hijriah',
  '2026-03-21': 'Hari Raya Idul Fitri 1447 Hijriah',
  '2026-03-22': 'Hari Raya Idul Fitri 1447 Hijriah (hari ke-2)',
  '2026-03-23': 'Cuti Bersama Idul Fitri 1447 Hijriah',
  '2026-03-24': 'Cuti Bersama Idul Fitri 1447 Hijriah',
  '2026-04-03': 'Wafat Yesus Kristus',
  '2026-04-05': 'Hari Kebangkitan Yesus Kristus (Paskah)',
  '2026-05-01': 'Hari Buruh Internasional',
  '2026-05-14': 'Kenaikan Yesus Kristus',
  '2026-05-15': 'Cuti Bersama Kenaikan Yesus Kristus',
  '2026-05-27': 'Idul Adha 1447 Hijriah',
  '2026-05-28': 'Cuti Bersama Idul Adha 1447 Hijriah',
  '2026-05-31': 'Hari Raya Waisak 2570 BE',
  '2026-06-01': 'Hari Lahir Pancasila',
  '2026-06-16': 'Tahun Baru Islam 1448 Hijriah',
  '2026-08-17': 'Hari Kemerdekaan Republik Indonesia',
  '2026-08-25': 'Maulid Nabi Muhammad SAW',
  '2026-12-24': 'Cuti Bersama Hari Raya Natal',
  '2026-12-25': 'Hari Raya Natal'
};
const MONTH_NAMES = {1:'January',2:'February',3:'March',4:'April',5:'May',6:'June',7:'July',8:'August',9:'September',10:'October',11:'November',12:'December'};

function arg(name, required=false) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && idx + 1 < process.argv.length) return process.argv[idx+1];
  if (required) throw new Error(`Missing --${name}`);
  return null;
}
function b64url(input) { return Buffer.from(input).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_'); }
async function getAccessToken() {
  const key = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
  const now = Math.floor(Date.now()/1000);
  const header = {alg:'RS256', typ:'JWT'};
  const claim = {iss:key.client_email, scope:'https://www.googleapis.com/auth/spreadsheets.readonly', aud:key.token_uri, exp:now+3600, iat:now};
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const signer = crypto.createSign('RSA-SHA256'); signer.update(unsigned); signer.end();
  const sig = signer.sign(key.private_key, 'base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const jwt = `${unsigned}.${sig}`;
  const body = new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion:jwt});
  const res = await fetch(key.token_uri, {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body});
  if (!res.ok) throw new Error(`Token failed ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}
async function fetchSheet() {
  const token = await getAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_RANGE)}`;
  const res = await fetch(url, {headers:{Authorization:`Bearer ${token}`}});
  if (!res.ok) throw new Error(`Sheets failed ${res.status}: ${await res.text()}`);
  return (await res.json()).values || [];
}
function getMonthMeta(year, month) {
  const numDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const holidays = {};
  for (const [ds, name] of Object.entries(INDONESIA_HOLIDAYS)) {
    const [y,m,d] = ds.split('-').map(Number); if (y===year && m===month) holidays[d] = name;
  }
  const saturdays=[], sundays=[], working=[];
  for (let d=1; d<=numDays; d++) {
    const dow = new Date(Date.UTC(year, month-1, d)).getUTCDay(); // Sun=0
    if (holidays[d] && dow >=1 && dow <=5) continue;
    if (dow === 6) saturdays.push(d); else if (dow === 0) sundays.push(d); else working.push(d);
  }
  return {working, saturdays, sundays, holidays};
}
function parseRecords(rows, year, month) {
  const out=[];
  for (const row of rows.slice(1)) {
    if (row.length < 7) continue;
    const name=(row[1]||'').trim(), dateStr=(row[2]||'').trim(), category=(row[3]||'').trim(), project=(row[4]||'').trim(), task=(row[5]||'').trim(), timeStr=(row[6]||'0').trim(), notes=(row[7]||'').trim();
    if (!name || !dateStr) continue;
    const parts = dateStr.split('/').map(x=>parseInt(x,10)); if (parts.length !== 3 || parts.some(Number.isNaN)) continue;
    const [m,d,y] = parts; if (y===year && m===month) out.push({date:dateStr, day:d, name, project, task, time:parseFloat(timeStr)||0, category, notes, date_iso:`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`});
  }
  return out;
}
function buildOutput(year, month, records, meta) {
  const staff = {};
  for (const r of records) {
    if (!staff[r.name]) staff[r.name] = {total_hours:0, daily:{}, projects:{}, tasks:[]};
    const s=staff[r.name]; s.total_hours += r.time; s.daily[r.day] = (s.daily[r.day]||0) + r.time; s.projects[r.project] = (s.projects[r.project]||0) + r.time; s.tasks.push(r);
  }
  const expected = meta.working.length * 8;
  for (const s of Object.values(staff)) s.utilization = expected ? s.total_hours / expected * 100 : 0;
  return {month:`${MONTH_NAMES[month]} ${year}`, year, month_num:month, working_days:meta.working.length, expected_hours:expected, holidays:Object.fromEntries(Object.entries(meta.holidays).map(([k,v])=>[String(k),v])), saturdays:meta.saturdays, sundays:meta.sundays, staff};
}
(async()=>{
  const year = parseInt(arg('year', true),10), month = parseInt(arg('month', true),10), outArg = arg('out');
  console.log(`\nFetching timesheet: ${MONTH_NAMES[month]} ${year}`);
  const meta = getMonthMeta(year, month);
  console.log(`  Hari kerja   : ${meta.working.length}`);
  console.log(`  Hari libur   : ${JSON.stringify(Object.values(meta.holidays))}`);
  console.log(`  Target jam   : ${meta.working.length*8} jam/orang`);
  const rows = await fetchSheet();
  const records = parseRecords(rows, year, month);
  console.log(`  Records ditemukan: ${records.length}`);
  const output = buildOutput(year, month, records, meta);
  const outPath = outArg || path.join(DATA_DIR, `${MONTH_NAMES[month].toLowerCase()}${year}_data.json`);
  fs.mkdirSync(path.dirname(outPath), {recursive:true});
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Data saved -> ${outPath}`);
})().catch(e=>{console.error(e.stack||e); process.exit(1);});
