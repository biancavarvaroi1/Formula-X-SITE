@echo off
cd /d "%~dp0"
echo Formula X - reparare lectie Ultima noapte
echo.
where py >nul 2>nul
if %errorlevel%==0 (
    py -3 REPARA-ULTIMA-NOAPTE.py
) else (
    python REPARA-ULTIMA-NOAPTE.py
)
echo.
pause
