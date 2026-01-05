# 🤖 AI Newsletter Tool

Ein vollautomatisches, KI-gestütztes Newsletter-System, das relevante Artikel über künstliche Intelligenz sammelt, verarbeitet und daraus personalisierte Newsletter erstellt.

## ✨ Features

### 🎯 Kernfunktionalität
- **Automatische Aggregation**: Sammelt Artikel aus RSS-Feeds, Websites und APIs
- **KI-Verarbeitung**: Nutzt OpenAI GPT-4 für intelligente Zusammenfassungen und Newsletter-Generierung
- **Personalisierung**: Anpassbarer Schreibstil und Tonalität
- **Automatisierung**: Cron-basierte Jobs für regelmäßige Updates
- **Moderne Web-UI**: Next.js Frontend mit Tailwind CSS
- **RESTful API**: Express.js Backend mit PostgreSQL Datenbank

### 📰 Newsletter-Features
- Intelligente Artikel-Auswahl basierend auf Relevanz-Scores
- Automatische Zusammenfassungen jedes Artikels
- Gruppierung und logische Strukturierung der Inhalte
- Markdown und HTML-Output
- Archivierung aller Newsletter

### 🔧 Admin-Funktionen
- Quellen-Management (RSS, Websites, APIs)
- Manuelle Newsletter-Generierung
- Statistik-Dashboard
- Artikel-Verwaltung

## 🏗️ Architektur

```
ai-newsletter-tool/
├── backend/              # Express.js Backend
│   ├── src/
│   │   ├── config/      # Datenbank-Konfiguration
│   │   ├── routes/      # API Endpoints
│   │   ├── services/    # Business Logic
│   │   │   ├── ai.service.js        # OpenAI Integration
│   │   │   ├── scraper.service.js   # Content Aggregation
│   │   │   ├── newsletter.service.js # Newsletter Logic
│   │   │   └── cron.service.js      # Automatisierung
│   │   └── utils/       # Utilities & Logger
│   ├── prisma/          # Datenbankschema
│   └── package.json
│
├── frontend/            # Next.js Frontend
│   ├── src/
│   │   ├── app/         # Next.js App Router Pages
│   │   ├── components/  # React Komponenten
│   │   └── lib/         # API Client & Utils
│   └── package.json
│
└── README.md
```

## 🚀 Installation & Setup

### Voraussetzungen

- **Node.js**: Version 18+
- **PostgreSQL**: Version 14+
- **OpenAI API Key**: Von [platform.openai.com](https://platform.openai.com)

### 1. Repository klonen

```bash
git clone <repository-url>
cd ai-newsletter-tool
```

### 2. Backend Setup

```bash
cd backend

# Dependencies installieren
npm install

# Umgebungsvariablen konfigurieren
cp .env.example .env

# .env Datei bearbeiten und folgende Werte setzen:
# - DATABASE_URL: PostgreSQL Connection String
# - OPENAI_API_KEY: Dein OpenAI API Key
# - PORT: 3001 (oder anderer Port)
```

**Beispiel .env:**
```env
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/ai_newsletter?schema=public"
OPENAI_API_KEY=sk-...
NEWSLETTER_FREQUENCY=daily
MAX_ARTICLES_PER_NEWSLETTER=10
```

```bash
# Datenbank Migrations ausführen
npm run prisma:migrate

# Prisma Client generieren
npm run prisma:generate

# Backend starten
npm run dev
```

Backend läuft nun auf `http://localhost:3001`

### 3. Frontend Setup

```bash
cd ../frontend

# Dependencies installieren
npm install

# Umgebungsvariablen konfigurieren
cp .env.local.example .env.local

# .env.local bearbeiten:
# NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

```bash
# Frontend starten
npm run dev
```

Frontend läuft nun auf `http://localhost:3000`

## 📖 Verwendung

### 1. Quellen hinzufügen

1. Navigiere zu `http://localhost:3000/admin/sources`
2. Klicke auf "Neue Quelle"
3. Füge RSS-Feeds, Websites oder API-Endpunkte hinzu

**Beispiel-Quellen:**
- OpenAI Blog: `https://openai.com/blog/rss.xml` (RSS)
- Anthropic News: `https://www.anthropic.com/news` (RSS)
- AI News: Weitere KI-News Feeds

### 2. Artikel abrufen

**Automatisch (via Cron):**
- Artikel werden alle 6 Stunden automatisch abgerufen
- Konfigurierbar in `backend/src/services/cron.service.js`

**Manuell:**
- Im Admin Dashboard auf "Artikel abrufen" klicken
- Oder via API: `POST http://localhost:3001/api/sources/fetch-all`

### 3. Newsletter generieren

**Automatisch (via Cron):**
- Newsletter werden basierend auf `NEWSLETTER_FREQUENCY` generiert
- Standard: Täglich um 8:00 Uhr
- Optionen: `hourly`, `daily`, `weekly`, `biweekly`

**Manuell:**
- Im Admin Dashboard auf "Newsletter generieren" klicken
- Oder via API: `POST http://localhost:3001/api/newsletters/generate`

### 4. Newsletter ansehen

- Homepage: Zeigt neuesten Newsletter
- `/newsletters`: Alle veröffentlichten Newsletter
- `/newsletters/[id]`: Einzelner Newsletter mit Quellen

## 🎨 Stil-Anpassung

Der Newsletter-Stil kann über die Datenbank-Konfiguration angepasst werden:

```sql
INSERT INTO "Config" (id, key, value, description) VALUES
  ('1', 'ai_tone', 'professional but accessible', 'Tonalität des Newsletters'),
  ('2', 'ai_target_audience', 'AI enthusiasts and developers', 'Zielgruppe'),
  ('3', 'ai_writing_style', 'clear, engaging, informative', 'Schreibstil'),
  ('4', 'ai_length_preference', 'concise but comprehensive', 'Längen-Präferenz');
```

Diese Werte werden von der AI bei der Newsletter-Generierung berücksichtigt.

## 🔧 API Dokumentation

### Newsletter Endpoints

- `GET /api/newsletters` - Alle Newsletter (mit Pagination)
- `GET /api/newsletters/latest` - Neuester Newsletter
- `GET /api/newsletters/:id` - Newsletter nach ID
- `POST /api/newsletters/generate` - Newsletter generieren
- `PATCH /api/newsletters/:id/publish` - Newsletter veröffentlichen
- `DELETE /api/newsletters/:id` - Newsletter löschen

### Sources Endpoints

- `GET /api/sources` - Alle Quellen
- `POST /api/sources` - Neue Quelle erstellen
- `PATCH /api/sources/:id` - Quelle aktualisieren
- `DELETE /api/sources/:id` - Quelle löschen
- `POST /api/sources/fetch-all` - Alle Quellen abrufen

### Articles Endpoints

- `GET /api/articles` - Alle Artikel (mit Filtering)
- `GET /api/articles/stats/overview` - Artikel-Statistiken
- `PATCH /api/articles/:id` - Artikel aktualisieren

## 🗄️ Datenbank-Schema

**Haupttabellen:**
- `Source`: Newsletter-Quellen (RSS, Websites, APIs)
- `Article`: Gesammelte Artikel
- `Newsletter`: Generierte Newsletter
- `NewsletterArticle`: Verknüpfung Newsletter ↔ Artikel
- `Config`: Konfigurations-Einstellungen

Siehe `backend/prisma/schema.prisma` für vollständiges Schema.

## 🛠️ Entwicklung

### Backend Development

```bash
cd backend

# Development Server mit Auto-Reload
npm run dev

# Prisma Studio (Datenbank GUI)
npm run prisma:studio

# Logs anzeigen
tail -f logs/combined.log
```

### Frontend Development

```bash
cd frontend

# Development Server
npm run dev

# Produktions-Build
npm run build

# Produktions-Server
npm start
```

## 📦 Deployment

### Backend (Railway / Render / Heroku)

1. PostgreSQL Datenbank bereitstellen
2. Umgebungsvariablen setzen
3. Build-Befehl: `npm install && npm run prisma:generate && npm run prisma:migrate`
4. Start-Befehl: `npm start`

### Frontend (Vercel / Netlify)

1. Repository verbinden
2. Build-Befehl: `npm run build`
3. Output-Verzeichnis: `.next`
4. Umgebungsvariablen setzen (`NEXT_PUBLIC_API_URL`)

## 🔒 Sicherheit

- **API Keys**: Niemals committen, nur via .env
- **CORS**: Konfiguriert für Frontend-Domain
- **Input Validation**: Prisma verhindert SQL-Injection
- **Rate Limiting**: Empfohlen für Produktionsumgebung

## 🐛 Troubleshooting

**Problem: Database connection failed**
- Prüfe `DATABASE_URL` in `.env`
- Stelle sicher, dass PostgreSQL läuft
- Führe Migrations aus: `npm run prisma:migrate`

**Problem: OpenAI API Fehler**
- Prüfe `OPENAI_API_KEY`
- Stelle sicher, dass du Guthaben hast
- Rate Limits beachten

**Problem: Keine Artikel werden gefunden**
- Prüfe ob Quellen aktiv sind (`isActive: true`)
- Teste URLs manuell (RSS-Feeds im Browser öffnen)
- Prüfe Logs: `logs/combined.log`

**Problem: Frontend kann Backend nicht erreichen**
- Prüfe `NEXT_PUBLIC_API_URL` in `.env.local`
- Stelle sicher, dass Backend läuft
- CORS-Konfiguration prüfen

## 📝 Lizenz

MIT - Frei verwendbar für persönliche und kommerzielle Projekte.

## 🤝 Beitragen

Feedback und Verbesserungsvorschläge sind willkommen!

---

**Viel Erfolg mit deinem AI Newsletter! 🚀**
