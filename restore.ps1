# Restore helper for Windows PowerShell
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspace = 'C:\Users\Administrator\.openclaw\workspace'
$items = @('AGENTS.md','SOUL.md','IDENTITY.md','USER.md','TOOLS.md','HEARTBEAT.md','notes','memory','timesheet-reports','gridscale-apa-backup-workflow','schedules')
foreach ($item in $items) {
  $src = Join-Path $repo $item
  if (Test-Path $src) {
    Copy-Item $src -Destination (Join-Path $workspace $item) -Recurse -Force
  }
}
Write-Host 'Restore selesai. Cek koneksi messaging/node/credential secara manual, lalu restart OpenClaw bila perlu.'
