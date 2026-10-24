param(
  [int]$Port = 8090
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Python = 'C:\Users\LEGION\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'

if (-not (Test-Path -LiteralPath $Python)) {
  throw "Python runtime not found: $Python"
}

$connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
foreach ($connection in $connections) {
  try {
    Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped old preview process: $($connection.OwningProcess)"
  } catch {}
}

Set-Location -LiteralPath $ProjectRoot
Write-Host ""
Write-Host "Qianli particle demo preview"
Write-Host "Project: $ProjectRoot"
Write-Host "URL:     http://127.0.0.1:$Port/index.html"
Write-Host ""
Write-Host "Keep this PowerShell window open. Press Ctrl+C to stop the preview server."
Write-Host ""

& $Python -m http.server $Port --bind 127.0.0.1
