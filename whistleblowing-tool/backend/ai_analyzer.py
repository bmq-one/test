import os
from anthropic import Anthropic
from typing import Dict, Tuple

class AIAnalyzer:
    """KI-Analyzer für Whistleblowing-Meldungen nach Geldwäschegesetz"""

    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY muss gesetzt sein")
        self.client = Anthropic(api_key=api_key)

    def analyze_initial_report(self, report: str) -> Tuple[bool, str, str]:
        """
        Analysiert die erste Meldung

        Returns:
            Tuple[is_complete, follow_up_questions, preliminary_assessment]
        """

        prompt = f"""Du bist ein spezialisierter Compliance-Assistent für Geldwäscheprävention nach deutschem Recht.

Eine anonyme Meldung ist eingegangen:

"{report}"

Deine Aufgaben:
1. Prüfe, ob der Sachverhalt vollständig und detailliert genug beschrieben ist
2. Falls NICHT vollständig: Formuliere präzise Rückfragen, um alle relevanten Details zu erfassen (z.B. Zeitpunkt, Personen, Beträge, Transaktionen, Kontext)
3. Falls VOLLSTÄNDIG: Gib eine vorläufige Einschätzung ab

Antworte im folgenden JSON-Format:
{{
    "is_complete": true/false,
    "follow_up_questions": "Liste der Rückfragen (nur wenn nicht vollständig)",
    "preliminary_assessment": "Kurze erste Einschätzung (nur wenn vollständig)"
}}"""

        response = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )

        result = response.content[0].text

        # Parse die Antwort
        try:
            import json
            parsed = json.loads(result)
            is_complete = parsed.get("is_complete", False)
            follow_up = parsed.get("follow_up_questions", "")
            assessment = parsed.get("preliminary_assessment", "")
            return is_complete, follow_up, assessment
        except:
            return False, result, ""

    def analyze_complete_case(self, full_conversation: str) -> Tuple[str, str]:
        """
        Analysiert einen vollständigen Fall und kategorisiert ihn

        Returns:
            Tuple[risk_category, detailed_assessment]
            risk_category: "green", "yellow", "red"
        """

        prompt = f"""Du bist ein spezialisierter Compliance-Experte für Geldwäscheprävention nach deutschem Geldwäschegesetz (GwG).

Vollständiger Sachverhalt:

{full_conversation}

Deine Aufgabe:
1. Führe eine rechtliche Risikoanalyse durch
2. Bewerte nach den Kriterien des Geldwäschegesetzes
3. Kategorisiere den Fall:
   - GRÜN: Völlig unproblematisch, kein Risiko, kann sofort geschlossen werden
   - GELB: Prüfbedürftig, muss von einem Menschen geprüft werden
   - ROT: Erhebliches juristisches Risiko, erfordert sofortige Aufmerksamkeit

Berücksichtige insbesondere:
- Verdacht auf Geldwäsche (§ 261 StGB)
- Terrorismusfinanzierung
- Verstöße gegen GwG-Sorgfaltspflichten
- Höhe möglicher Beträge
- Involvierte Personen und Länder
- Ungewöhnliche Transaktionsmuster

Antworte im folgenden JSON-Format:
{{
    "risk_category": "green/yellow/red",
    "assessment": "Detaillierte rechtliche Einschätzung mit Begründung der Kategorisierung",
    "key_risk_factors": ["Liste der Risikofaktoren"],
    "legal_references": ["Relevante Gesetzesartikel"]
}}"""

        response = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}]
        )

        result = response.content[0].text

        # Parse die Antwort
        try:
            import json
            parsed = json.loads(result)
            category = parsed.get("risk_category", "yellow")

            # Formatiere die detaillierte Bewertung
            assessment = parsed.get("assessment", "")
            risk_factors = parsed.get("key_risk_factors", [])
            legal_refs = parsed.get("legal_references", [])

            detailed_assessment = f"{assessment}\n\n"
            if risk_factors:
                detailed_assessment += "Risikofaktoren:\n" + "\n".join(f"- {rf}" for rf in risk_factors) + "\n\n"
            if legal_refs:
                detailed_assessment += "Rechtliche Grundlagen:\n" + "\n".join(f"- {lr}" for lr in legal_refs)

            return category, detailed_assessment
        except:
            return "yellow", result

    def answer_question(self, conversation_history: str, user_response: str) -> Tuple[bool, str]:
        """
        Verarbeitet die Antwort des Whistleblowers auf Rückfragen

        Returns:
            Tuple[is_now_complete, next_message]
        """

        prompt = f"""Du bist ein Compliance-Assistent. Du hast Rückfragen gestellt und eine Antwort erhalten.

Bisheriger Verlauf:
{conversation_history}

Neue Antwort des Whistleblowers:
{user_response}

Aufgaben:
1. Prüfe, ob der Sachverhalt jetzt vollständig erfasst ist
2. Falls NICHT: Stelle weitere präzise Rückfragen
3. Falls JA: Bestätige, dass alle Informationen vorliegen

Antworte im JSON-Format:
{{
    "is_complete": true/false,
    "message": "Deine Antwort an den Whistleblower"
}}"""

        response = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )

        result = response.content[0].text

        try:
            import json
            parsed = json.loads(result)
            is_complete = parsed.get("is_complete", False)
            message = parsed.get("message", "")
            return is_complete, message
        except:
            return False, result
