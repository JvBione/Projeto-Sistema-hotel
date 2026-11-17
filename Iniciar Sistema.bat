@echo off
title Hotel das Oliveiras - Launcher
cd /d "%~dp0"

if exist "Hotel das Oliveiras.exe" (
    start "" "Hotel das Oliveiras.exe"
    exit
) else (
    echo O executavel do sistema nao foi encontrado.
    echo Restaure "Hotel das Oliveiras.exe" para iniciar o servidor local com autenticacao.
    pause
)
