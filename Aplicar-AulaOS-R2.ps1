param(
  [Parameter(Mandatory=$true)]
  [string]$RepoPath
)
$ErrorActionPreference = 'Stop'
$PatchPath = Join-Path $PSScriptRoot 'techrevive-aulaos-r2.patch'
if (-not (Test-Path $PatchPath)) { throw "No encuentro el parche: $PatchPath" }
if (-not (Test-Path (Join-Path $RepoPath 'wrangler.jsonc'))) { throw "RepoPath no parece ser la raíz del repositorio (falta wrangler.jsonc)." }
Push-Location $RepoPath
try {
  git apply --check $PatchPath
  if ($LASTEXITCODE -ne 0) { throw 'El parche no coincide con esta versión del repositorio; no se aplicó.' }
  git apply $PatchPath
  if ($LASTEXITCODE -ne 0) { throw 'Falló git apply.' }
  Write-Host 'Parche aplicado. Revisa los cambios con: git status --short'
  Write-Host 'Siguiente: crear/cargar el bucket R2 siguiendo AULAOS-R2-DEPLOY.md y después publicar los cambios.'
} finally { Pop-Location }
