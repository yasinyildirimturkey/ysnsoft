# YSNSOFT Otomatik SEO & GEO ve Sistem Sağlık Denetimi
# Bu betik Windows Task Scheduler ile düzenli aralıklarla çalıştırılabilir:
# powershell -ExecutionPolicy Bypass -File scripts\RUN-SCHEDULED-AUDIT.ps1

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " YSNSOFT PERİYODİK SAĞLIK & SEO-GEO DENETİMİ BAŞLATILIYOR" -ForegroundColor Cyan
Write-Host " Zaman: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Node CLI denetim betiğini çalıştır
node scripts\generate-seo-geo.js

# 2. Rapor dosyasının oluşturulduğunu doğrula
$ReportPath = Join-Path $ProjectRoot "data\seo-reports\latest-audit.json"
if (Test-Path $ReportPath) {
    $Report = Get-Content $ReportPath -Raw | ConvertFrom-Json
    Write-Host "`n[RAPOR BULUNDU] Ortalama Skor: $($Report.averageScore) / 100" -ForegroundColor Green
    Write-Host "Toplam Denetlenen Site: $($Report.totalSites)" -ForegroundColor White
    
    # 3. Hata veya düşük skor kontrolü
    $CriticalSites = $Report.sites | Where-Object { [int]($_.score -replace '/100','') -lt 60 }
    if ($CriticalSites) {
        Write-Host "`n[UYARI] Aşağıdaki sitelerin sağlık skoru 60'ın altındadır:" -ForegroundColor Red
        foreach ($site in $CriticalSites) {
            Write-Host "  - $($site.domain): $($site.score) (SSL: $($site.ssl))" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[MÜKEMMEL] Tüm siteler yüksek erişilebilirlik ve SEO-GEO standartlarında!" -ForegroundColor Green
    }
} else {
    Write-Host "[HATA] Rapor üretilemedi." -ForegroundColor Red
}

Write-Host "`n[BİTTİ] Denetim döngüsü tamamlandı.`n" -ForegroundColor Cyan
