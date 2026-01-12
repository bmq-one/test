FROM python:3.11-slim

WORKDIR /app

# Installiere Abhängigkeiten
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Kopiere den Code
COPY . .

# Exponiere Port
EXPOSE 8000

# Starte die Anwendung
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
