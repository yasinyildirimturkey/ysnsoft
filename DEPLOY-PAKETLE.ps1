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

# Gerekli kök dosyaları ekle
Copy-Item package.json, package-lock.json, next.config.ts, start.js, web.config _deploy\www\
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

# Zip'i aç
Expand-Archive -Path $ZipDosyasi -DestinationPath $WwwKlasoru -Force
Write-Host "  [OK] Dosyalar açıldı." -ForegroundColor Green

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
  Stop-Process -Name node -Force -ErrorAction SilentlyContinue
  (Get-Item "$WwwKlasoru\web.config").LastWriteTime = Get-Date
  Write-Host "  [OK] IIS node yenilendi ve web.config guncellendi." -ForegroundColor Green
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
