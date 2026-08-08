$ErrorActionPreference = "Stop"

$projectPath = Split-Path -Parent $PSScriptRoot
Set-Location $projectPath

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Falta Node.js. Instala Node.js 22 o superior y vuelve a ejecutar este archivo." -ForegroundColor Red
  exit 1
}

$nodeMajor = [int]((& node -p "process.versions.node.split('.')[0]").Trim())
if ($nodeMajor -lt 22) {
  Write-Host "Progy necesita Node.js 22 o superior. Tu version actual es $(& node --version)." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path ".env.local")) {
  Copy-Item ".env.example" ".env.local"
  Write-Host "Se creo .env.local. Abre ese archivo, coloca tus cuatro claves y vuelve a ejecutar este comando." -ForegroundColor Yellow
  exit 0
}

if (-not (Test-Path "node_modules")) {
  Write-Host "Instalando las dependencias de Progy..." -ForegroundColor Cyan
  & npm.cmd ci
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Progy estara disponible en http://localhost:4173" -ForegroundColor Green
& npx.cmd vite --host 0.0.0.0 --port 4173
