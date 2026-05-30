# BLUEPRINT — Backup Harian GridScale X APA

## 1. Tujuan

Workflow ini dibuat untuk memastikan file kerja penting GridScale X APA tersalin otomatis setiap hari ke folder backup proyek, lengkap dengan manifest, log, dan laporan hasil ke Telegram group yang ditentukan.

## 2. Scope Backup

Backup mengambil file dari folder sumber berikut secara flat / non-recursive, artinya hanya file di folder tersebut yang disalin; subfolder tidak ikut disalin.

| No | Sumber | Filter | Folder tujuan relatif |
|---:|---|---|---|
| 1 | `X:\DATABASE GRID SCALE APA SULUT\DATABASE` | `*.FDB` | `DATABASE_FDB` |
| 2 | `X:\DATABASE GRID SCALE APA SULUT\SLD (GF)` | `*.gf` | `SLD_GF` |

Catatan mapping drive:
- Drive `X:` adalah mapping aktif ke `\\win01-servertdi\GRIDSCALEXAPA`.
- Pada pengecekan 2026-05-20, mapping `X:` sudah tersedia dan kedua source path utama terverifikasi ada.
- Path lokal `C:\Project\GRIDSCALEXAPA` pernah dipakai sebagai fallback/manual check, tetapi workflow operasional utama memakai drive `X:` sesuai script.
- Drive `Z:` pernah terlihat mengarah ke lokasi yang sama pada setup lama, tetapi tidak dipakai dalam workflow ini.
- Folder Bali database tidak ditemukan pada path lama saat pengecekan 2026-05-17, jadi belum dimasukkan ke workflow.

## 3. Destination

Root backup:

```text
T:\01 Project\2026 GridScale X APA\02-WORKING DIRECTORY\2.4-BACKUP DB
```

Setiap run membuat folder tanggal:

```text
T:\01 Project\2026 GridScale X APA\02-WORKING DIRECTORY\2.4-BACKUP DB\YYYYMMDD
```

Contoh:

```text
T:\01 Project\2026 GridScale X APA\02-WORKING DIRECTORY\2.4-BACKUP DB\20260517
```

Struktur output:

```text
YYYYMMDD\
  DATABASE_FDB\
    *.FDB
  SLD_GF\
    *.gf
  manifest.csv
  backup-log.txt
```

## 4. File Workflow

Folder workflow:

```text
C:\Users\Administrator\.openclaw\workspace\gridscale-apa-backup-workflow
```

File utama:

```text
BLUEPRINT.md
WORKFLOW.md
scripts\backup-gridscale-apa-project.ps1
logs\
```

## 5. Jadwal Operasional

Rekomendasi jadwal cron OpenClaw:

```cron
57 23 * * 1-5
```

Timezone:

```text
Asia/Jakarta
```

Artinya backup berjalan Senin–Jumat pukul 23:57 WIB.

Jika Pak Bos ingin tetap setiap hari termasuk Sabtu/Minggu, gunakan:

```cron
57 23 * * *
```

## 6. Telegram Reporting

Setiap backup selesai, hasil wajib dilaporkan ke group Telegram berikut:

1. `-1002419486905`
2. `-1003941623277` — Anak Magang Command Center

Isi laporan minimal:
- Status: SUCCESS / WARNING / FAILED
- Waktu mulai dan selesai
- Durasi
- Folder tujuan
- Jumlah file sukses, gagal, total
- Total ukuran file tersalin
- Daftar error jika ada

## 7. Keberhasilan Backup

Status run:

- `SUCCESS`: semua source path ada, file ditemukan, dan semua copy sukses.
- `WARNING`: backup selesai tetapi ada source path tidak ditemukan atau tidak ada file pada salah satu source.
- `FAILED`: ada file yang gagal disalin atau destination tidak bisa dibuat.

Exit code script:

- `0`: SUCCESS
- `1`: WARNING
- `2`: FAILED

## 8. Caveat Penting

File `.FDB` kemungkinan adalah database Firebird. Copy file live secara langsung bisa tidak transactionally consistent kalau database sedang aktif dipakai.

Untuk backup production-grade, opsi yang lebih aman adalah menggunakan `gbak` Firebird, dengan credential dan service/host database yang benar.

Workflow ini tetap berguna untuk snapshot file harian, tetapi bukan pengganti backup database transactional.
