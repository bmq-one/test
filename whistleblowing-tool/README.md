# 🔒 Whistleblowing Case Checker

Ein KI-gestütztes anonymes Whistleblowing-Tool nach den Anforderungen des deutschen Geldwäschegesetzes (GwG).

## 🎯 Funktionen

- **Anonyme Meldungen**: Vollständig anonyme Einreichung von Hinweisen
- **KI-gestützte Analyse**: Automatische Prüfung und Bewertung durch Claude AI
- **Intelligente Rückfragen**: Das System stellt bei Bedarf Fragen, um den Sachverhalt vollständig zu erfassen
- **Risikokategorisierung**: Automatische Einteilung in drei Kategorien:
  - 🟢 **GRÜN**: Unproblematisch, kann sofort geschlossen werden
  - 🟡 **GELB**: Prüfung durch Compliance erforderlich
  - 🔴 **ROT**: Hohes juristisches Risiko, sofortige Aufmerksamkeit nötig
- **Compliance-Dashboard**: Übersichtliche Verwaltung aller Fälle
- **Sichere Kommunikation**: Token-basierte Kommunikation zwischen Whistleblower und Compliance

## 🏗️ Technologie-Stack

- **Backend**: Python, FastAPI, SQLAlchemy
- **Frontend**: React, TypeScript, Vite
- **KI**: Claude 3.5 Sonnet (Anthropic)
- **Datenbank**: SQLite (kann zu PostgreSQL erweitert werden)
- **Deployment**: Docker, Docker Compose

## 📋 Voraussetzungen

1. **Docker & Docker Compose** installiert
2. **Anthropic API Key** (Claude AI)
   - Registrieren Sie sich unter: https://console.anthropic.com/
   - Erstellen Sie einen API-Key
   - Kostenlose Credits verfügbar, danach Pay-as-you-go

## 🚀 Installation & Start

### 1. Repository klonen oder Code herunterladen

```bash
cd whistleblowing-tool
```

### 2. Umgebungsvariablen konfigurieren

Erstellen Sie eine `.env` Datei im Hauptverzeichnis:

```bash
cp .env.example .env
```

Öffnen Sie `.env` und tragen Sie Ihren Anthropic API-Key ein:

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Anwendung starten

```bash
docker-compose up -d
```

Das System wird jetzt gestartet:
- Backend läuft auf: `http://localhost:8000`
- Frontend läuft auf: `http://localhost` (Port 80)

### 4. Anwendung öffnen

Öffnen Sie Ihren Browser und gehen Sie zu:

```
http://localhost
```

## 📱 Nutzung

### Für Whistleblower

1. Klicken Sie auf **"Anonyme Meldung"**
2. Beschreiben Sie den Sachverhalt so detailliert wie möglich
3. Sie erhalten einen **Token** - speichern Sie diesen sicher!
4. Das KI-System analysiert Ihre Meldung
5. Bei Bedarf stellt das System Rückfragen - beantworten Sie diese
6. Nach Abschluss der Analyse sehen Sie die Risikokategorie
7. Die Compliance-Abteilung kann bei Bedarf mit Ihnen kommunizieren

### Für Compliance-Abteilung

1. Klicken Sie auf **"Compliance-Dashboard"**
2. Sie sehen alle eingereichten Fälle mit Kategorisierung
3. Filtern Sie nach Risikokategorie (Rot/Gelb/Grün)
4. Klicken Sie auf einen Fall für Details
5. Sie sehen:
   - Die originale Meldung
   - Die KI-Bewertung mit rechtlicher Einschätzung
   - Den Kommunikationsverlauf
6. Sie können:
   - Mit dem Whistleblower kommunizieren
   - Den Fall schließen

## 🌍 Cloud-Deployment

### Option 1: Eigener Server (VPS)

1. **Server mieten** (z.B. bei Hetzner, DigitalOcean, AWS, etc.)
2. **Docker installieren** auf dem Server
3. **Code hochladen** via Git oder SCP:
   ```bash
   git clone [your-repo-url]
   cd whistleblowing-tool
   ```
4. **.env Datei erstellen** mit Ihrem API-Key
5. **Starten**:
   ```bash
   docker-compose up -d
   ```
6. **Domain konfigurieren** (optional):
   - DNS-A-Record auf Server-IP setzen
   - Nginx Reverse Proxy mit SSL (Let's Encrypt)

### Option 2: Cloud-Plattformen

#### **Heroku**
```bash
# Heroku CLI installieren
heroku create whistleblowing-tool
heroku config:set ANTHROPIC_API_KEY=sk-ant-xxxxx
git push heroku main
```

#### **Railway**
1. Account erstellen auf railway.app
2. "New Project" → "Deploy from GitHub"
3. Environment Variable `ANTHROPIC_API_KEY` setzen
4. Automatisches Deployment

#### **AWS (ECS/Fargate)**
1. ECR Repository erstellen
2. Docker Images bauen und pushen
3. ECS Service mit Task Definition erstellen
4. Environment Variables konfigurieren

### Option 3: Docker Hub

1. **Images bauen und hochladen**:
   ```bash
   docker build -t ihr-username/whistleblowing-backend ./backend
   docker build -t ihr-username/whistleblowing-frontend ./frontend
   docker push ihr-username/whistleblowing-backend
   docker push ihr-username/whistleblowing-frontend
   ```

2. **Auf Server deployen**:
   ```bash
   docker pull ihr-username/whistleblowing-backend
   docker pull ihr-username/whistleblowing-frontend
   docker-compose up -d
   ```

## 🔒 Sicherheitshinweise

- **API-Key geheim halten**: Niemals in Git committen!
- **HTTPS verwenden**: In Produktion immer SSL/TLS aktivieren
- **Firewall konfigurieren**: Nur notwendige Ports öffnen
- **Backups**: Regelmäßige Backups der Datenbank
- **Updates**: Regelmäßig Dependencies aktualisieren
- **Zugriffskontrolle**: Compliance-Dashboard sollte passwortgeschützt sein

## 📝 Rechtliche Hinweise

Dieses Tool unterstützt bei der Erfüllung der Anforderungen nach:
- § 6 Abs. 2 Nr. 4 GwG (Geldwäschegesetz)
- EU-Whistleblower-Richtlinie (2019/1937)
- Hinweisgeberschutzgesetz (HinSchG)

⚠️ **Wichtig**: Dieses Tool ersetzt keine rechtliche Beratung. Konsultieren Sie einen Rechtsanwalt für spezifische rechtliche Anforderungen.

## 🛠️ Entwicklung

### Backend entwickeln

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend entwickeln

```bash
cd frontend
npm install
npm run dev
```

## 📊 API-Dokumentation

Sobald das Backend läuft, ist die automatische API-Dokumentation verfügbar unter:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔧 Konfiguration

### Datenbank ändern (PostgreSQL)

Ändern Sie in `backend/database.py`:

```python
SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost/dbname"
```

Und in `docker-compose.yml` einen PostgreSQL Service hinzufügen.

### Port ändern

In `docker-compose.yml`:

```yaml
frontend:
  ports:
    - "8080:80"  # Statt Port 80
```

## 🐛 Troubleshooting

### "Port bereits belegt"

```bash
# Port 80 ist belegt
docker-compose down
sudo lsof -i :80  # Prozess finden
sudo kill -9 [PID]  # Prozess beenden
```

### "ANTHROPIC_API_KEY fehlt"

```bash
# .env Datei prüfen
cat .env

# Docker Compose neu starten
docker-compose down
docker-compose up -d
```

### "Frontend kann Backend nicht erreichen"

```bash
# Logs prüfen
docker-compose logs backend
docker-compose logs frontend

# Netzwerk prüfen
docker network inspect whistleblowing-tool_default
```

## 📞 Support

Bei Fragen oder Problemen:
1. Prüfen Sie die Logs: `docker-compose logs`
2. Prüfen Sie die API-Dokumentation: http://localhost:8000/docs
3. Erstellen Sie ein GitHub Issue

## 📜 Lizenz

Dieses Projekt ist für den internen Unternehmensgebrauch bestimmt. Bitte beachten Sie die Lizenzbestimmungen.

---

**Entwickelt mit ❤️ für Compliance und Transparenz**
