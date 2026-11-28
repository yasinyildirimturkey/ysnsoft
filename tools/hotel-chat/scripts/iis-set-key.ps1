# Claude API anahtarini standart girdiden okuyup sitedeki .env dosyasina yazar,
# gercek modele gecer ve uygulamayi yeniden baslatir. Anahtari ekrana ya da loga yazmaz.
param([string]$SiteName = 'patiotel.ysnsoft.com')
$ErrorActionPreference = 'Stop'
if ($SiteName -notmatch '^[a-z0-9.-]+$') { throw "Gecersiz site adi: $SiteName" }
$site = Join-Path 'C:\Inetpub\vhosts\ysnsoft.com' $SiteName
$envFile = Join-Path $site '.env'

$key = ([Console]::In.ReadToEnd()).Trim()
if ($key -notmatch '^sk-ant-[A-Za-z0-9_\-]{20,}$') { throw 'Girdi bir Claude API anahtarina benzemiyor (sk-ant- ile baslamali). Hicbir sey degistirilmedi.' }

$lines = Get-Content $envFile -Encoding UTF8 | Where-Object { $_ -notmatch '^(ANTHROPIC_API_KEY|LLM_MODE)=' }
$lines += "ANTHROPIC_API_KEY=$key"
$lines += 'LLM_MODE=anthropic'
[IO.File]::WriteAllLines($envFile, $lines, (New-Object Text.UTF8Encoding($false)))

# web.config'e dokunmak iisnode'un yalnizca bu uygulamayi yeniden baslatmasini saglar.
(Get-Item (Join-Path $site 'web.config')).LastWriteTime = Get-Date
'Anahtar yazildi, gercek modele gecildi, uygulama yeniden baslatiliyor.'
