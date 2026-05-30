# SatpamTDI Backup

Backup workspace untuk memindahkan Satpam TDI ke server baru tanpa perlu setting ulang dari nol.

## Isi Backup

### Core Satpam TDI

- `AGENTS.md` — aturan workspace dan perilaku operasional.
- `SOUL.md` — persona/tone.
- `IDENTITY.md` — identitas Satpam TDI.
- `USER.md` — preferensi dasar pengguna.
- `TOOLS.md` — catatan tool lokal.
- `HEARTBEAT.md` — konfigurasi checklist heartbeat.
- `notes/` — catatan topik, termasuk Energy Transition.
- `memory/` — memori harian dan catatan kontinuitas.

### Workflow Automation

- `timesheet-reports/` — workflow timesheet report, termasuk script, blueprint, workflow docs, dan config.
- `gridscale-apa-backup-workflow/` — workflow backup GridScale X APA, termasuk script dan dokumentasi workflow.
- `schedules/` — backup/dokumentasi schedule OpenClaw cron jobs untuk restore di server baru.

## Tidak Diikutsertakan

Backup ini sengaja tidak menyertakan:

- token, credential, private key, service account key, session cookie, atau config rahasia;
- log mentah dan output runtime;
- hasil audit/report besar;
- data hasil fetch timesheet dan output HTML report;
- file backup database GridScale X APA.

Runtime outputs yang dikecualikan antara lain:

- `timesheet-reports/data/`
- `timesheet-reports/output/`
- `gridscale-apa-backup-workflow/logs/`

## Cara Restore

1. Install OpenClaw di server baru.
2. Clone repo ini.
3. Jalankan `restore.ps1` atau copy semua file/folder utama ke workspace OpenClaw baru, biasanya:
   `C:\Users\Administrator\.openclaw\workspace`
4. Restore credential secara manual di luar GitHub, terutama:
   - GitHub login/token untuk push backup;
   - Google service account key untuk timesheet;
   - messaging credentials Telegram/WhatsApp/OpenClaw;
   - mapping drive `X:` dan `T:` untuk GridScale X APA.
5. Test manual workflow satu per satu.
6. Buat ulang/aktifkan schedule berdasarkan `schedules/cron-jobs-backup.json` dan `schedules/restore-schedules.md`.
7. Restart OpenClaw bila diperlukan.

## Catatan Keamanan

Repo disarankan **private** karena berisi memori, preferensi personal, struktur workflow, dan target schedule operasional.
