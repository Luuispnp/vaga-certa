@echo off
chcp 65001 > nul
echo.
echo  ╔══════════════════════════════════════╗
echo  ║      VAGA CERTA — Iniciar Sistema    ║
echo  ╚══════════════════════════════════════╝
echo.

cd /d "%~dp0backend"

:: Instala dependências se node_modules não existir
if not exist "node_modules\" (
    echo  [1/2] Instalando dependencias ^(primeira vez pode demorar^)...
    call npm install
    if errorlevel 1 (
        echo.
        echo  ERRO: falha ao instalar dependencias.
        echo  Verifique se o Node.js esta instalado: https://nodejs.org
        pause
        exit /b 1
    )
)

echo  [2/2] Iniciando servidor...
echo.
echo  Acesse o sistema em: http://localhost:3000
echo  Pressione Ctrl+C para parar o servidor.
echo.

node --no-warnings server.js
pause
