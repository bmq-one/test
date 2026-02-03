"""
Wissensbasis-Modul für semantische Suche in Dokumenten.
"""

import hashlib
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import chromadb
from chromadb.config import Settings
from rich.console import Console

from .config import Config

console = Console()


@dataclass
class SearchResult:
    """Ein Suchergebnis aus der Wissensbasis."""

    content: str
    source: str
    score: float
    metadata: dict


class KnowledgeBase:
    """
    Wissensbasis mit semantischer Suche.

    Nutzt ChromaDB für Vektorsuche und Sentence Transformers für Embeddings.
    """

    def __init__(self, config: Config):
        """
        Initialisiert die Wissensbasis.

        Args:
            config: Konfigurationsobjekt
        """
        self.config = config
        kb_config = config.knowledge_base

        # ChromaDB initialisieren
        chroma_path = Path(kb_config.get("chroma_path", "./chroma_db"))
        chroma_path.mkdir(parents=True, exist_ok=True)

        self._client = chromadb.PersistentClient(
            path=str(chroma_path),
            settings=Settings(anonymized_telemetry=False),
        )

        # Collection für Wissensdokumente
        self._collection = self._client.get_or_create_collection(
            name="knowledge_documents",
            metadata={"hnsw:space": "cosine"},
        )

        self._documents_path = Path(kb_config.get("documents_path", "./knowledge"))
        self._top_k = kb_config.get("top_k_results", 5)

        # Dokumente-Verzeichnis erstellen falls nicht vorhanden
        self._documents_path.mkdir(parents=True, exist_ok=True)

    def _compute_file_hash(self, file_path: Path) -> str:
        """Berechnet den MD5-Hash einer Datei."""
        hasher = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    def _chunk_text(
        self,
        text: str,
        chunk_size: int = 1000,
        overlap: int = 200,
    ) -> list[str]:
        """
        Teilt Text in überlappende Chunks.

        Args:
            text: Der zu teilende Text
            chunk_size: Maximale Chunk-Größe in Zeichen
            overlap: Überlappung zwischen Chunks

        Returns:
            Liste von Text-Chunks
        """
        chunks = []
        start = 0

        while start < len(text):
            end = start + chunk_size

            # Versuche am Satzende zu trennen
            if end < len(text):
                # Suche nach Satzende in den letzten 100 Zeichen
                search_start = max(end - 100, start)
                for delimiter in [".\n", ".\n\n", ". ", "!\n", "?\n"]:
                    pos = text.rfind(delimiter, search_start, end)
                    if pos != -1:
                        end = pos + len(delimiter)
                        break

            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)

            start = end - overlap

        return chunks

    def _read_file(self, file_path: Path) -> Optional[str]:
        """Liest den Inhalt einer Datei."""
        supported_extensions = {".txt", ".md", ".rst", ".json", ".yaml", ".yml"}

        if file_path.suffix.lower() not in supported_extensions:
            return None

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            console.print(f"[yellow]Warnung: Konnte {file_path} nicht lesen: {e}[/yellow]")
            return None

    def index_documents(self, force_reindex: bool = False) -> int:
        """
        Indiziert alle Dokumente im Wissensverzeichnis.

        Args:
            force_reindex: Wenn True, werden alle Dokumente neu indiziert

        Returns:
            Anzahl der neu indizierten Dokumente
        """
        if not self._documents_path.exists():
            console.print(
                f"[yellow]Wissensverzeichnis nicht gefunden: {self._documents_path}[/yellow]"
            )
            return 0

        indexed_count = 0

        # Alle Dateien rekursiv durchgehen
        for file_path in self._documents_path.rglob("*"):
            if not file_path.is_file():
                continue

            content = self._read_file(file_path)
            if not content:
                continue

            file_hash = self._compute_file_hash(file_path)
            relative_path = str(file_path.relative_to(self._documents_path))

            # Prüfen ob Datei bereits indiziert ist
            if not force_reindex:
                existing = self._collection.get(
                    where={"source": relative_path, "file_hash": file_hash},
                    limit=1,
                )
                if existing["ids"]:
                    continue

            # Alte Einträge für diese Datei entfernen
            try:
                self._collection.delete(where={"source": relative_path})
            except Exception:
                pass

            # Text in Chunks teilen und indizieren
            chunks = self._chunk_text(content)

            for i, chunk in enumerate(chunks):
                doc_id = f"{relative_path}_{i}"

                self._collection.add(
                    ids=[doc_id],
                    documents=[chunk],
                    metadatas=[
                        {
                            "source": relative_path,
                            "chunk_index": i,
                            "total_chunks": len(chunks),
                            "file_hash": file_hash,
                        }
                    ],
                )

            console.print(f"[green]Indiziert: {relative_path} ({len(chunks)} Chunks)[/green]")
            indexed_count += 1

        console.print(f"[blue]Insgesamt {indexed_count} Dokumente indiziert[/blue]")
        return indexed_count

    def search(self, query: str, n_results: Optional[int] = None) -> list[SearchResult]:
        """
        Sucht in der Wissensbasis nach relevanten Dokumenten.

        Args:
            query: Die Suchanfrage
            n_results: Anzahl der Ergebnisse (Standard aus Konfiguration)

        Returns:
            Liste von SearchResult-Objekten
        """
        if n_results is None:
            n_results = self._top_k

        # Semantische Suche durchführen
        results = self._collection.query(
            query_texts=[query],
            n_results=n_results,
        )

        search_results = []

        if results["documents"] and results["documents"][0]:
            documents = results["documents"][0]
            metadatas = results["metadatas"][0] if results["metadatas"] else [{}] * len(documents)
            distances = results["distances"][0] if results["distances"] else [0.0] * len(documents)

            for doc, meta, dist in zip(documents, metadatas, distances):
                # Distanz in Ähnlichkeitsscore umwandeln (Cosine)
                score = 1 - dist

                search_results.append(
                    SearchResult(
                        content=doc,
                        source=meta.get("source", "Unbekannt"),
                        score=score,
                        metadata=meta,
                    )
                )

        return search_results

    def get_relevant_context(self, email_subject: str, email_body: str) -> str:
        """
        Holt relevanten Kontext für eine E-Mail aus der Wissensbasis.

        Args:
            email_subject: Betreff der E-Mail
            email_body: Inhalt der E-Mail

        Returns:
            Formatierter Kontext-String
        """
        # Kombinierte Suchanfrage aus Betreff und Body
        query = f"{email_subject}\n\n{email_body[:500]}"

        results = self.search(query)

        if not results:
            return "Keine relevanten Informationen in der Wissensbasis gefunden."

        context_parts = []
        for i, result in enumerate(results, 1):
            context_parts.append(
                f"[Quelle {i}: {result.source} (Relevanz: {result.score:.0%})]\n"
                f"{result.content}\n"
            )

        return "\n---\n".join(context_parts)

    def add_document(self, title: str, content: str) -> str:
        """
        Fügt ein neues Dokument zur Wissensbasis hinzu.

        Args:
            title: Titel des Dokuments (wird als Dateiname verwendet)
            content: Inhalt des Dokuments

        Returns:
            Pfad zur erstellten Datei
        """
        # Sicheren Dateinamen erstellen
        safe_title = "".join(c for c in title if c.isalnum() or c in " -_").strip()
        safe_title = safe_title.replace(" ", "_")

        file_path = self._documents_path / f"{safe_title}.md"

        # Datei schreiben
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(f"# {title}\n\n{content}")

        # Sofort indizieren
        self.index_documents()

        return str(file_path)

    def get_stats(self) -> dict:
        """
        Gibt Statistiken über die Wissensbasis zurück.

        Returns:
            Dictionary mit Statistiken
        """
        count = self._collection.count()

        # Einzigartige Quellen zählen
        all_items = self._collection.get(include=["metadatas"])
        sources = set()
        for meta in all_items.get("metadatas", []):
            if meta and "source" in meta:
                sources.add(meta["source"])

        return {
            "total_chunks": count,
            "total_documents": len(sources),
            "sources": list(sources),
            "documents_path": str(self._documents_path),
        }
