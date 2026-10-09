@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo   BayFlow - local runner
echo ============================================
echo.

REM --- 1. Dependencies ---
if not exist "node_modules\" (
  echo [1/4] Installing dependencies with pnpm...
  call pnpm install
  if errorlevel 1 (
    echo.
    echo [X] pnpm install failed. Is pnpm installed?  npm i -g pnpm
    pause
    exit /b 1
  )
) else (
  echo [1/4] Dependencies present - skipping install.
)
echo.

REM --- 2. Environment ---
if not exist ".env" (
  echo [2/4] .env not found - creating from .env.example...
  copy ".env.example" ".env" >nul
  echo.
  echo [!] ACTION NEEDED: open .env and set:
  echo       DATABASE_URL, DIRECT_URL  ^(from your Neon database^)
  echo       AUTH_SECRET               ^(run:  npx auth secret^)
  echo     Then run this script again.
  echo.
  pause
  exit /b 1
) else (
  echo [2/4] .env found.
)
echo.

REM --- 3. Prisma client ---
echo [3/4] Generating Prisma client...
call pnpm db:generate
if errorlevel 1 (
  echo [X] Prisma generate failed.
  pause
  exit /b 1
)
echo.

REM --- Optional one-time DB setup ---
set "DBSETUP="
set /p DBSETUP="Run database migrate + seed now? (needed on first run) [y/N]: "
if /i "!DBSETUP!"=="y" (
  echo Running migrations...
  call pnpm db:migrate
  if errorlevel 1 ( echo [X] Migrate failed. & pause & exit /b 1 )
  echo Seeding demo data...
  call pnpm db:seed
  if errorlevel 1 ( echo [X] Seed failed. & pause & exit /b 1 )
)
echo.

REM --- 4. Dev server ---
echo [4/4] Starting dev server at http://localhost:3000
echo        (press Ctrl+C to stop)
echo.
call pnpm dev
