# Satpam TDI weekly GitHub backup
# Refreshes selected workspace continuity files, commits changes, and pushes to GitHub.
$ErrorActionPreference = 'Stop'

$workspace = 'C:\Users\Administrator\.openclaw\workspace'
$repo = 'C:\Users\Administrator\.openclaw\workspace\SatpamTDI-github-backup'
$git = 'C:\Program Files\Git\cmd\git.exe'
if (-not (Test-Path $git)) { $git = 'git' }

Set-Location $repo

# Pull first so the local backup repo stays aligned with GitHub.
try {
  & $git pull --rebase origin main
} catch {
  Write-Warning "git pull failed; continuing with local refresh. Detail: $($_.Exception.Message)"
}

# Files that define identity, operating rules, preferences, and local tool notes.
$includeFiles = @(
  'AGENTS.md',
  'SOUL.md',
  'IDENTITY.md',
  'USER.md',
  'TOOLS.md',
  'HEARTBEAT.md'
)

foreach ($file in $includeFiles) {
  $source = Join-Path $workspace $file
  if (Test-Path $source) {
    Copy-Item $source -Destination (Join-Path $repo $file) -Force
  }
}

# Directories that hold continuity and user notes. Remove destination first so deletions are reflected.
$includeDirs = @('notes', 'memory')
foreach ($dir in $includeDirs) {
  $source = Join-Path $workspace $dir
  $dest = Join-Path $repo $dir
  if (Test-Path $source) {
    if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
    Copy-Item $source -Destination $dest -Recurse -Force
  }
}

# Refresh manifest after copying.
$manifest = Get-ChildItem $repo -Recurse -File -Force |
  Where-Object { $_.FullName -notmatch '\\.git\\' } |
  ForEach-Object {
    [PSCustomObject]@{
      Path = $_.FullName.Substring($repo.Length + 1)
      Bytes = $_.Length
      LastWriteTime = $_.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
    }
  } | Sort-Object Path
$manifest | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $repo 'manifest.json') -Encoding UTF8

& $git add -A
$status = & $git status --porcelain
if ([string]::IsNullOrWhiteSpace(($status -join "`n"))) {
  Write-Host 'No changes to backup. Repository already up to date.'
  exit 0
}

$timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm')
& $git commit -m "Weekly Satpam TDI backup $timestamp"
& $git push origin main
Write-Host "Backup pushed successfully at $timestamp"
