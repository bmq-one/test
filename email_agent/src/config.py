"""
Konfigurationsmanagement für den E-Mail-Agenten.
"""

import os
from pathlib import Path
from typing import Any, Optional
import yaml
from dotenv import load_dotenv


class Config:
    """Lädt und verwaltet die Konfiguration des E-Mail-Agenten."""

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialisiert die Konfiguration.

        Args:
            config_path: Pfad zur config.yaml (Standard: ./config.yaml)
        """
        load_dotenv()

        if config_path is None:
            config_path = os.getenv("EMAIL_AGENT_CONFIG", "config.yaml")

        self.config_path = Path(config_path)
        self._config: dict = {}
        self._load_config()

    def _load_config(self) -> None:
        """Lädt die Konfiguration aus der YAML-Datei."""
        if not self.config_path.exists():
            raise FileNotFoundError(
                f"Konfigurationsdatei nicht gefunden: {self.config_path}\n"
                f"Bitte kopiere config.yaml.example nach config.yaml und passe die Werte an."
            )

        with open(self.config_path, "r", encoding="utf-8") as f:
            self._config = yaml.safe_load(f)

        self._override_with_env()

    def _override_with_env(self) -> None:
        """Überschreibt Konfigurationswerte mit Umgebungsvariablen."""
        env_mappings = {
            "EMAIL_ADDRESS": ("email", "email_address"),
            "EMAIL_PASSWORD": ("email", "password"),
            "IMAP_SERVER": ("email", "imap_server"),
            "SMTP_SERVER": ("email", "smtp_server"),
            "ANTHROPIC_API_KEY": ("anthropic", "api_key"),
        }

        for env_var, path in env_mappings.items():
            value = os.getenv(env_var)
            if value:
                self._set_nested(path, value)

    def _set_nested(self, path: tuple, value: Any) -> None:
        """Setzt einen verschachtelten Konfigurationswert."""
        current = self._config
        for key in path[:-1]:
            current = current.setdefault(key, {})
        current[path[-1]] = value

    def get(self, *keys: str, default: Any = None) -> Any:
        """
        Holt einen Konfigurationswert.

        Args:
            keys: Verschachtelte Schlüssel (z.B. "email", "imap_server")
            default: Standardwert falls nicht gefunden

        Returns:
            Der Konfigurationswert oder default
        """
        current = self._config
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return default
        return current

    @property
    def email(self) -> dict:
        """E-Mail-Konfiguration."""
        return self._config.get("email", {})

    @property
    def anthropic(self) -> dict:
        """Anthropic API Konfiguration."""
        return self._config.get("anthropic", {})

    @property
    def knowledge_base(self) -> dict:
        """Wissensbasis-Konfiguration."""
        return self._config.get("knowledge_base", {})

    @property
    def agent(self) -> dict:
        """Agent-Konfiguration."""
        return self._config.get("agent", {})

    @property
    def scheduler(self) -> dict:
        """Scheduler-Konfiguration."""
        return self._config.get("scheduler", {})

    @property
    def logging(self) -> dict:
        """Logging-Konfiguration."""
        return self._config.get("logging", {})
