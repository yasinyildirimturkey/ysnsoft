@echo off
REM YSNSOFT haftalik yapay zeka gorunurluk olcumu (Windows Gorev Zamanlayici: "YSNSOFT AI Gorunurluk", Pazartesi 12:30)
REM 5 saglayici (OpenAI, Gemini, Perplexity, Grok, Claude); anahtarlar .env (git disi). 3 dil x 9 soru.
REM Rapor: raporlar\<tarih>-ysnsoft[-en|-de].md, gecmis-ysnsoft[-en|-de].csv
REM izle.mjs, D:\hukuk\kglex\pazarlama\ai-gorunurluk kopyasidir (28.11.2026); sorular: sorular-ysnsoft[-en|-de].json
cd /d "%~dp0"
if not exist raporlar mkdir raporlar
node izle.mjs --proje=ysnsoft >> raporlar\son-calisma.log 2>&1
node izle.mjs --proje=ysnsoft --dil=en >> raporlar\son-calisma.log 2>&1
node izle.mjs --proje=ysnsoft --dil=de >> raporlar\son-calisma.log 2>&1
