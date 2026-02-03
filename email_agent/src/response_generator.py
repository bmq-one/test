"""
KI-gestützter Antwort-Generator mit Claude API.
"""

from dataclasses import dataclass
from typing import Optional

import anthropic
from rich.console import Console

from .config import Config
from .email_client import Email
from .knowledge_base import KnowledgeBase

console = Console()


@dataclass
class GeneratedResponse:
    """Eine generierte E-Mail-Antwort."""

    subject: str
    body: str
    confidence: float
    reasoning: str
    sources_used: list[str]


class ResponseGenerator:
    """
    Generiert intelligente E-Mail-Antworten mit Claude.

    Nutzt die Wissensbasis für kontextrelevante Antworten.
    """

    def __init__(self, config: Config, knowledge_base: KnowledgeBase):
        """
        Initialisiert den Response-Generator.

        Args:
            config: Konfigurationsobjekt
            knowledge_base: Wissensbasis-Instanz
        """
        self.config = config
        self.knowledge_base = knowledge_base

        anthropic_config = config.anthropic
        self._client = anthropic.Anthropic(api_key=anthropic_config["api_key"])
        self._model = anthropic_config.get("model", "claude-sonnet-4-20250514")
        self._max_tokens = anthropic_config.get("max_tokens", 2048)

        agent_config = config.agent
        self._agent_name = agent_config.get("name", "E-Mail-Assistent")
        self._user_name = agent_config.get("user_name", "")
        self._language = agent_config.get("language", "de")

    def _build_system_prompt(self) -> str:
        """Erstellt den System-Prompt für Claude."""
        return f"""Du bist ein persönlicher E-Mail-Assistent namens "{self._agent_name}".
Du antwortest im Namen von {self._user_name if self._user_name else "deinem Benutzer"}.

Deine Aufgaben:
1. Analysiere eingehende E-Mails sorgfältig
2. Nutze die bereitgestellten Wissensbasis-Informationen für fundierte Antworten
3. Formuliere professionelle, freundliche und hilfreiche Antworten
4. Halte den Ton der Original-E-Mail (formal/informell) bei

Wichtige Regeln:
- Antworte immer auf {self._language.upper() if self._language == "de" else self._language}
- Erfinde keine Informationen - nutze nur das bereitgestellte Wissen
- Wenn du dir unsicher bist, sage es ehrlich
- Halte Antworten prägnant aber vollständig
- Verwende keine Emojis außer der Absender sie nutzt
- Beginne nicht mit "Sehr geehrte/r" wenn die Original-Mail informell war

Gib deine Antwort im folgenden Format:
<confidence>0.0-1.0</confidence>
<reasoning>Deine Überlegungen zur Antwort</reasoning>
<sources>Genutzte Quellen aus der Wissensbasis</sources>
<response>
Die eigentliche E-Mail-Antwort hier
</response>"""

    def _build_user_prompt(self, email: Email, context: str) -> str:
        """Erstellt den User-Prompt mit E-Mail und Kontext."""
        return f"""Bitte erstelle eine Antwort auf folgende E-Mail:

--- EINGEHENDE E-MAIL ---
Von: {email.from_name} <{email.from_address}>
Betreff: {email.subject}
Datum: {email.date.strftime("%d.%m.%Y %H:%M")}

{email.body_text}
--- ENDE E-MAIL ---

--- RELEVANTES WISSEN AUS DER WISSENSBASIS ---
{context}
--- ENDE WISSEN ---

Erstelle eine passende Antwort unter Berücksichtigung des Kontexts aus der Wissensbasis."""

    def _parse_response(self, response_text: str, email: Email) -> GeneratedResponse:
        """Parst die Claude-Antwort in ein strukturiertes Format."""
        import re

        # Standardwerte
        confidence = 0.5
        reasoning = ""
        sources = []
        body = response_text

        # Confidence extrahieren
        conf_match = re.search(r"<confidence>([\d.]+)</confidence>", response_text)
        if conf_match:
            try:
                confidence = float(conf_match.group(1))
            except ValueError:
                pass

        # Reasoning extrahieren
        reason_match = re.search(
            r"<reasoning>(.*?)</reasoning>", response_text, re.DOTALL
        )
        if reason_match:
            reasoning = reason_match.group(1).strip()

        # Sources extrahieren
        sources_match = re.search(r"<sources>(.*?)</sources>", response_text, re.DOTALL)
        if sources_match:
            sources = [s.strip() for s in sources_match.group(1).split(",") if s.strip()]

        # Response extrahieren
        response_match = re.search(r"<response>(.*?)</response>", response_text, re.DOTALL)
        if response_match:
            body = response_match.group(1).strip()
        else:
            # Fallback: Versuche alles nach den Tags zu nehmen
            body = re.sub(
                r"<(confidence|reasoning|sources)>.*?</\1>",
                "",
                response_text,
                flags=re.DOTALL,
            ).strip()

        return GeneratedResponse(
            subject=f"Re: {email.subject}",
            body=body,
            confidence=confidence,
            reasoning=reasoning,
            sources_used=sources,
        )

    def generate_response(self, email: Email) -> Optional[GeneratedResponse]:
        """
        Generiert eine Antwort für eine E-Mail.

        Args:
            email: Die zu beantwortende E-Mail

        Returns:
            GeneratedResponse oder None bei Fehler
        """
        console.print(f"[blue]Generiere Antwort für: {email.subject}[/blue]")

        try:
            # Relevanten Kontext aus der Wissensbasis holen
            context = self.knowledge_base.get_relevant_context(
                email.subject, email.body_text
            )

            # Claude API aufrufen
            message = self._client.messages.create(
                model=self._model,
                max_tokens=self._max_tokens,
                system=self._build_system_prompt(),
                messages=[
                    {
                        "role": "user",
                        "content": self._build_user_prompt(email, context),
                    }
                ],
            )

            response_text = message.content[0].text
            response = self._parse_response(response_text, email)

            console.print(
                f"[green]Antwort generiert (Konfidenz: {response.confidence:.0%})[/green]"
            )

            return response

        except anthropic.APIError as e:
            console.print(f"[red]Claude API Fehler: {e}[/red]")
            return None
        except Exception as e:
            console.print(f"[red]Fehler bei der Antwort-Generierung: {e}[/red]")
            return None

    def should_auto_respond(self, response: GeneratedResponse) -> bool:
        """
        Entscheidet ob eine Antwort automatisch gesendet werden soll.

        Args:
            response: Die generierte Antwort

        Returns:
            True wenn automatisches Senden empfohlen wird
        """
        auto_send = self.config.agent.get("auto_send", False)

        if not auto_send:
            return False

        # Nur automatisch senden bei hoher Konfidenz
        return response.confidence >= 0.8

    def review_response(self, email: Email, response: GeneratedResponse) -> None:
        """
        Zeigt eine Antwort zur Überprüfung an.

        Args:
            email: Die Original-E-Mail
            response: Die generierte Antwort
        """
        console.print("\n" + "=" * 60)
        console.print("[bold]GENERIERTE ANTWORT ZUR ÜBERPRÜFUNG[/bold]")
        console.print("=" * 60)

        console.print(f"\n[cyan]Original von:[/cyan] {email.from_name} <{email.from_address}>")
        console.print(f"[cyan]Betreff:[/cyan] {email.subject}")

        console.print(f"\n[yellow]Konfidenz:[/yellow] {response.confidence:.0%}")
        console.print(f"[yellow]Überlegungen:[/yellow] {response.reasoning}")

        if response.sources_used:
            console.print(f"[yellow]Genutzte Quellen:[/yellow] {', '.join(response.sources_used)}")

        console.print("\n[bold green]--- ANTWORT ---[/bold green]")
        console.print(response.body)
        console.print("[bold green]--- ENDE ANTWORT ---[/bold green]\n")
