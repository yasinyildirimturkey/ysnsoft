# hotel-chat -> IIS kurulumu (varsayilan: patiotel.ysnsoft.com). Yalnizca bu alt alan adinin klasorune dokunur.
param([string]$SiteName = 'patiotel.ysnsoft.com')
$ErrorActionPreference = 'Stop'
if ($SiteName -notmatch '^[a-z0-9.-]+$') { throw "Gecersiz site adi: $SiteName" }
$site    = Join-Path 'C:\Inetpub\vhosts\ysnsoft.com' $SiteName
if (-not (Test-Path $site)) { throw "Site klasoru yok: $site" }
$private = 'C:\Inetpub\vhosts\ysnsoft.com\private'
$stage   = Join-Path $env:USERPROFILE 'hc-stage'
$zip     = Join-Path $stage 'hotel-chat.zip'
$stamp   = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup  = Join-Path $private "$SiteName-backup-$stamp"

if (-not (Test-Path $zip)) { throw "Paket yok: $zip" }

# 1) Mevcut icerigi yedekle (Plesk'in varsayilan sayfasi ve web.config'i).
New-Item -ItemType Directory -Force $backup | Out-Null
Get-ChildItem $site -Force | Where-Object { $_.Name -notin @('node_modules', 'data', 'iisnode') } |
  ForEach-Object { Copy-Item $_.FullName -Destination $backup -Recurse -Force }
"Yedek: $backup"

# 2) Eski kod klasorlerini kaldir (ilk kurulumda yoktur); .env, data ve iisnode loglari korunur.
foreach ($d in 'dist', 'public', 'hotels', 'node_modules') {
  $p = Join-Path $site $d
  if (Test-Path $p) { Remove-Item $p -Recurse -Force }
}

# 3) Paketi yerinde ac. web.config en son konur ki yarim kurulum calismaya baslamasin.
$tmpCfg = Join-Path $stage 'web.config.new'
& "$env:SystemRoot\System32\tar.exe" -x -f $zip -C $site --exclude './web.config'
if ($LASTEXITCODE -ne 0) { throw "tar hata kodu $LASTEXITCODE" }
& "$env:SystemRoot\System32\tar.exe" -x -f $zip -C $stage './web.config'
Move-Item (Join-Path $stage 'web.config') $tmpCfg -Force

# 4) .env yalnizca yoksa konur; var olan ayarlar ve anahtar ezilmez.
$envFile = Join-Path $site '.env'
if (Test-Path $envFile) { '.env zaten var, dokunulmadi' }
else { Copy-Item (Join-Path $stage 'server.env') $envFile; '.env olusturuldu' }
New-Item -ItemType Directory -Force (Join-Path $site 'data') | Out-Null

# 5) Varsayilan sayfa artik sunulmayacak; karisiklik olmasin diye kaldirilir (yedegi alindi).
Remove-Item (Join-Path $site 'index.html') -Force -ErrorAction SilentlyContinue

# 6) Izinler: dosyalar klasorun kendi izinlerini devralsin (IIS kullanicisi okuyup data'ya yazabilsin).
# Yalnizca ALT ogeler sifirlanir. Klasorun kendisine /reset uygulanirsa Plesk'in verdigi acik
# izin (IIS grubu icin tam yetki) silinir ve iisnode log/veri yazamadigi icin uygulama acilmaz.
Get-ChildItem $site -Force | ForEach-Object { & icacls $_.FullName /reset /T /C /Q | Out-Null }

# 7) web.config'i yerine koy -> iisnode uygulamayi baslatir.
Copy-Item $tmpCfg (Join-Path $site 'web.config') -Force
& icacls (Join-Path $site 'web.config') /reset /Q | Out-Null

# 8) Anahtar yazma betigi private klasorune (web'den erisilemez).
Copy-Item (Join-Path $stage 'hc-set-key.ps1') (Join-Path $private 'hc-set-key.ps1') -Force

# Temizlik: sahnelenen ayar dosyasi parola icerir, birakilmaz.
Remove-Item (Join-Path $stage 'server.env'), $tmpCfg, $zip -Force -ErrorAction SilentlyContinue
'Kurulum tamam'
Get-ChildItem $site -Force | ForEach-Object { $_.Name }
