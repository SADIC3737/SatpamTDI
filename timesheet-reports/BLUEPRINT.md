# ðŸ—ï¸ Blueprint â€” Timesheet Dashboard System
**PT TwinK Digital Indonesia**
*Versi: 2.0 â€” Agent-Agnostic (berlaku untuk semua AI agent & model)*

---

## Ringkasan Sistem

```
AppSheet (staff input timesheet harian)
    â†“ sync otomatis
Google Sheets (sumber data utama)
    â†“ scripts/fetch_timesheet.py
data/[bulan][tahun]_data.json
    â†“ scripts/generate_dashboard.py
output/[bulan][tahun]/dashboard.html
    â†“ Telegram Bot API (sendDocument)
Telegram chat Pak Bos
```

---

## Struktur Directory

```
timesheet-reports/
â”œâ”€â”€ config.json            â† SATU-SATUNYA file konfigurasi (edit di sini saja)
â”œâ”€â”€ README.md              â† Quick start
â”œâ”€â”€ WORKFLOW.md            â† SOP langkah-langkah
â”œâ”€â”€ BLUEPRINT.md           â† File ini â€” spesifikasi teknis
â”‚
â”œâ”€â”€ scripts/
â”‚   â”œâ”€â”€ fetch_timesheet.py     â† Fetch Google Sheets â†’ JSON
â”‚   â””â”€â”€ generate_dashboard.py  â† JSON â†’ HTML dashboard + kirim Telegram
â”‚
â”œâ”€â”€ data/                  â† JSON output dari fetch (satu file per bulan)
â”‚   â””â”€â”€ [bulanid][yyyy]_data.json
â”‚
â””â”€â”€ output/                â† HTML dashboard (satu subfolder per bulan)
    â””â”€â”€ [bulanid][yyyy]/
        â””â”€â”€ dashboard.html
```

**Naming convention:**
- `bulanid` = nama bulan lowercase Bahasa Indonesia: `januari`, `februari`, `maret`, `april`, `mei`, `juni`, `juli`, `agustus`, `september`, `oktober`, `november`, `desember`

---

## config.json â€” Semua Konfigurasi di Satu Tempat

```json
{
  "google_sheets": {
    "spreadsheet_id": "...",
    "sheet_tab": "Timesheet",
    "range": "'Timesheet'!1:5000",
    "service_account_key": "path/ke/key.json",
    "columns": { "1":"name", "2":"date(M/D/YYYY)", "4":"project", "6":"hours" }
  },
  "telegram": {
    "bot_token": "...",
    "chat_id": "..."
  },
  "company": {
    "name": "PT TwinK Digital Indonesia",
    "work_hours_per_day": 8
  },
  "output": {
    "data_dir": "data",
    "output_dir": "output"
  }
}
```

> Ganti spreadsheet, bot, atau perusahaan â†’ **cukup edit config.json**, tidak perlu sentuh script.

---

## Hari Libur Nasional 2026 (RESMI â€” ditetapkan Pak Bos)

Tersimpan di: `scripts/fetch_timesheet.py` bagian `INDONESIA_HOLIDAYS`
Dan di: `memory/holidays_indonesia_2026.md`

| Tanggal | Nama |
|---------|------|
| 1 Jan | Tahun Baru Masehi |
| 16 Jan | Isra Mi'raj Nabi Muhammad SAW |
| 16 Feb | Cuti Bersama Tahun Baru Imlek 2577 |
| 17 Feb | Tahun Baru Imlek 2577 Kongzili |
| 18 Mar | Cuti Bersama Nyepi |
| 19 Mar | Hari Suci Nyepi (Tahun Baru Saka 1948) |
| 20 Mar | Cuti Bersama Idul Fitri |
| 21 Mar | Hari Raya Idul Fitri 1447 H |
| 22 Mar | Hari Raya Idul Fitri 1447 H (hari ke-2) |
| 23 Mar | Cuti Bersama Idul Fitri |
| 24 Mar | Cuti Bersama Idul Fitri |
| 3 Apr | Wafat Yesus Kristus |
| 5 Apr | Hari Kebangkitan Yesus Kristus (Paskah) |
| 1 Mei | Hari Buruh Internasional |
| 14 Mei | Kenaikan Yesus Kristus |
| 15 Mei | Cuti Bersama Kenaikan Yesus Kristus |
| 27 Mei | Idul Adha 1447 Hijriah |
| 28 Mei | Cuti Bersama Idul Adha |
| 31 Mei | Hari Raya Waisak 2570 BE |
| 1 Jun | Hari Lahir Pancasila |
| 16 Jun | Tahun Baru Islam 1448 Hijriah |
| 17 Agt | Hari Kemerdekaan RI |
| 25 Agt | Maulid Nabi Muhammad SAW |
| 24 Des | Cuti Bersama Natal |
| 25 Des | Hari Raya Natal |

---

## Kalkulasi Hari Kerja

```
Hari Kerja = Total hari âˆ’ Sabtu âˆ’ Minggu âˆ’ Libur Nasional (weekday saja)
Target Jam = Hari Kerja Ã— 8
```

> Libur yang jatuh Sabtu/Minggu â†’ muncul di kalender, **tidak** kurangi hari kerja.

---

## Struktur JSON Data

```json
{
  "month": "Februari 2026",
  "year": 2026,
  "month_num": 2,
  "working_days": 18,
  "expected_hours": 144,
  "holidays": { "16": "Cuti Bersama Imlek", "17": "Tahun Baru Imlek" },
  "saturdays": [7, 14, 21, 28],
  "sundays": [1, 8, 15, 22],
  "staff": {
    "Nama Staff": {
      "total_hours": 160.0,
      "utilization": 111.1,
      "daily": { "2": 8, "3": 8 },
      "projects": { "Nama Project": 80.0 },
      "tasks": [...]
    }
  }
}
```

---

## Desain Dashboard HTML

> **Standar visual per 2026-05-20:** dashboard timesheet wajib mengikuti style sample-dashboard yang disetujui Pak Bos — header gradient ungu, background pastel `#f0f4ff`, card putih radius 14px, shadow soft, struktur/class `hdr`, `badges`, `stat-row`, `hol-row`, `cal-card`, `scores`, `cg2col`, `proj-card`, `tbl`, `footer`. Kalender memakai dot per staff + total jam kecil; leaderboard memakai score card ranking/medal/progress bar; dua bar chart wajib: total jam per staff dan % pengisian hari kerja. Generator standar: `scripts/generate_dashboard_standard_node.js`.

### Urutan Section (tidak boleh diubah)
1. Header (nama bulan, badges stats)
2. Ringkasan Bulan (6 stat cards)
3. Hari Libur Nasional (kartu per libur + kartu kalkulasi)
4. **Kalender** â† selalu sebelum leaderboard
5. **Leaderboard** â† diurutkan by total jam DESC (bukan %)
6. Bar Charts (jam & % pengisian)
7. Project Breakdown (bar horizontal, diurutkan by jam DESC)
8. Tabel Detail

### Color Coding Kalender
| Jenis | Background | Border |
|-------|-----------|--------|
| Ada timesheet | `#eff6ff` | `#bfdbfe` |
| Sabtu | `#fef9c3` | `#fde68a` |
| Minggu | `#ffedd5` | `#fdba74` |
| Libur Nasional (weekday) | `#fee2e2` | `#fca5a5` |

### Status Staff
| Kondisi | Label | Warna |
|---------|-------|-------|
| â‰¥ 110% target | Excellent | Hijau |
| â‰¥ 100% target | Lengkap | Biru |
| â‰¥ 90% target | Hampir | Kuning |
| < 90% target | Kurang | Merah |

---

## Keputusan Desain (Tidak Boleh Diubah Tanpa Persetujuan Pak Bos)

| Keputusan | Alasan |
|-----------|--------|
| Leaderboard by **total jam** | Permintaan Pak Bos â€” lebih fair |
| Kalender **sebelum** leaderboard | Permintaan Pak Bos |
| HTML dikirim sebagai **file** ke Telegram | Lebih mudah dibuka di browser |
| Single-file HTML inline CSS | Tidak butuh server, mudah dibagikan |
| Semua config di `config.json` | Agent manapun bisa baca tanpa hardcode |

---

## Cara Agent AI Menjalankan Workflow

Agent AI yang menerima request report bulanan **wajib**:

1. Baca `WORKFLOW.md` untuk urutan langkah
2. Baca `config.json` untuk credentials & path
3. Baca `memory/holidays_indonesia_2026.md` untuk data libur
4. Jalankan `fetch_timesheet.py` â†’ `generate_dashboard.py`
5. **Jangan hardcode** credentials â€” selalu ambil dari `config.json`
6. **Jangan ubah urutan section** dashboard tanpa izin Pak Bos

---

## Maintenance

| Kebutuhan | Tindakan |
|-----------|----------|
| Ganti spreadsheet | Edit `config.json` â†’ `google_sheets.spreadsheet_id` |
| Ganti Telegram target | Edit `config.json` â†’ `telegram.chat_id` |
| Tambah staff baru | Otomatis â€” tidak perlu ubah script |
| Update libur nasional | Edit `INDONESIA_HOLIDAYS` di `fetch_timesheet.py` + update `memory/holidays_indonesia_2026.md` |
| Ganti nama perusahaan | Edit `config.json` â†’ `company.name` |

