from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from database import init_db, get_db
from models import Case, Message
from ai_analyzer import AIAnalyzer

app = FastAPI(title="Whistleblowing Case Checker")

# CORS für Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialisiere Datenbank beim Start
@app.on_event("startup")
def startup_event():
    init_db()

# Pydantic Models für API
class NewCaseRequest(BaseModel):
    report: str

class NewCaseResponse(BaseModel):
    token: str
    message: str

class MessageRequest(BaseModel):
    content: str

class MessageResponse(BaseModel):
    id: int
    sender: str
    content: str
    created_at: datetime

class CaseResponse(BaseModel):
    id: int
    token: str
    status: str
    risk_category: Optional[str]
    initial_report: str
    ai_assessment: Optional[str]
    is_complete: bool
    created_at: datetime
    messages: List[MessageResponse]

class ComplianceMessageRequest(BaseModel):
    content: str


# ===== WHISTLEBLOWER ENDPOINTS =====

@app.post("/api/cases", response_model=NewCaseResponse)
async def create_case(request: NewCaseRequest, db: Session = Depends(get_db)):
    """Neue anonyme Meldung einreichen"""

    # Erstelle neuen Fall
    case = Case(
        token=Case.generate_token(),
        initial_report=request.report,
        status="analyzing"
    )
    db.add(case)

    # Speichere initiale Meldung als Nachricht
    initial_msg = Message(
        case=case,
        sender="whistleblower",
        content=request.report
    )
    db.add(initial_msg)
    db.commit()

    # KI-Analyse durchführen
    try:
        analyzer = AIAnalyzer()
        is_complete, follow_up, preliminary = analyzer.analyze_initial_report(request.report)

        if is_complete:
            # Sachverhalt vollständig - führe finale Bewertung durch
            full_text = f"Meldung: {request.report}"
            category, assessment = analyzer.analyze_complete_case(full_text)

            case.is_complete = True
            case.risk_category = category
            case.ai_assessment = assessment
            case.status = category

            # KI-Bewertung als Nachricht speichern
            ai_msg = Message(
                case=case,
                sender="ai",
                content=f"Analyse abgeschlossen.\n\nRisikokategorie: {category.upper()}\n\n{assessment}"
            )
            db.add(ai_msg)

            response_message = "Ihre Meldung wurde analysiert. Sie können mit Ihrem Token den Status abrufen."
        else:
            # Rückfragen notwendig
            case.is_complete = False
            ai_msg = Message(
                case=case,
                sender="ai",
                content=follow_up
            )
            db.add(ai_msg)

            response_message = "Vielen Dank für Ihre Meldung. Bitte beantworten Sie die folgenden Fragen."

        db.commit()

    except Exception as e:
        case.status = "error"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Fehler bei der KI-Analyse: {str(e)}")

    return NewCaseResponse(
        token=case.token,
        message=response_message
    )


@app.get("/api/cases/{token}", response_model=CaseResponse)
async def get_case(token: str, db: Session = Depends(get_db)):
    """Fall mit anonymem Token abrufen"""

    case = db.query(Case).filter(Case.token == token).first()
    if not case:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden")

    messages = [
        MessageResponse(
            id=msg.id,
            sender=msg.sender,
            content=msg.content,
            created_at=msg.created_at
        )
        for msg in case.messages
    ]

    return CaseResponse(
        id=case.id,
        token=case.token,
        status=case.status,
        risk_category=case.risk_category,
        initial_report=case.initial_report,
        ai_assessment=case.ai_assessment,
        is_complete=case.is_complete,
        created_at=case.created_at,
        messages=messages
    )


@app.post("/api/cases/{token}/messages")
async def add_whistleblower_message(
    token: str,
    request: MessageRequest,
    db: Session = Depends(get_db)
):
    """Whistleblower beantwortet Rückfragen"""

    case = db.query(Case).filter(Case.token == token).first()
    if not case:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden")

    if case.is_complete:
        raise HTTPException(status_code=400, detail="Fall ist bereits abgeschlossen")

    # Speichere Whistleblower-Antwort
    user_msg = Message(
        case=case,
        sender="whistleblower",
        content=request.content
    )
    db.add(user_msg)
    db.commit()

    # KI verarbeitet die Antwort
    try:
        analyzer = AIAnalyzer()

        # Baue Konversationshistorie auf
        conversation = "\n\n".join([
            f"{msg.sender.upper()}: {msg.content}"
            for msg in case.messages
        ])

        is_complete, ai_response = analyzer.answer_question(conversation, request.content)

        ai_msg = Message(
            case=case,
            sender="ai",
            content=ai_response
        )
        db.add(ai_msg)

        if is_complete:
            # Jetzt vollständig - finale Bewertung
            category, assessment = analyzer.analyze_complete_case(conversation)

            case.is_complete = True
            case.risk_category = category
            case.ai_assessment = assessment
            case.status = category

            # Finale Bewertung als Nachricht
            final_msg = Message(
                case=case,
                sender="ai",
                content=f"Analyse abgeschlossen.\n\nRisikokategorie: {category.upper()}\n\n{assessment}"
            )
            db.add(final_msg)

        db.commit()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler bei der KI-Analyse: {str(e)}")

    return {"message": "Antwort gespeichert"}


# ===== COMPLIANCE DASHBOARD ENDPOINTS =====

@app.get("/api/compliance/cases")
async def get_all_cases(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Alle Fälle für Compliance-Abteilung"""

    query = db.query(Case)

    if status:
        query = query.filter(Case.status == status)

    cases = query.order_by(Case.created_at.desc()).all()

    result = []
    for case in cases:
        messages = [
            MessageResponse(
                id=msg.id,
                sender=msg.sender,
                content=msg.content,
                created_at=msg.created_at
            )
            for msg in case.messages
        ]

        result.append(CaseResponse(
            id=case.id,
            token=case.token,
            status=case.status,
            risk_category=case.risk_category,
            initial_report=case.initial_report,
            ai_assessment=case.ai_assessment,
            is_complete=case.is_complete,
            created_at=case.created_at,
            messages=messages
        ))

    return result


@app.post("/api/compliance/cases/{case_id}/messages")
async def add_compliance_message(
    case_id: int,
    request: ComplianceMessageRequest,
    db: Session = Depends(get_db)
):
    """Compliance-Abteilung sendet Nachricht an Whistleblower"""

    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden")

    msg = Message(
        case=case,
        sender="compliance",
        content=request.content
    )
    db.add(msg)
    db.commit()

    return {"message": "Nachricht gesendet"}


@app.put("/api/compliance/cases/{case_id}/close")
async def close_case(case_id: int, db: Session = Depends(get_db)):
    """Fall schließen"""

    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden")

    case.status = "closed"
    case.closed_at = datetime.utcnow()
    db.commit()

    return {"message": "Fall geschlossen"}


@app.get("/")
async def root():
    return {"message": "Whistleblowing Case Checker API"}
