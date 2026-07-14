# Create a mobile-friendly hero video (~1MB, 720p, short loop) if ffmpeg is available.
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$src = Join-Path $root "assets\videos\ocean-hero.mp4"
$out = Join-Path $root "assets\videos\ocean-hero-mobile.mp4"

if (-not (Test-Path $src)) {
  Write-Host "No ocean-hero.mp4 — skip"
  exit 0
}

$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
  Write-Host "ffmpeg not found — skip video compress"
  exit 0
}

Write-Host "Compressing hero video for mobile..."
# 720p, ~1.2 Mbps, 6s max clip for mobile loop, faststart for streaming
& ffmpeg -y -i $src -t 8 -vf "scale='min(1280,iw)':-2" -c:v libx264 -profile:v main -level 3.1 `
  -pix_fmt yuv420p -b:v 900k -maxrate 1100k -bufsize 2200k -an -movflags +faststart $out 2>&1 |
  Select-Object -Last 20

if (Test-Path $out) {
  $kb = [math]::Round((Get-Item $out).Length / 1KB)
  $srcKb = [math]::Round((Get-Item $src).Length / 1KB)
  Write-Host "Created ocean-hero-mobile.mp4: ${kb}KB (from ${srcKb}KB)"
}
