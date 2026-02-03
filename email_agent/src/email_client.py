"""
E-Mail-Client für das Lesen und Senden von E-Mails.
"""

import email
import re
import smtplib
from dataclasses import dataclass
from datetime import datetime
from email.header import decode_header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Generator, Optional

from imapclient import IMAPClient
from rich.console import Console

from .config import Config

console = Console()


@dataclass
class Email:
    """Repräsentiert eine E-Mail."""

    uid: int
    message_id: str
    from_address: str
    from_name: str
    to_address: str
    subject: str
    body_text: str
    body_html: Optional[str]
    date: datetime
    is_reply: bool
    in_reply_to: Optional[str]
    references: list[str]

    def __str__(self) -> str:
        return f"Email(from={self.from_address}, subject={self.subject[:50]}...)"


class EmailClient:
    """Client zum Lesen und Senden von E-Mails via IMAP/SMTP."""

    def __init__(self, config: Config):
        """
        Initialisiert den E-Mail-Client.

        Args:
            config: Konfigurationsobjekt
        """
        self.config = config
        self._imap: Optional[IMAPClient] = None
        self._processed_uids: set[int] = set()

    def connect(self) -> None:
        """Verbindet zum IMAP-Server."""
        email_config = self.config.email

        console.print(f"[blue]Verbinde zu {email_config['imap_server']}...[/blue]")

        self._imap = IMAPClient(
            host=email_config["imap_server"],
            port=email_config.get("imap_port", 993),
            ssl=True,
        )

        self._imap.login(
            email_config["email_address"],
            email_config["password"],
        )

        console.print("[green]Erfolgreich verbunden![/green]")

    def disconnect(self) -> None:
        """Trennt die Verbindung zum IMAP-Server."""
        if self._imap:
            try:
                self._imap.logout()
            except Exception:
                pass
            self._imap = None

    def __enter__(self) -> "EmailClient":
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.disconnect()

    def _decode_header_value(self, value: Optional[str]) -> str:
        """Dekodiert einen E-Mail-Header-Wert."""
        if not value:
            return ""

        decoded_parts = []
        for part, charset in decode_header(value):
            if isinstance(part, bytes):
                charset = charset or "utf-8"
                try:
                    decoded_parts.append(part.decode(charset, errors="replace"))
                except (LookupError, UnicodeDecodeError):
                    decoded_parts.append(part.decode("utf-8", errors="replace"))
            else:
                decoded_parts.append(part)

        return " ".join(decoded_parts)

    def _extract_email_address(self, from_header: str) -> tuple[str, str]:
        """Extrahiert Name und E-Mail-Adresse aus einem From-Header."""
        from_header = self._decode_header_value(from_header)

        match = re.search(r"<(.+?)>", from_header)
        if match:
            email_addr = match.group(1)
            name = from_header.replace(f"<{email_addr}>", "").strip().strip('"')
        else:
            email_addr = from_header.strip()
            name = ""

        return name, email_addr

    def _get_body(self, msg: email.message.Message) -> tuple[str, Optional[str]]:
        """Extrahiert den E-Mail-Body (Text und HTML)."""
        text_body = ""
        html_body = None

        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition", ""))

                if "attachment" in content_disposition:
                    continue

                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    try:
                        decoded = payload.decode(charset, errors="replace")
                    except (LookupError, UnicodeDecodeError):
                        decoded = payload.decode("utf-8", errors="replace")

                    if content_type == "text/plain":
                        text_body = decoded
                    elif content_type == "text/html":
                        html_body = decoded
        else:
            payload = msg.get_payload(decode=True)
            if payload:
                charset = msg.get_content_charset() or "utf-8"
                try:
                    text_body = payload.decode(charset, errors="replace")
                except (LookupError, UnicodeDecodeError):
                    text_body = payload.decode("utf-8", errors="replace")

        return text_body, html_body

    def _should_ignore(self, email_obj: Email) -> bool:
        """Prüft ob eine E-Mail ignoriert werden soll."""
        agent_config = self.config.agent

        # Ignorierte Adressen prüfen
        ignore_addresses = agent_config.get("ignore_addresses", [])
        if email_obj.from_address.lower() in [a.lower() for a in ignore_addresses]:
            return True

        # Ignorierte Betreff-Muster prüfen
        ignore_subjects = agent_config.get("ignore_subjects", [])
        for pattern in ignore_subjects:
            if re.search(pattern, email_obj.subject, re.IGNORECASE):
                return True

        return False

    def fetch_unread_emails(self) -> Generator[Email, None, None]:
        """
        Holt alle ungelesenen E-Mails aus dem Posteingang.

        Yields:
            Email-Objekte für jede ungelesene E-Mail
        """
        if not self._imap:
            raise RuntimeError("Nicht verbunden. Bitte zuerst connect() aufrufen.")

        email_config = self.config.email
        folder = email_config.get("inbox_folder", "INBOX")
        max_emails = email_config.get("max_emails_per_run", 20)

        self._imap.select_folder(folder)

        # Ungelesene E-Mails suchen
        uids = self._imap.search(["UNSEEN"])

        console.print(f"[blue]Gefunden: {len(uids)} ungelesene E-Mails[/blue]")

        for uid in uids[:max_emails]:
            if uid in self._processed_uids:
                continue

            try:
                raw_messages = self._imap.fetch([uid], ["RFC822", "INTERNALDATE"])

                if uid not in raw_messages:
                    continue

                raw_msg = raw_messages[uid]
                msg = email.message_from_bytes(raw_msg[b"RFC822"])
                msg_date = raw_msg.get(b"INTERNALDATE", datetime.now())

                # Header extrahieren
                from_name, from_address = self._extract_email_address(
                    msg.get("From", "")
                )
                subject = self._decode_header_value(msg.get("Subject", "(Kein Betreff)"))
                to_address = self._decode_header_value(msg.get("To", ""))
                message_id = msg.get("Message-ID", "")
                in_reply_to = msg.get("In-Reply-To")
                references = msg.get("References", "").split()

                # Body extrahieren
                text_body, html_body = self._get_body(msg)

                email_obj = Email(
                    uid=uid,
                    message_id=message_id,
                    from_address=from_address,
                    from_name=from_name,
                    to_address=to_address,
                    subject=subject,
                    body_text=text_body,
                    body_html=html_body,
                    date=msg_date,
                    is_reply=bool(in_reply_to),
                    in_reply_to=in_reply_to,
                    references=references,
                )

                if self._should_ignore(email_obj):
                    console.print(f"[dim]Ignoriere: {subject}[/dim]")
                    continue

                self._processed_uids.add(uid)
                yield email_obj

            except Exception as e:
                console.print(f"[red]Fehler beim Verarbeiten von E-Mail {uid}: {e}[/red]")
                continue

    def mark_as_read(self, uid: int) -> None:
        """Markiert eine E-Mail als gelesen."""
        if self._imap:
            self._imap.add_flags([uid], [r"\Seen"])

    def send_reply(
        self,
        original_email: Email,
        reply_body: str,
        as_draft: bool = True,
    ) -> bool:
        """
        Sendet eine Antwort auf eine E-Mail.

        Args:
            original_email: Die Original-E-Mail
            reply_body: Der Antworttext
            as_draft: Wenn True, wird die Antwort als Entwurf gespeichert

        Returns:
            True bei Erfolg, False bei Fehler
        """
        email_config = self.config.email
        agent_config = self.config.agent

        # Antwort-E-Mail erstellen
        msg = MIMEMultipart("alternative")
        msg["From"] = email_config["email_address"]
        msg["To"] = original_email.from_address
        msg["Subject"] = f"Re: {original_email.subject}"
        msg["In-Reply-To"] = original_email.message_id
        msg["References"] = f"{' '.join(original_email.references)} {original_email.message_id}".strip()

        # Signatur hinzufügen
        signature = f"\n\n--\n{agent_config.get('name', 'E-Mail-Assistent')}"
        full_body = reply_body + signature

        # Text-Teil hinzufügen
        msg.attach(MIMEText(full_body, "plain", "utf-8"))

        if as_draft:
            # Als Entwurf im Drafts-Ordner speichern
            try:
                if self._imap:
                    drafts_folder = self._find_drafts_folder()
                    self._imap.append(
                        drafts_folder,
                        msg.as_bytes(),
                        flags=[r"\Draft"],
                    )
                    console.print(f"[green]Entwurf gespeichert für: {original_email.from_address}[/green]")
                    return True
            except Exception as e:
                console.print(f"[red]Fehler beim Speichern des Entwurfs: {e}[/red]")
                return False
        else:
            # Direkt senden via SMTP
            try:
                with smtplib.SMTP(
                    email_config["smtp_server"],
                    email_config.get("smtp_port", 587),
                ) as smtp:
                    smtp.starttls()
                    smtp.login(
                        email_config["email_address"],
                        email_config["password"],
                    )
                    smtp.send_message(msg)
                    console.print(f"[green]Antwort gesendet an: {original_email.from_address}[/green]")
                    return True
            except Exception as e:
                console.print(f"[red]Fehler beim Senden: {e}[/red]")
                return False

        return False

    def _find_drafts_folder(self) -> str:
        """Findet den Drafts/Entwürfe-Ordner."""
        if not self._imap:
            return "Drafts"

        folders = self._imap.list_folders()
        for flags, delimiter, name in folders:
            if b"\\Drafts" in flags or name.lower() in ("drafts", "entwürfe", "[gmail]/drafts"):
                return name

        return "Drafts"
