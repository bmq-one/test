#!/usr/bin/env python3
"""
E-Mail-Agent - Liest E-Mails und generiert intelligente Antworten.

Verwendung:
    python main.py run              - Einmalige Ausführung
    python main.py schedule         - Scheduler starten (läuft kontinuierlich)
    python main.py index            - Wissensbasis indizieren
    python main.py search "query"   - In Wissensbasis suchen
    python main.py stats            - Statistiken anzeigen
    python main.py history          - Verarbeitungs-Historie anzeigen
    python main.py add-knowledge    - Wissen hinzufügen (interaktiv)
"""

import argparse
import sys
from pathlib import Path

from rich.console import Console
from rich.panel import Panel

# Projektverzeichnis zum Pfad hinzufügen
sys.path.insert(0, str(Path(__file__).parent))

from src.agent import EmailAgent
from src.scheduler import AgentScheduler

console = Console()


def print_banner() -> None:
    """Zeigt das Banner an."""
    banner = """
    ███████╗███╗   ███╗ █████╗ ██╗██╗
    ██╔════╝████╗ ████║██╔══██╗██║██║
    █████╗  ██╔████╔██║███████║██║██║
    ██╔══╝  ██║╚██╔╝██║██╔══██║██║██║
    ███████╗██║ ╚═╝ ██║██║  ██║██║███████╗
    ╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝╚══════╝
     █████╗  ██████╗ ███████╗███╗   ██╗████████╗
    ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝
    ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║
    ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║
    ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║
    ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝
    """
    console.print(Panel(banner, title="E-Mail Agent v1.0", border_style="blue"))


def cmd_run(args: argparse.Namespace) -> None:
    """Führt den Agenten einmalig aus."""
    agent = EmailAgent(args.config)
    agent.run_once(dry_run=args.dry_run)


def cmd_schedule(args: argparse.Namespace) -> None:
    """Startet den Scheduler."""
    scheduler = AgentScheduler(args.config)
    scheduler.start()


def cmd_index(args: argparse.Namespace) -> None:
    """Indiziert die Wissensbasis."""
    agent = EmailAgent(args.config)
    agent.index_knowledge(force=args.force)


def cmd_search(args: argparse.Namespace) -> None:
    """Sucht in der Wissensbasis."""
    agent = EmailAgent(args.config)

    console.print(f"\n[bold]Suche nach:[/bold] {args.query}\n")

    results = agent.knowledge_base.search(args.query, n_results=args.limit)

    if not results:
        console.print("[yellow]Keine Ergebnisse gefunden.[/yellow]")
        return

    for i, result in enumerate(results, 1):
        console.print(f"[bold cyan]Ergebnis {i}[/bold cyan] (Relevanz: {result.score:.0%})")
        console.print(f"[dim]Quelle: {result.source}[/dim]")
        console.print(result.content[:500])
        console.print("-" * 40 + "\n")


def cmd_stats(args: argparse.Namespace) -> None:
    """Zeigt Statistiken an."""
    agent = EmailAgent(args.config)
    agent.show_knowledge_stats()


def cmd_history(args: argparse.Namespace) -> None:
    """Zeigt die Verarbeitungs-Historie."""
    agent = EmailAgent(args.config)
    agent.show_history(limit=args.limit)


def cmd_add_knowledge(args: argparse.Namespace) -> None:
    """Fügt Wissen interaktiv hinzu."""
    agent = EmailAgent(args.config)

    console.print("[bold]Neues Wissen hinzufügen[/bold]\n")

    title = console.input("[cyan]Titel:[/cyan] ")
    if not title:
        console.print("[red]Titel darf nicht leer sein.[/red]")
        return

    console.print("[cyan]Inhalt (leere Zeile zum Beenden):[/cyan]")

    lines = []
    while True:
        line = input()
        if line == "":
            break
        lines.append(line)

    content = "\n".join(lines)

    if not content:
        console.print("[red]Inhalt darf nicht leer sein.[/red]")
        return

    file_path = agent.knowledge_base.add_document(title, content)
    console.print(f"\n[green]Wissen gespeichert: {file_path}[/green]")


def main() -> None:
    """Haupteinstiegspunkt."""
    parser = argparse.ArgumentParser(
        description="E-Mail-Agent - Intelligente E-Mail-Antworten mit KI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument(
        "-c", "--config",
        default="config.yaml",
        help="Pfad zur Konfigurationsdatei (Standard: config.yaml)",
    )

    subparsers = parser.add_subparsers(dest="command", help="Verfügbare Befehle")

    # run
    run_parser = subparsers.add_parser("run", help="Einmalige Ausführung")
    run_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Keine E-Mails senden, nur Antworten generieren",
    )

    # schedule
    subparsers.add_parser("schedule", help="Scheduler starten")

    # index
    index_parser = subparsers.add_parser("index", help="Wissensbasis indizieren")
    index_parser.add_argument(
        "-f", "--force",
        action="store_true",
        help="Alle Dokumente neu indizieren",
    )

    # search
    search_parser = subparsers.add_parser("search", help="In Wissensbasis suchen")
    search_parser.add_argument("query", help="Suchanfrage")
    search_parser.add_argument(
        "-n", "--limit",
        type=int,
        default=5,
        help="Anzahl der Ergebnisse (Standard: 5)",
    )

    # stats
    subparsers.add_parser("stats", help="Statistiken anzeigen")

    # history
    history_parser = subparsers.add_parser("history", help="Verarbeitungs-Historie")
    history_parser.add_argument(
        "-n", "--limit",
        type=int,
        default=10,
        help="Anzahl der Einträge (Standard: 10)",
    )

    # add-knowledge
    subparsers.add_parser("add-knowledge", help="Wissen interaktiv hinzufügen")

    args = parser.parse_args()

    print_banner()

    if args.command is None:
        parser.print_help()
        return

    commands = {
        "run": cmd_run,
        "schedule": cmd_schedule,
        "index": cmd_index,
        "search": cmd_search,
        "stats": cmd_stats,
        "history": cmd_history,
        "add-knowledge": cmd_add_knowledge,
    }

    try:
        commands[args.command](args)
    except FileNotFoundError as e:
        console.print(f"[red]{e}[/red]")
        sys.exit(1)
    except KeyboardInterrupt:
        console.print("\n[yellow]Abgebrochen.[/yellow]")
        sys.exit(0)
    except Exception as e:
        console.print(f"[red]Fehler: {e}[/red]")
        sys.exit(1)


if __name__ == "__main__":
    main()
