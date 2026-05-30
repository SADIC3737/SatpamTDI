# WORKFLOW — Backup Harian GridScale X APA

## Ringkasan

Workflow ini menjalankan backup file GridScale X APA dari drive `X:` ke folder backup proyek di drive `T:`, lalu melaporkan hasilnya ke group Telegram.

## Lokasi Script

```powershell
C:\Users\Administrator\.openclaw\workspace\gridscale-apa-backup-workflow\scripts\backup-gridscale-apa-project.ps1
```

## Manual Run

Jalankan backup untuk tanggal hari ini:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Administrator\.openclaw\workspace\gridscale-apa-backup-workflow\scripts\backup-gridscale-apa-project.ps1"
```

Dry run / simulasi tanpa copy file:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Administrator\.openclaw\workspace\gridscale-apa-backup-workflow\scripts\backup-gridscale-apa-project.ps1" -WhatIfOnly
```

Run untuk tanggal tertentu:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Administrator\.openclaw\workspace\gridscale-apa-backup-workflow\scripts\backup-gridscale-apa-project.ps1" -RunDate "20260517"
```

## Output Backup

Folder tujuan:

```text
T:\01 Project\2026 GridScale X APA\02-WORKING DIRECTORY\2.4-BACKUP DB\YYYYMMDD
```

File hasil:

```text
manifest.csv
backup-log.txt
DATABASE_FDB\...
SLD_GF\...
```

## Telegram Group yang Harus Menerima Laporan

Setiap selesai backup, laporan dikirim ke:

1. `-1002419486905`
2. `-1003941623277`

## Jadwal Cron OpenClaw

Jadwal yang direkomendasikan untuk hari kerja:

```cron
57 23 * * 1-5
```

Timezone:

```text
Asia/Jakarta
```

Payload cron menjalankan script backup, membaca summary JSON terakhir, lalu mengirim laporan ke dua group Telegram.

## Format Laporan

Contoh laporan sukses:

```text
Backup GridScale X APA — SUCCESS
Tanggal run: 20260517
Mulai: 2026-05-17 23:57:01
Selesai: 2026-05-17 23:57:19
Durasi: 18 detik
Tujuan: T:\01 Project\2026 GridScale X APA\02-WORKING DIRECTORY\2.4-BACKUP DB\20260517
File: OK 3 / Total 3 / Failed 0
Ukuran: 41.26 MB
```

Contoh warning:

```text
Backup GridScale X APA — WARNING
File berhasil disalin, tetapi ada source kosong/tidak ditemukan.
...
Warnings:
- Source not found: X:\...
```

Contoh gagal:

```text
Backup GridScale X APA — FAILED
Ada file yang gagal disalin.
...
Errors:
- Copy failed: ...
```

## Verifikasi Cepat

Setelah run, cek:

```powershell
Get-ChildItem "T:\01 Project\2026 GridScale X APA\02-WORKING DIRECTORY\2.4-BACKUP DB\YYYYMMDD" -Recurse
```

Cek manifest:

```powershell
Import-Csv "T:\01 Project\2026 GridScale X APA\02-WORKING DIRECTORY\2.4-BACKUP DB\YYYYMMDD\manifest.csv" | Format-Table
```

## Recovery Jika Cron Hilang

Kalau `openclaw cron list` kosong, recreate cron dari assistant/OpenClaw dengan instruksi:

```text
Buat ulang cron backup GridScale X APA weekday jam 23:57 WIB, jalankan script backup-gridscale-apa-project.ps1, dan laporkan hasil ke group -1002419486905 dan -1003941623277.
```

## Catatan Keamanan

- Jangan kirim path sensitif selain path backup operasional yang memang dibutuhkan.
- Jangan kirim isi file database ke Telegram.
- Jangan backup subfolder kecuali Pak Bos minta eksplisit.
- Untuk database Firebird live, pertimbangkan backup `gbak` agar konsisten secara transaksi.
