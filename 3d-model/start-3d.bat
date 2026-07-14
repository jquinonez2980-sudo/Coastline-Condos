@echo off
rem Serve the repo root so the model can load /js/inventory.js (unit data)
cd /d "%~dp0.."
echo.
echo  Coastline Condos - 3D model preview
echo  Opening http://localhost:8091/3d-model/
echo  Press Ctrl+C to stop the server.
echo.
start "" "http://localhost:8091/3d-model/"
python -m http.server 8091
if errorlevel 1 (
  echo Python not found. Trying Node...
  npx --yes serve -l 8091 .
)
pause
