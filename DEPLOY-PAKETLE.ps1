# =====================================================================
# YSNSOFT — CANLIYA DEPLOY PAKETLEME BETİĞİ (ysnsoft.com)
# =====================================================================
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host "`n=== [1/4] YSNSOFT Production Build Başlatılıyor ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0 -or -not (Test-Path '.next\BUILD_ID')) {
  Write-Host '*** Next.js BUILD HATASI! Paketleme iptal edildi. ***' -ForegroundColor Red
  return
}
Write-Host '  [OK] Next.js 16 Production Build başarıyla tamamlandı.' -ForegroundColor Green

Write-Host "`n=== [2/4] Dağıtım Klasörü Hazırlanıyor (_deploy) ===" -ForegroundColor Cyan
if (Test-Path _deploy) { Remove-Item _deploy -Recurse -Force }
New-Item -ItemType Directory _deploy\www | Out-Null

# Robocopy ile .next kopyala (.turbo, cache, map hariç)
robocopy .next _deploy\www\.next /E /XD cache dev .turbo /XF trace *.map *.log *.tmp* /NFL /NDL /NJH /NJS /NP | Out-Null
if (Test-Path public) {
  robocopy public _deploy\www\public /E /XD cache .cache /XF *.map *.log *.tmp* /NFL /NDL /NJH /NJS /NP | Out-Null
}

# Gerekli kök dosyaları ve klasörleri ekle
Copy-Item package.json, package-lock.json, next.config.ts, start.js, web.config _deploy\www\
if (Test-Path data) {
  # Canlı veritabanı dosyaları pakete girmez: sunucudaki gerçek talepler, randevular,
  # faturalar, site listesi, yonetici hesaplari (sifre ozetleri) ve islem kaydi
  # yerel kopyalarla ezilmesin. (Yoksa sunucu varsayılanları üretir.)
  # mail-log.jsonl ve scheduler\ (e-posta kaydi, zamanlanmis islerin "bugun yapildi" isaretleri) da sunucuya ozeldir.
  # push-vapid.json (bildirim anahtari) ASLA ezilmemeli: ezilirse telefonlardaki tum bildirim abonelikleri gecersiz olur.
  robocopy data _deploy\www\data /E /XD scheduler /XF leads.json appointments.json invoices.json system-settings.json testimonials.json offer-requests.json customer-care.json sites.json geo-settings.json admin-users.json admin-audit.log mail-log.jsonl push-vapid.json push-subs.json notifications.json notif-seen.json last-crash.json *.tmp /NFL /NDL /NJH /NJS /NP | Out-Null
}
if (Test-Path scripts) {
  robocopy scripts _deploy\www\scripts /E /NFL /NDL /NJH /NJS /NP | Out-Null
}
if (Test-Path tools\webscout\src) {
  # WebScout (yonetim paneli > Musteri Adaylari): yalnizca arac kodu pakete girer.
  # Sunucudaki aday veritabani (tools\webscout\data) ASLA ezilmez: durumlar ve ziyaret notlari orada yasar.
  robocopy tools\webscout _deploy\www\tools\webscout /E /XD data out node_modules seed /XF *.log /NFL /NDL /NJH /NJS /NP | Out-Null
  if (Test-Path tools\webscout\data\webscout.db) {
    # Ilk kurulum tohumu: sunucuda veritabani yoksa SUNUCUDA-UYGULA bunu data\ altina kopyalar, varsa siler.
    node --no-warnings tools\webscout\src\cli.js snapshot _deploy\www\tools\webscout\seed\webscout.db
    if ($LASTEXITCODE -ne 0) { Write-Host '*** WebScout veritabani kopyasi alinamadi. Paketleme iptal. ***' -ForegroundColor Red; return }
  }
  Write-Host '  [OK] WebScout araci pakete eklendi.' -ForegroundColor Green
}
if (Test-Path .env.local) {
  Copy-Item .env.local _deploy\www\.env.production
}

# Temizlik
Get-ChildItem _deploy\www -Recurse -Force -Directory | Where-Object { $_.Name -in @('cache', 'dev', '.cache', '.turbo') } | Remove-Item -Recurse -Force
Get-ChildItem _deploy\www -Recurse -Force -File | Where-Object { $_.Extension -in @('.map', '.log') -or $_.Name -eq 'trace' } | Remove-Item -Force

Write-Host "`n=== [3/4] Sunucu Uygulama Betiği Üretiliyor (SUNUCUDA-UYGULA.ps1) ===" -ForegroundColor Cyan
$sunucuBetiği = @'
# =====================================================================
# YSNSOFT — SUNUCUDA UYGULA (Plesk / IIS ysnsoft.com)
# =====================================================================
param(
  [string] $WwwKlasoru = 'C:\Inetpub\vhosts\ysnsoft.com\httpdocs',
  [string] $ZipDosyasi = (Join-Path $PSScriptRoot 'ysnsoft-next.zip')
)

$ErrorActionPreference = 'Stop'
Write-Host "`n=== YSNSOFT Canlıya Alım Başlatılıyor ===" -ForegroundColor Cyan

if (-not (Test-Path $ZipDosyasi)) {
  Write-Host "*** HATA: $ZipDosyasi bulunamadı! ***" -ForegroundColor Red
  return
}

Write-Host "1. Paket açılıyor: $WwwKlasoru" -ForegroundColor Yellow
if (-not (Test-Path $WwwKlasoru)) {
  New-Item -ItemType Directory -Path $WwwKlasoru -Force | Out-Null
}

# Mevcut .next yedeğini al
if (Test-Path "$WwwKlasoru\.next") {
  $damga = Get-Date -Format 'yyyyMMdd_HHmmss'
  Rename-Item "$WwwKlasoru\.next" "$WwwKlasoru\.next_yedek_$damga" -Force -ErrorAction SilentlyContinue
}

# Sunucuya ozel ayarlar paketteki .env.production ile ezilmesin:
# asagidaki anahtarlar sunucuda zaten tanimliysa sunucudaki deger korunur.
$KorunanAnahtarlar = @('ADMIN_PASSWORD_HASH', 'ADMIN_SESSION_SECRET')
$EnvDosyasi = Join-Path $WwwKlasoru '.env.production'
$Korunan = @{}
if (Test-Path $EnvDosyasi) {
  foreach ($satir in [System.IO.File]::ReadAllLines($EnvDosyasi)) {
    foreach ($anahtar in $KorunanAnahtarlar) {
      if ($satir.StartsWith("$anahtar=") -and $satir.Length -gt ($anahtar.Length + 1)) { $Korunan[$anahtar] = $satir }
    }
  }
}

# Zip'i aç
Expand-Archive -Path $ZipDosyasi -DestinationPath $WwwKlasoru -Force
Write-Host "  [OK] Dosyalar açıldı." -ForegroundColor Green

if ($Korunan.Count -gt 0 -and (Test-Path $EnvDosyasi)) {
  $yeni = New-Object System.Collections.Generic.List[string]
  $yazilan = @{}
  foreach ($satir in [System.IO.File]::ReadAllLines($EnvDosyasi)) {
    $eslesen = $null
    foreach ($anahtar in $Korunan.Keys) { if ($satir.StartsWith("$anahtar=")) { $eslesen = $anahtar } }
    if ($eslesen) { $yeni.Add($Korunan[$eslesen]); $yazilan[$eslesen] = $true } else { $yeni.Add($satir) }
  }
  foreach ($anahtar in $Korunan.Keys) { if (-not $yazilan[$anahtar]) { $yeni.Add($Korunan[$anahtar]) } }
  # BOM'suz UTF-8: Next.js ilk satirdaki anahtari BOM yuzunden kacirmasin
  [System.IO.File]::WriteAllLines($EnvDosyasi, $yeni, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host ("  [OK] Sunucu ayarlari korundu: " + (($Korunan.Keys | Sort-Object) -join ', ')) -ForegroundColor Green
}

# WebScout aday veritabani: yalnizca ilk kurulumda tohumlanir, mevcut veri korunur
$WsTohum = Join-Path $WwwKlasoru 'tools\webscout\seed'
if (Test-Path "$WsTohum\webscout.db") {
  $WsVeri = Join-Path $WwwKlasoru 'tools\webscout\data'
  if (-not (Test-Path "$WsVeri\webscout.db")) {
    New-Item -ItemType Directory -Path $WsVeri -Force | Out-Null
    # Copy (Move degil): dosya hedef klasorun izinlerini devralsin, uygulama havuzu yazabilsin
    Copy-Item "$WsTohum\webscout.db" "$WsVeri\webscout.db"
    Write-Host "  [OK] WebScout aday veritabani ilk kez kuruldu." -ForegroundColor Green
  } else {
    Write-Host "  [OK] WebScout aday veritabani korundu (sunucudaki veri gecerli)." -ForegroundColor Green
  }
  Remove-Item $WsTohum -Recurse -Force
}

# Bagimliliklar kontrol
if (-not (Test-Path "$WwwKlasoru\node_modules\next")) {
  Push-Location $WwwKlasoru
  Write-Host "2. Bagimliliklar kuruluyor (npm install)..." -ForegroundColor Yellow
  npm install --omit=dev
  Pop-Location
} else {
  Write-Host "2. Bagimliliklar hazir (node_modules mevcut)." -ForegroundColor Green
}

# IIS Havuzunu yeniden baslat
Write-Host "3. IIS Uygulama Havuzu yenileniyor..." -ForegroundColor Yellow
try {
  # Yalnizca bu sitenin uygulamasi yenilenir (iisnode watchedFiles=web.config).
  # "Stop-Process -Name node" KULLANILMAZ: ayni sunucudaki diger siteleri de durdurur.
  (Get-Item "$WwwKlasoru\web.config").LastWriteTime = Get-Date
  Write-Host "  [OK] web.config guncellendi, uygulama yenilendi." -ForegroundColor Green
} catch {
  Write-Host "  [BILGI] Havuz IIS uzerinden veya web.config touch ile yenilenebilir." -ForegroundColor Gray
}

Write-Host "`n=== [TEBRİKLER] YSNSOFT CANLIDA AKTİF! ===" -ForegroundColor Green
Write-Host "Adres: https://ysnsoft.com" -ForegroundColor Cyan
'@
$sunucuBetiği | Out-File -FilePath '_deploy\SUNUCUDA-UYGULA.ps1' -Encoding utf8

Write-Host "`n=== [4/4] Zip Paketi Oluşturuluyor (_deploy\ysnsoft-next.zip) ===" -ForegroundColor Cyan
Compress-Archive -Path '_deploy\www\*' -DestinationPath '_deploy\ysnsoft-next.zip' -Force
$zipBoyut = [math]::Round((Get-Item '_deploy\ysnsoft-next.zip').Length / 1MB, 2)
Write-Host "  [OK] Paket hazırlandı: _deploy\ysnsoft-next.zip ($zipBoyut MB)" -ForegroundColor Green

Write-Host "`n=================================================================" -ForegroundColor Green
Write-Host " YSNSOFT DEPLOY PAKETİ HAZIR!" -ForegroundColor Green
Write-Host " Sunucuya kopyalanacak dosyalar:" -ForegroundColor White
Write-Host "   1. _deploy\ysnsoft-next.zip ($zipBoyut MB)" -ForegroundColor Cyan
Write-Host "   2. _deploy\SUNUCUDA-UYGULA.ps1" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Green
