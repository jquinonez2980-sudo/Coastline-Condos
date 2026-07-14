@echo off
cd /d "%~dp0"
echo.
echo  Coastline Condos - local preview
echo  Opening http://localhost:8080
echo  Press Ctrl+C to stop the server.
echo.
start "" "http://localhost:8080"
python -m http.server 8080
if errorlevel 1 (
  echo Python not found. Trying Node...
  npx --yes serve -l 8080 .
)
pause
