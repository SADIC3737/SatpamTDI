# Schedules Backup

Folder ini menyimpan dokumentasi/export schedule OpenClaw yang perlu dibuat ulang saat pindah server.

File utama:
- `cron-jobs-backup.json` — export job cron/schedule saat backup terakhir.
- `restore-schedules.md` — panduan restore schedule secara manual/terkontrol.

Catatan keamanan:
- Jadwal boleh dibackup, tetapi credential/token tetap harus disiapkan ulang di server baru.
- Saat restore, cek ulang target chat/group, path drive, service account, dan mapping drive sebelum mengaktifkan job.
