# Restore Schedules Satpam TDI

Saat deploy ulang di server baru:

1. Restore workspace files terlebih dahulu dengan `restore.ps1`.
2. Pastikan dependency tersedia:
   - Git
   - Node.js
   - PowerShell
   - OpenClaw gateway/agent aktif
3. Pastikan path eksternal sudah tersedia:
   - `X:` mapping ke `\\win01-servertdi\GRIDSCALEXAPA`
   - `T:` destination backup GridScale X APA
   - Google service account key untuk timesheet di path yang sesuai dengan `timesheet-reports/config.json`
4. Buat ulang schedule berdasarkan `cron-jobs-backup.json`.
5. Aktifkan job satu per satu setelah test manual workflow berhasil.

Schedule penting saat export ini:

- `gridscale-apa-backup-daily-2357` — harian 23:57 WIB.
- `timesheet-dashboard-current-month-mondays` — Senin 08:00 WIB.
- `Weekly TDI website health + certificate monitor` — Jumat 12:00 WIB.
- `Timesheet report H-5 akhir bulan ke Agent AI Command Center` — tanggal 23-26 jam 09:00 WIB, lanjut hanya bila H-5 akhir bulan.
- `weekly-satpamtdi-github-backup` — Sabtu 20:30 WIB.

Catatan: jangan aktifkan job sebelum credential, target chat, dan path sudah diverifikasi.
