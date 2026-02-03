"""
Scheduler für die automatische tägliche Ausführung des E-Mail-Agenten.
"""

import time
from datetime import datetime
from typing import Optional

import schedule
from rich.console import Console

from .agent import EmailAgent
from .config import Config

console = Console()


class AgentScheduler:
    """
    Scheduler für den E-Mail-Agenten.

    Führt den Agenten zu konfigurierten Zeiten automatisch aus.
    """

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialisiert den Scheduler.

        Args:
            config_path: Pfad zur Konfigurationsdatei
        """
        self.config = Config(config_path)
        self.agent = EmailAgent(config_path)
        self._running = False

    def _job(self) -> None:
        """Der geplante Job, der den Agenten ausführt."""
        console.print(f"\n[bold blue]{'='*60}[/bold blue]")
        console.print(f"[bold]Geplante Ausführung: {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}[/bold]")
        console.print(f"[bold blue]{'='*60}[/bold blue]\n")

        try:
            self.agent.run_once()
        except Exception as e:
            console.print(f"[red]Fehler bei der Ausführung: {e}[/red]")

    def start(self) -> None:
        """
        Startet den Scheduler.

        Der Scheduler läuft kontinuierlich und führt den Agenten
        zur konfigurierten Zeit aus.
        """
        scheduler_config = self.config.scheduler
        run_time = scheduler_config.get("run_time", "08:00")

        console.print("[bold green]E-Mail-Agent Scheduler gestartet[/bold green]")
        console.print(f"Geplante Ausführung: Täglich um {run_time}")
        console.print("Drücke Ctrl+C zum Beenden\n")

        # Job planen
        schedule.every().day.at(run_time).do(self._job)

        # Zusätzlich alle 4 Stunden ausführen für häufigere Checks
        schedule.every(4).hours.do(self._job)

        self._running = True

        # Initialen Durchlauf ausführen
        console.print("[yellow]Führe initialen Durchlauf aus...[/yellow]")
        self._job()

        # Scheduler-Loop
        while self._running:
            try:
                schedule.run_pending()
                time.sleep(60)  # Jede Minute prüfen
            except KeyboardInterrupt:
                console.print("\n[yellow]Scheduler wird beendet...[/yellow]")
                self._running = False
                break

    def stop(self) -> None:
        """Stoppt den Scheduler."""
        self._running = False
        console.print("[yellow]Scheduler gestoppt.[/yellow]")

    def run_now(self) -> None:
        """Führt den Agenten sofort aus (ohne Scheduling)."""
        self._job()


def run_scheduler(config_path: Optional[str] = None) -> None:
    """
    Startet den Scheduler.

    Args:
        config_path: Pfad zur Konfigurationsdatei
    """
    scheduler = AgentScheduler(config_path)
    scheduler.start()
