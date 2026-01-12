#!/bin/bash

echo "🔒 Whistleblowing Case Checker - Schnellstart"
echo "============================================="
echo ""

# Prüfe ob Docker läuft
if ! docker info > /dev/null 2>&1; then
    echo "❌ Fehler: Docker läuft nicht. Bitte starten Sie Docker."
    exit 1
fi

# Prüfe ob .env existiert
if [ ! -f .env ]; then
    echo "⚠️  Keine .env Datei gefunden."
    echo "📝 Erstelle .env aus .env.example..."
    cp .env.example .env
    echo ""
    echo "⚠️  WICHTIG: Bitte tragen Sie Ihren ANTHROPIC_API_KEY in die .env Datei ein!"
    echo "   Öffnen Sie .env und ersetzen Sie den Platzhalter."
    echo ""
    read -p "Drücken Sie Enter, wenn Sie den API-Key eingetragen haben..."
fi

# Prüfe ob API-Key gesetzt ist
source .env
if [ -z "$ANTHROPIC_API_KEY" ] || [ "$ANTHROPIC_API_KEY" = "sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" ]; then
    echo "❌ Fehler: ANTHROPIC_API_KEY ist nicht konfiguriert."
    echo "   Bitte tragen Sie einen gültigen API-Key in die .env Datei ein."
    echo "   Registrieren Sie sich unter: https://console.anthropic.com/"
    exit 1
fi

echo "✓ Docker läuft"
echo "✓ .env Datei gefunden"
echo "✓ API-Key konfiguriert"
echo ""

# Stoppe alte Container
echo "🛑 Stoppe alte Container..."
docker-compose down 2>/dev/null

# Baue und starte
echo "🏗️  Baue Container..."
docker-compose build

echo "🚀 Starte Anwendung..."
docker-compose up -d

echo ""
echo "✅ Anwendung wurde gestartet!"
echo ""
echo "📍 Zugriff:"
echo "   Frontend: http://localhost"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "📊 Logs anzeigen:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Anwendung stoppen:"
echo "   docker-compose down"
echo ""
