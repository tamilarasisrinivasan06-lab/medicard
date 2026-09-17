$pg = 'C:\Users\LENOVO\AppData\Local\Temp\opencode\pg\pgsql\bin'
$data = 'C:\Users\LENOVO\AppData\Local\Temp\opencode\pg\data'
$log = 'C:\Users\LENOVO\AppData\Local\Temp\opencode\pg\pg.log'

if (-not (Test-Path (Join-Path $data 'PG_VERSION'))) {
  & (Join-Path $pg 'initdb.exe') -D $data -U postgres -A trust -E UTF8
}

$running = Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue
if ($running) {
  Write-Host 'PostgreSQL already running.'
} else {
  $env:PATH = "$pg;$env:PATH"
  Start-Process -FilePath (Join-Path $pg 'postgres.exe') -ArgumentList '-D', $data, '-p', '5432' -WindowStyle Hidden -RedirectStandardError $log
  Start-Sleep -Seconds 3
  Write-Host 'PostgreSQL started.'
}

$db = & (Join-Path $pg 'psql.exe') -p 5432 -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='medicard'"
if ($db -ne '1') {
  & (Join-Path $pg 'createdb.exe') -p 5432 -U postgres medicard
  Write-Host 'Database medicard created.'
}