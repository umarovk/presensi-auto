@echo off
cd /d "%~dp0"
node presensi.js >> run.log 2>&1
