@echo off
chcp 65001 >nul
title FlapyCopa - servidor local
cd /d "%~dp0"
if "%PORT%"=="" set PORT=8090
echo.
echo  ==========================================
echo    FlapyCopa - servidor local (estatico)
echo  ==========================================
echo.
echo  Abra no navegador:  http://localhost:%PORT%/flapycopa/
echo  (o base path vem de tools\base.js - a mesma estrutura do GitHub Pages)
echo.
echo  Para publicar NA RAIZ (Netlify/Cloudflare) rode antes:
echo      node tools\rebase.js --base=
echo  Para voltar ao base do GitHub Pages:
echo      node tools\rebase.js
echo.
node tools\server.js
pause
