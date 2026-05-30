# 📋 SOP Workflow — Monthly Timesheet Report
**PT TwinK Digital Indonesia**
*Versi: 2.0 — Agent-Agnostic (berlaku untuk semua AI agent & model)*

---

## Prasyarat (Baca Sebelum Mulai)

Sebelum menjalankan workflow ini, agent AI **wajib** membaca:
1. `BLUEPRINT.md` — spesifikasi teknis & keputusan desain
2. `config.json` — semua credentials & path konfigurasi
3. `memory/holidays_indonesia_2026.md` — data hari libur resmi 2026

**Jangan hardcode** nilai apapun. Semua konfigurasi ada di `config.json`.

---

## Kapan Dijalankan

Setiap **awal bulan berikutnya**, setelah semua staff konfirmasi selesai mengisi timesheet.
Contoh: Report Mei 2026 → dijalankan di awal Juni 2026.

---

## STEP 1 — Verifikasi Staff Sudah Selesai Input

Konfirmasi ke Pak Bos atau cek Google Sheets:
- Spreadsheet ID: dari `config.json` → `google_sheets.spreadsheet_id`
- Tab: dari `config.json` → `google_sheets.sheet_tab`
- Filter bulan yang dimaksud, pastikan semua nama staff ada entry-nya

---

## STEP 2 — Cek Hari Libur Sudah Benar

Buka `scripts/fetch_timesheet.py` bagian `INDONESIA_HOLIDAYS`.

Data libur **resmi** ada di `memory/holidays_indonesia_2026.md`.
Pastikan data untuk bulan yang akan di-fetch sudah ada dan benar.

> ⚠️ **Penting:** Selalu gunakan data dari `memory/holidays_indonesia_2026.md` sebagai referensi utama.
> Jangan gunakan pengetahuan internal model — data resmi dari Pak Bos yang berlaku.

---

## STEP 3 — Fetch Data dari Google Sheets

```bash
cd timesheet-reports/scripts

python fetch_timesheet.py --year [YYYY] --month [M]
```

Contoh Mei 2026:
```bash
python fetch_timesheet.py --year 2026 --month 5
```

Output: `data/mei2026_data.json`

**Verifikasi output terminal:**
```
Fetching timesheet: Mei 2026
  Hari kerja   : 19        ← cek masuk akal
  Hari libur   : [...]     ← cek sesuai kalender resmi
  Target jam   : 152       ← = hari kerja × 8
  Records ditemukan: XXX   ← harus > 0
Data saved -> data/mei2026_data.json
```

Jika `Records ditemukan: 0` → cek format tanggal di sheet (harus `M/D/YYYY`).

---

## STEP 4 — Generate Dashboard HTML

```bash
# Generate + langsung kirim ke Telegram
python generate_dashboard.py \
    --data ../data/mei2026_data.json \
    --send-tg
```

Output default: `output/mei2026/dashboard.html`

Dengan path custom:
```bash
python generate_dashboard.py \
    --data ../data/mei2026_data.json \
    --out  ../output/mei2026/dashboard.html \
    --send-tg
```

---

## STEP 5 — Verifikasi Dashboard

Buka HTML di browser, pastikan:
- [ ] Header: nama bulan & tahun benar
- [ ] Badge: jumlah hari kerja benar
- [ ] Hari libur muncul di kartu & di kalender (warna merah)
- [ ] Kalender tampil sebelum leaderboard
- [ ] Leaderboard diurutkan by **total jam** (bukan %)
- [ ] Semua staff muncul
- [ ] Project breakdown muncul, diurutkan dari jam terbesar
- [ ] Sabtu = kuning, Minggu = oranye, Libur weekday = merah

---

## STEP 6 — Kirim ke Telegram

Sudah otomatis dengan flag `--send-tg`.

**Format pengiriman WAJIB:** kirim dashboard sebagai **file HTML/document attachment** yang bisa langsung diklik/dibuka oleh Pak Bos. **Jangan paste isi source HTML ke chat**. Isi chat cukup caption singkat, misalnya: `Timesheet Dashboard Mei 2026 — buka file HTML terlampir di browser.`

Jika gagal, kirim manual dengan script Python:

```python
import json, urllib.request, os

cfg       = json.load(open('../config.json'))
BOT_TOKEN = cfg['telegram']['bot_token']
CHAT_ID   = cfg['telegram']['chat_id']
file_path = '../output/mei2026/dashboard.html'

with open(file_path, 'rb') as f: content = f.read()
boundary = b'TGBoundary'
CRLF = b'\r\n'
body = (
    b'--'+boundary+CRLF+b'Content-Disposition: form-data; name="chat_id"'+CRLF+CRLF
    +CHAT_ID.encode()+CRLF+b'--'+boundary+CRLF
    +b'Content-Disposition: form-data; name="caption"'+CRLF+CRLF
    +b'Timesheet Dashboard Mei 2026'+CRLF+b'--'+boundary+CRLF
    +b'Content-Disposition: form-data; name="document"; filename="dashboard.html"'+CRLF
    +b'Content-Type: text/html'+CRLF+CRLF+content+CRLF
    +b'--'+boundary+b'--'+CRLF
)
req = urllib.request.Request(
    'https://api.telegram.org/bot'+BOT_TOKEN+'/sendDocument', data=body,
    headers={'Content-Type': 'multipart/form-data; boundary='+boundary.decode()})
with urllib.request.urlopen(req) as r:
    print(json.loads(r.read()))
```

---

## Checklist Ringkas

```
□ Konfirmasi staff sudah selesai input bulan [BULAN YYYY]
□ Baca config.json — ambil credentials dari sana
□ Cek holidays di memory/holidays_indonesia_2026.md
□ python fetch_timesheet.py --year YYYY --month M
□ Verifikasi: records > 0, hari kerja masuk akal
□ python generate_dashboard.py --data ... --send-tg
□ Verifikasi visual HTML di browser
□ Dashboard terkirim ke Telegram sebagai file HTML yang bisa diklik/dibuka ✓
□ Tidak mem-paste isi source HTML ke chat ✓
□ File tersimpan di output/[bulan][tahun]/dashboard.html ✓
```

---

## Prompt Template untuk Request ke Agent AI

Salin pesan berikut saat request report ke agent manapun:

```
Buatkan timesheet dashboard untuk [NAMA BULAN] [TAHUN].

Ikuti workflow di: timesheet-reports/WORKFLOW.md
Konfigurasi ada di: timesheet-reports/config.json
Data libur resmi ada di: memory/holidays_indonesia_2026.md

Langkah:
1. Fetch data dari Google Sheets
2. Generate dashboard HTML
3. Kirim ke Telegram sebagai file HTML/document attachment yang bisa langsung diklik/dibuka

Jangan paste isi source HTML ke chat.
Jangan hardcode credentials — ambil semua dari config.json.
```

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `google.auth` ImportError | `python -m pip install google-auth google-api-python-client` |
| Records = 0 | Cek format tanggal di sheet: harus `M/D/YYYY` |
| Hari libur salah | Cek `memory/holidays_indonesia_2026.md` — gunakan data itu |
| Telegram gagal | Cek koneksi, lalu kirim manual (lihat Step 6) |
| HTML kosong | Debug: `python -c "import json; d=json.load(open('data/xxx.json')); print(list(d['staff'].keys()))"` |
| `config.json` not found | Pastikan working directory di dalam folder `timesheet-reports/` |
