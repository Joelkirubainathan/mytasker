@echo off
echo ========================================
echo   MyTasker - Setup Script
echo ========================================
echo.

if not exist server\.env (
  echo [Info] Creating server\.env from .env.example...
  copy server\.env.example server\.env >nul
)

echo [1/3] Installing root dependencies...
call npm install
echo.
echo [2/3] Installing server dependencies...
cd server
call npm install
echo.
echo [Optional] Seeding sample data...
call npm run db:seed
cd ..
echo.
echo [3/3] Installing client dependencies...
cd client
call npm install
cd ..
echo.
echo ========================================
echo   Setup complete! 
echo.
echo   To launch the app:
echo     npm run dev
echo.
echo   Demo Login:
echo     Email:    demo@mytasker.app
echo     Password: Password123!
echo ========================================
