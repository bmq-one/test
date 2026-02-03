# E-Mail Agent

Ein intelligenter E-Mail-Assistent, der deine E-Mails liest und auf Basis deines Wissens automatisch Antworten formuliert.

## Features

- **Automatisches E-Mail-Lesen** via IMAP (Gmail, Outlook, etc.)
- **Wissensbasis** mit semantischer Suche (ChromaDB)
- **KI-gestützte Antworten** mit Claude API
- **Täglicher Scheduler** für automatische Verarbeitung
- **Entwurf-Modus** - Antworten werden als Entwürfe gespeichert
- **Konfidenz-basiert** - Automatisches Senden nur bei hoher Sicherheit

## Installation

### 1. Python-Umgebung einrichten

```bash
cd email_agent
python -m venv venv
source venv/bin/activate  # Linux/Mac
# oder: venv\Scripts\activate  # Windows

pip install -r requirements.txt
```

### 2. Konfiguration erstellen

```bash
cp config.yaml.example config.yaml
```

Bearbeite `config.yaml` mit deinen Einstellungen:

```yaml
email:
  imap_server: "imap.gmail.com"
  email_address: "deine.email@gmail.com"
  password: "dein-app-passwort"  # App-Passwort, nicht normales Passwort!

anthropic:
  api_key: "sk-ant-xxxxx"  # Von https://console.anthropic.com/
```

### 3. Gmail App-Passwort erstellen (für Gmail-Nutzer)

1. Gehe zu https://myaccount.google.com/security
2. Aktiviere 2-Faktor-Authentifizierung (falls noch nicht aktiv)
3. Gehe zu "App-Passwörter"
4. Erstelle ein neues App-Passwort für "Mail"
5. Kopiere das generierte Passwort in die `config.yaml`

## Verwendung

### Einmalige Ausführung

```bash
python main.py run
```

Mit `--dry-run` werden keine E-Mails gesendet:

```bash
python main.py run --dry-run
```

### Scheduler starten (läuft kontinuierlich)

```bash
python main.py schedule
```

Der Scheduler führt den Agenten aus:
- Beim Start
- Täglich zur konfigurierten Zeit (Standard: 08:00)
- Alle 4 Stunden

### Wissensbasis verwalten

```bash
# Dokumente indizieren
python main.py index

# Neu-Indizierung erzwingen
python main.py index --force

# Statistiken anzeigen
python main.py stats

# Suche testen
python main.py search "deine suchanfrage"

# Wissen interaktiv hinzufügen
python main.py add-knowledge
```

### Historie anzeigen

```bash
python main.py history
python main.py history --limit 20
```

## Wissensbasis befüllen

Lege deine Dokumente im `knowledge/` Verzeichnis ab:

```
knowledge/
├── faq.md
├── produkte.md
├── kontakte.yaml
├── prozesse.txt
└── ...
```

### Unterstützte Formate

- Markdown (`.md`)
- Text (`.txt`)
- YAML (`.yaml`, `.yml`)
- JSON (`.json`)
- reStructuredText (`.rst`)

### Beispiel-Wissensdokument

```markdown
# Häufig gestellte Fragen

## Lieferzeiten
Unsere Standard-Lieferzeit beträgt 3-5 Werktage.
Express-Lieferung (1-2 Tage) ist gegen Aufpreis möglich.

## Rückgabe
Artikel können innerhalb von 30 Tagen zurückgegeben werden.
Der Artikel muss unbenutzt und in Originalverpackung sein.

## Kontakt
Bei Fragen erreichen Sie uns unter:
- E-Mail: support@example.com
- Telefon: 0800-123456
```

## Konfiguration

### E-Mail-Einstellungen

| Option | Beschreibung | Standard |
|--------|--------------|----------|
| `imap_server` | IMAP-Server | - |
| `imap_port` | IMAP-Port | 993 |
| `smtp_server` | SMTP-Server | - |
| `smtp_port` | SMTP-Port | 587 |
| `email_address` | Deine E-Mail-Adresse | - |
| `password` | App-Passwort | - |
| `inbox_folder` | Posteingang-Ordner | INBOX |
| `max_emails_per_run` | Max. E-Mails pro Durchlauf | 20 |

### Agent-Einstellungen

| Option | Beschreibung | Standard |
|--------|--------------|----------|
| `name` | Name des Agenten | E-Mail-Assistent |
| `user_name` | Dein Name | - |
| `language` | Antwort-Sprache | de |
| `auto_send` | Auto-Senden aktivieren | false |
| `ignore_addresses` | Ignorierte Absender | [] |
| `ignore_subjects` | Ignorierte Betreffs (Regex) | [] |

### Scheduler-Einstellungen

| Option | Beschreibung | Standard |
|--------|--------------|----------|
| `run_time` | Tägliche Ausführungszeit | 08:00 |
| `timezone` | Zeitzone | Europe/Berlin |

## Sicherheit

- **Niemals** dein normales E-Mail-Passwort verwenden!
- Immer **App-Passwörter** nutzen
- `config.yaml` niemals committen (füge zu `.gitignore` hinzu)
- Nutze Umgebungsvariablen für sensible Daten:

```bash
export EMAIL_PASSWORD="dein-app-passwort"
export ANTHROPIC_API_KEY="sk-ant-xxxxx"
```

## Architektur

```
email_agent/
├── main.py              # CLI-Einstiegspunkt
├── config.yaml          # Konfiguration
├── requirements.txt     # Python-Abhängigkeiten
├── src/
│   ├── __init__.py
│   ├── config.py        # Konfigurationsmanagement
│   ├── email_client.py  # IMAP/SMTP Client
│   ├── knowledge_base.py # ChromaDB Wissensbasis
│   ├── response_generator.py # Claude API Integration
│   ├── agent.py         # Haupt-Agent
│   └── scheduler.py     # Scheduler
├── knowledge/           # Deine Wissensdokumente
├── chroma_db/           # Vektordatenbank (automatisch)
└── logs/                # Log-Dateien
```

## Troubleshooting

### "Konfigurationsdatei nicht gefunden"

Kopiere `config.yaml.example` nach `config.yaml`:

```bash
cp config.yaml.example config.yaml
```

### "Login fehlgeschlagen"

- Prüfe IMAP-Server und Port
- Nutze ein App-Passwort, nicht dein normales Passwort
- Bei Gmail: Stelle sicher, dass 2FA aktiviert ist

### "Keine Antwort generiert"

- Prüfe deinen Anthropic API Key
- Stelle sicher, dass die Wissensbasis indiziert ist: `python main.py index`

### "Keine relevanten Informationen gefunden"

- Füge mehr Dokumente zur Wissensbasis hinzu
- Strukturiere dein Wissen besser mit Überschriften

## Lizenz

MIT License
