"""
Haupt-Agent, der alle Komponenten orchestriert.
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from rich.console import Console
from rich.logging import RichHandler
from rich.table import Table

from .config import Config
from .email_client import Email, EmailClient
from .knowledge_base import KnowledgeBase
from .response_generator import GeneratedResponse, ResponseGenerator

console = Console()


class EmailAgent:
    """
    Der E-Mail-Agent orchestriert das Lesen von E-Mails,
    die Suche in der Wissensbasis und die Antwortgenerierung.
    """

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialisiert den E-Mail-Agenten.

        Args:
            config_path: Pfad zur Konfigurationsdatei
        """
        self.config = Config(config_path)
        self._setup_logging()

        self.knowledge_base = KnowledgeBase(self.config)
        self.response_generator = ResponseGenerator(self.config, self.knowledge_base)
        self.email_client = EmailClient(self.config)

        # Verarbeitungs-Historie
        self._history_file = Path("./processing_history.json")
        self._history: dict = self._load_history()

    def _setup_logging(self) -> None:
        """Konfiguriert das Logging."""
        log_config = self.config.logging
        log_level = log_config.get("level", "INFO")
        log_file = log_config.get("file")

        # Rich Handler für Konsole
        logging.basicConfig(
            level=log_level,
            format="%(message)s",
            datefmt="[%X]",
            handlers=[RichHandler(rich_tracebacks=True)],
        )

        # Datei-Handler falls konfiguriert
        if log_file:
            log_path = Path(log_file)
            log_path.parent.mkdir(parents=True, exist_ok=True)

            file_handler = logging.FileHandler(log_path)
            file_handler.setLevel(log_level)
            file_handler.setFormatter(
                logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
            )
            logging.getLogger().addHandler(file_handler)

        self.logger = logging.getLogger(__name__)

    def _load_history(self) -> dict:
        """Lädt die Verarbeitungs-Historie."""
        if self._history_file.exists():
            try:
                with open(self._history_file, "r") as f:
                    return json.load(f)
            except Exception:
                pass
        return {"processed_emails": [], "responses": []}

    def _save_history(self) -> None:
        """Speichert die Verarbeitungs-Historie."""
        with open(self._history_file, "w") as f:
            json.dump(self._history, f, indent=2, default=str)

    def _was_processed(self, email: Email) -> bool:
        """Prüft ob eine E-Mail bereits verarbeitet wurde."""
        return email.message_id in self._history.get("processed_emails", [])

    def _mark_processed(
        self,
        email: Email,
        response: Optional[GeneratedResponse],
        sent: bool,
    ) -> None:
        """Markiert eine E-Mail als verarbeitet."""
        self._history["processed_emails"].append(email.message_id)

        self._history["responses"].append(
            {
                "email_id": email.message_id,
                "from": email.from_address,
                "subject": email.subject,
                "processed_at": datetime.now().isoformat(),
                "response_generated": response is not None,
                "response_sent": sent,
                "confidence": response.confidence if response else None,
            }
        )

        # Historie auf die letzten 1000 Einträge begrenzen
        self._history["processed_emails"] = self._history["processed_emails"][-1000:]
        self._history["responses"] = self._history["responses"][-1000:]

        self._save_history()

    def index_knowledge(self, force: bool = False) -> None:
        """
        Indiziert die Wissensbasis.

        Args:
            force: Wenn True, wird alles neu indiziert
        """
        console.print("[bold blue]Indiziere Wissensbasis...[/bold blue]")
        count = self.knowledge_base.index_documents(force_reindex=force)
        console.print(f"[green]Fertig! {count} Dokumente indiziert.[/green]")

    def show_knowledge_stats(self) -> None:
        """Zeigt Statistiken über die Wissensbasis."""
        stats = self.knowledge_base.get_stats()

        table = Table(title="Wissensbasis Statistiken")
        table.add_column("Eigenschaft", style="cyan")
        table.add_column("Wert", style="green")

        table.add_row("Dokumente", str(stats["total_documents"]))
        table.add_row("Chunks", str(stats["total_chunks"]))
        table.add_row("Verzeichnis", stats["documents_path"])

        console.print(table)

        if stats["sources"]:
            console.print("\n[bold]Indizierte Dokumente:[/bold]")
            for source in stats["sources"]:
                console.print(f"  - {source}")

    def process_emails(self, dry_run: bool = False) -> int:
        """
        Verarbeitet alle neuen E-Mails.

        Args:
            dry_run: Wenn True, werden keine Antworten gesendet

        Returns:
            Anzahl der verarbeiteten E-Mails
        """
        console.print("\n[bold blue]Starte E-Mail-Verarbeitung...[/bold blue]\n")

        processed_count = 0

        with self.email_client:
            for email in self.email_client.fetch_unread_emails():
                # Bereits verarbeitet?
                if self._was_processed(email):
                    console.print(f"[dim]Überspringe (bereits verarbeitet): {email.subject}[/dim]")
                    continue

                console.print(f"\n[bold cyan]Verarbeite: {email.subject}[/bold cyan]")
                console.print(f"Von: {email.from_name} <{email.from_address}>")

                # Antwort generieren
                response = self.response_generator.generate_response(email)

                if response is None:
                    console.print("[red]Konnte keine Antwort generieren[/red]")
                    self._mark_processed(email, None, False)
                    continue

                # Antwort zur Überprüfung anzeigen
                self.response_generator.review_response(email, response)

                sent = False

                if not dry_run:
                    # Entscheiden ob automatisch senden
                    auto_send = self.response_generator.should_auto_respond(response)
                    auto_send_config = self.config.agent.get("auto_send", False)

                    if auto_send and auto_send_config:
                        # Automatisch senden
                        sent = self.email_client.send_reply(
                            email, response.body, as_draft=False
                        )
                    else:
                        # Als Entwurf speichern
                        sent = self.email_client.send_reply(
                            email, response.body, as_draft=True
                        )

                self._mark_processed(email, response, sent)
                processed_count += 1

        console.print(f"\n[bold green]Fertig! {processed_count} E-Mails verarbeitet.[/bold green]")
        return processed_count

    def run_once(self, dry_run: bool = False) -> None:
        """
        Führt einen einzelnen Verarbeitungsdurchlauf durch.

        Args:
            dry_run: Wenn True, werden keine Antworten gesendet
        """
        console.print("[bold]E-Mail-Agent gestartet[/bold]")
        console.print(f"Zeitpunkt: {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}\n")

        # Wissensbasis aktualisieren
        self.index_knowledge()

        # E-Mails verarbeiten
        self.process_emails(dry_run=dry_run)

    def show_history(self, limit: int = 10) -> None:
        """
        Zeigt die Verarbeitungs-Historie.

        Args:
            limit: Anzahl der anzuzeigenden Einträge
        """
        responses = self._history.get("responses", [])

        if not responses:
            console.print("[yellow]Noch keine E-Mails verarbeitet.[/yellow]")
            return

        table = Table(title=f"Letzte {limit} verarbeitete E-Mails")
        table.add_column("Datum", style="cyan")
        table.add_column("Von", style="green")
        table.add_column("Betreff", style="white")
        table.add_column("Konfidenz", style="yellow")
        table.add_column("Gesendet", style="magenta")

        for entry in responses[-limit:][::-1]:
            date = entry.get("processed_at", "")[:16].replace("T", " ")
            conf = entry.get("confidence")
            conf_str = f"{conf:.0%}" if conf else "-"
            sent = "Ja" if entry.get("response_sent") else "Nein"

            table.add_row(
                date,
                entry.get("from", "")[:30],
                entry.get("subject", "")[:40],
                conf_str,
                sent,
            )

        console.print(table)
