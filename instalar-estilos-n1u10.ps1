# Reparación de N1-U.10 sin pisar estilos existentes.
$ErrorActionPreference = 'Stop'
$cssPath = 'public/css/lab-arquitectura-n1u2.css'
$stylePatch = Join-Path $PSScriptRoot 'agora-n1u10-estilos.css'
if (-not (Test-Path $cssPath)) { throw "No se encuentra $cssPath. Ejecutá este script desde la raíz del repositorio." }
if (-not (Test-Path $stylePatch)) { throw "No se encuentra $stylePatch. Guardá ambos archivos juntos." }
$current = Get-Content -Raw -Encoding UTF8 $cssPath
$marker = '/* N1-U.10 · Leer el grafo desde textos breves'
if ($current.Contains($marker)) { Write-Host 'Los estilos N1-U.10 ya están presentes: sin cambios.'; exit 0 }
$extra = Get-Content -Raw -Encoding UTF8 $stylePatch
Add-Content -Path $cssPath -Encoding UTF8 -Value ("`r`n" + $extra)
Write-Host 'Estilos de N1-U.10 incorporados sin reemplazar los existentes.'
