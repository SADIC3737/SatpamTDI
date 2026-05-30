# 📊 Monthly Timesheet Reporting System
**PT TwinK Digital Indonesia**
*Versi: 2.0 — Kompatibel dengan semua AI agent & model*

---

## Quick Start

```bash
# Contoh: Generate report Mei 2026
cd timesheet-reports/scripts

python fetch_timesheet.py --year 2026 --month 5
python generate_dashboard.py --data ../data/mei2026_data.json --send-tg
```

Selesai. Dashboard terkirim ke Telegram.

---

## Untuk Agent AI

Baca file berikut sebelum menjalankan apapun:

| File | Isi |
|------|-----|
| `config.json` | Semua credentials & path — **ambil dari sini, jangan hardcode** |
| `WORKFLOW.md` | SOP langkah-langkah step-by-step |
| `BLUEPRINT.md` | Spesifikasi teknis, struktur data, aturan desain dashboard |
| `memory/holidays_indonesia_2026.md` | Hari libur nasional resmi — **gunakan ini, bukan pengetahuan internal model** |

---

## Struktur Directory

```
timesheet-reports/
├── config.json            ← Edit di sini untuk ganti credentials/target
├── README.md
├── WORKFLOW.md
├── BLUEPRINT.md
│
├── scripts/
│   ├── fetch_timesheet.py     ← Step 1: ambil data dari Google Sheets
│   └── generate_dashboard.py  ← Step 2: buat HTML + kirim Telegram
│
├── data/                  ← JSON per bulan (output fetch)
│   └── [bulan][tahun]_data.json
│
└── output/                ← HTML dashboard per bulan
    └── [bulan][tahun]/
        └── dashboard.html
```

---

## Prompt Template

Untuk request ke agent AI manapun:

```
Buatkan timesheet dashboard untuk [BULAN] [TAHUN].

Ikuti: timesheet-reports/WORKFLOW.md
Config: timesheet-reports/config.json
Libur: memory/holidays_indonesia_2026.md

Fetch dari Google Sheets → generate HTML → kirim ke Telegram.
Jangan hardcode credentials, ambil semua dari config.json.
```

---

## Riwayat Dashboard

| Bulan | File | Status |
|-------|------|--------|
| Februari 2026 | output/februari2026/dashboard.html | ✅ Terkirim |
| Maret 2026 | output/march2026/dashboard.html | ✅ Terkirim |
| April 2026 | output/april2026/dashboard.html | ✅ Terkirim |
