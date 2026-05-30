# SatpamTDI Backup

Backup workspace untuk memindahkan Satpam TDI ke server baru tanpa perlu setting ulang dari nol.

## Isi Backup

- AGENTS.md - aturan workspace dan perilaku operasional.
- SOUL.md - persona/tone.
- IDENTITY.md - identitas Satpam TDI.
- USER.md - preferensi dasar pengguna.
- TOOLS.md - catatan tool lokal.
- HEARTBEAT.md - konfigurasi checklist heartbeat.
- 
otes/ - catatan topik, termasuk Energy Transition.
- memory/ - memori harian dan catatan kontinuitas.

## Tidak Diikutsertakan

Backup ini sengaja tidak menyertakan token, credential, session cookie, konfigurasi rahasia, log mentah, hasil audit sensitif, dan file besar/report operasional yang tidak diperlukan untuk deploy ulang persona.

## Cara Restore

1. Install OpenClaw di server baru.
2. Copy semua file/folder dari repo ini ke workspace OpenClaw baru, biasanya: C:\Users\Administrator\.openclaw\workspace
3. Restart OpenClaw bila diperlukan.
4. Cek kembali koneksi messaging, node pairing, dan credential secara manual di server baru.

## Catatan Keamanan

Repo disarankan **private** karena berisi memori dan preferensi personal.
