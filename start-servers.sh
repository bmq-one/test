#!/bin/bash

# AI Newsletter Tool Starter Script
# Einfach dieses Script ausführen um beide Server zu starten

echo "🚀 Starte AI Newsletter Tool..."
echo ""

# Gehe zum Backend Verzeichnis
cd /home/user/test/backend

echo "📦 Starte Backend Server (Port 3001)..."
npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend läuft mit PID: $BACKEND_PID"

# Warte kurz
sleep 3

# Gehe zum Frontend Verzeichnis
cd /home/user/test/frontend

echo "🎨 Starte Frontend Server (Port 3000)..."
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend läuft mit PID: $FRONTEND_PID"

echo ""
echo "⏳ Warte 10 Sekunden auf Server-Start..."
sleep 10

echo ""
echo "✅ Server sollten jetzt laufen!"
echo ""
echo "📱 Öffne deinen Browser und gehe zu:"
echo "   http://localhost:3000"
echo ""
echo "💡 Logs ansehen:"
echo "   Backend:  tail -f /tmp/backend.log"
echo "   Frontend: tail -f /tmp/frontend.log"
echo ""
echo "🛑 Server stoppen:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "   Oder alle Node-Prozesse stoppen: pkill -f node"
echo ""

# Speichere PIDs für später
echo $BACKEND_PID > /tmp/backend.pid
echo $FRONTEND_PID > /tmp/frontend.pid

echo "Process IDs gespeichert in /tmp/backend.pid und /tmp/frontend.pid"
