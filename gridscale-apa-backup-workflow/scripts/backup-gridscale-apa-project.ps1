param(
  [string]$RunDate = (Get-Date -Format 'yyyyMMdd'),
  [switch]$WhatIfOnly
)

$ErrorActionPreference = 'Stop'

$workflowRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$localLogDir = Join-Path $workflowRoot 'logs'
New-Item -ItemType Directory -Force -Path $localLogDir | Out-Null

$backupRoot = 'T:\01 Project\2026 GridScale X APA\02-WORKING DIRECTORY\2.4-BACKUP DB'
$destinationRoot = Join-Path $backupRoot $RunDate

$sources = @(
  [pscustomobject]@{
    Name = 'DATABASE_FDB'
    SourcePath = 'X:\DATABASE GRID SCALE APA SULUT\DATABASE'
    Filter = '*.FDB'
    DestinationFolder = 'DATABASE_FDB'
  },
  [pscustomobject]@{
    Name = 'SLD_GF'
    SourcePath = 'X:\DATABASE GRID SCALE APA SULUT\SLD (GF)'
    Filter = '*.gf'
    DestinationFolder = 'SLD_GF'
  }
)

$started = Get-Date
$logLines = New-Object System.Collections.Generic.List[string]
$manifest = New-Object System.Collections.Generic.List[object]
$warnings = New-Object System.Collections.Generic.List[string]
$errors = New-Object System.Collections.Generic.List[string]

function Add-Log {
  param([string]$Message)
  $line = "{0} {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  $script:logLines.Add($line) | Out-Null
  Write-Host $line
}

function Format-Bytes {
  param([long]$Bytes)
  if ($Bytes -ge 1GB) { return ('{0:N2} GB' -f ($Bytes / 1GB)) }
  if ($Bytes -ge 1MB) { return ('{0:N2} MB' -f ($Bytes / 1MB)) }
  if ($Bytes -ge 1KB) { return ('{0:N2} KB' -f ($Bytes / 1KB)) }
  return ("$Bytes B")
}

Add-Log "Backup GridScale X APA started. RunDate=$RunDate WhatIfOnly=$WhatIfOnly"
Add-Log "Destination root: $destinationRoot"

try {
  if (-not $WhatIfOnly) {
    New-Item -ItemType Directory -Force -Path $destinationRoot | Out-Null
  }
} catch {
  $errors.Add("Cannot create destination root: $destinationRoot :: $($_.Exception.Message)") | Out-Null
}

$totalFiles = 0
$okFiles = 0
$failedFiles = 0
$totalBytes = 0L

foreach ($src in $sources) {
  Add-Log "Scanning $($src.Name): $($src.SourcePath) filter $($src.Filter)"

  if (-not (Test-Path -LiteralPath $src.SourcePath)) {
    $msg = "Source not found: $($src.SourcePath)"
    $warnings.Add($msg) | Out-Null
    Add-Log "WARNING: $msg"
    continue
  }

  $files = @(Get-ChildItem -LiteralPath $src.SourcePath -File -Filter $src.Filter -ErrorAction Stop)
  if ($files.Count -eq 0) {
    $msg = "No files found: $($src.SourcePath) filter $($src.Filter)"
    $warnings.Add($msg) | Out-Null
    Add-Log "WARNING: $msg"
    continue
  }

  $destFolder = Join-Path $destinationRoot $src.DestinationFolder
  if (-not $WhatIfOnly) {
    New-Item -ItemType Directory -Force -Path $destFolder | Out-Null
  }

  foreach ($file in $files) {
    $totalFiles++
    $destPath = Join-Path $destFolder $file.Name
    $rowStatus = 'OK'
    $rowError = ''

    try {
      if ($WhatIfOnly) {
        Add-Log "WHATIF copy: $($file.FullName) -> $destPath"
      } else {
        Copy-Item -LiteralPath $file.FullName -Destination $destPath -Force -ErrorAction Stop
        $copied = Get-Item -LiteralPath $destPath -ErrorAction Stop
        if ($copied.Length -ne $file.Length) {
          throw "Size mismatch source=$($file.Length) dest=$($copied.Length)"
        }
        Add-Log "Copied: $($file.Name) ($($file.Length) bytes)"
      }
      $okFiles++
      $totalBytes += [int64]$file.Length
    } catch {
      $failedFiles++
      $rowStatus = 'FAILED'
      $rowError = $_.Exception.Message
      $msg = "Copy failed: $($file.FullName) -> $destPath :: $rowError"
      $errors.Add($msg) | Out-Null
      Add-Log "ERROR: $msg"
    }

    $manifest.Add([pscustomobject]@{
      RunDate = $RunDate
      SourceGroup = $src.Name
      SourcePath = $file.FullName
      DestinationPath = $destPath
      FileName = $file.Name
      SizeBytes = [int64]$file.Length
      LastWriteTime = $file.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
      Status = $rowStatus
      Error = $rowError
    }) | Out-Null
  }
}

$ended = Get-Date
$durationSeconds = [math]::Round(($ended - $started).TotalSeconds, 2)

$status = 'SUCCESS'
$exitCode = 0
if ($errors.Count -gt 0 -or $failedFiles -gt 0) {
  $status = 'FAILED'
  $exitCode = 2
} elseif ($warnings.Count -gt 0) {
  $status = 'WARNING'
  $exitCode = 1
}

Add-Log "Backup GridScale X APA finished. Status=$status OK=$okFiles Total=$totalFiles Failed=$failedFiles Bytes=$totalBytes DurationSeconds=$durationSeconds"

$manifestPath = Join-Path $destinationRoot 'manifest.csv'
$backupLogPath = Join-Path $destinationRoot 'backup-log.txt'
$summaryPath = Join-Path $localLogDir 'last-run-summary.json'
$localTranscriptPath = Join-Path $localLogDir ("backup-$RunDate-{0}.log" -f (Get-Date -Format 'HHmmss'))

if (-not $WhatIfOnly -and (Test-Path -LiteralPath $destinationRoot)) {
  $manifest | Export-Csv -LiteralPath $manifestPath -NoTypeInformation -Encoding UTF8
  $logLines | Set-Content -LiteralPath $backupLogPath -Encoding UTF8
}
$logLines | Set-Content -LiteralPath $localTranscriptPath -Encoding UTF8

$summary = [ordered]@{
  workflow = 'GridScale X APA Backup'
  status = $status
  runDate = $RunDate
  started = $started.ToString('yyyy-MM-dd HH:mm:ss')
  ended = $ended.ToString('yyyy-MM-dd HH:mm:ss')
  durationSeconds = $durationSeconds
  destinationRoot = $destinationRoot
  manifestPath = $manifestPath
  backupLogPath = $backupLogPath
  localTranscriptPath = $localTranscriptPath
  whatIfOnly = [bool]$WhatIfOnly
  totalFiles = $totalFiles
  okFiles = $okFiles
  failedFiles = $failedFiles
  totalBytes = $totalBytes
  totalBytesHuman = (Format-Bytes $totalBytes)
  warnings = @($warnings)
  errors = @($errors)
  telegramGroups = @('-1002419486905', '-1003941623277')
}

$summary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $summaryPath -Encoding UTF8

Write-Host ''
Write-Host '=== GRIDScale X APA Backup Summary ==='
Write-Host ("Status       : {0}" -f $status)
Write-Host ("RunDate      : {0}" -f $RunDate)
Write-Host ("Destination  : {0}" -f $destinationRoot)
Write-Host ("Files        : OK {0} / Total {1} / Failed {2}" -f $okFiles, $totalFiles, $failedFiles)
Write-Host ("Total Size   : {0}" -f (Format-Bytes $totalBytes))
Write-Host ("Duration     : {0}s" -f $durationSeconds)
Write-Host ("Summary JSON : {0}" -f $summaryPath)

exit $exitCode
