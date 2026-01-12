import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Case } from '../types';

const API_BASE = '/api';

function WhistleblowerPortal() {
  const [view, setView] = useState<'start' | 'submit' | 'check'>('start');
  const [report, setReport] = useState('');
  const [token, setToken] = useState('');
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submitReport = async () => {
    if (!report.trim()) {
      setError('Bitte geben Sie eine Meldung ein');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report }),
      });

      if (!response.ok) throw new Error('Fehler beim Einreichen der Meldung');

      const data = await response.json();
      setToken(data.token);
      setSuccess(`Ihre Meldung wurde eingereicht. Token: ${data.token}`);

      // Lade den Fall direkt
      await loadCase(data.token);
    } catch (err) {
      setError('Fehler beim Einreichen der Meldung');
    } finally {
      setLoading(false);
    }
  };

  const loadCase = async (caseToken: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/cases/${caseToken}`);

      if (!response.ok) throw new Error('Fall nicht gefunden');

      const data = await response.json();
      setCaseData(data);
      setView('check');
    } catch (err) {
      setError('Fall nicht gefunden. Bitte überprüfen Sie Ihren Token.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !caseData) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/cases/${caseData.token}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      });

      if (!response.ok) throw new Error('Fehler beim Senden der Nachricht');

      setMessage('');
      // Lade den Fall neu
      await loadCase(caseData.token);
    } catch (err) {
      setError('Fehler beim Senden der Nachricht');
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (category?: string) => {
    if (!category) return null;

    const labels = {
      green: '🟢 GRÜN - Unproblematisch',
      yellow: '🟡 GELB - Prüfung erforderlich',
      red: '🔴 ROT - Hohes Risiko',
    };

    return (
      <div className={`risk-badge risk-${category}`}>
        {labels[category as keyof typeof labels]}
      </div>
    );
  };

  return (
    <div className="portal-container">
      <div className="portal-content">
        <Link to="/" className="back-button">← Zurück</Link>

        <h1>📢 Whistleblower-Portal</h1>
        <p className="subtitle">Anonyme Meldung einreichen oder Status prüfen</p>

        {view === 'start' && (
          <div>
            <div className="button-group">
              <button onClick={() => setView('submit')} className="btn btn-primary">
                Neue Meldung einreichen
              </button>
              <button onClick={() => setView('check')} className="btn btn-secondary">
                Status mit Token prüfen
              </button>
            </div>
          </div>
        )}

        {view === 'submit' && !caseData && (
          <div>
            <button onClick={() => setView('start')} className="back-button">← Zurück</button>

            <h2>Neue Meldung</h2>
            <p style={{ marginBottom: '20px' }}>
              Ihre Meldung wird vollständig anonym verarbeitet. Sie erhalten einen Token,
              mit dem Sie den Status Ihrer Meldung abrufen können.
            </p>

            <textarea
              placeholder="Beschreiben Sie den Sachverhalt so detailliert wie möglich..."
              value={report}
              onChange={(e) => setReport(e.target.value)}
              disabled={loading}
            />

            <button onClick={submitReport} disabled={loading}>
              {loading ? 'Wird eingereicht...' : 'Meldung einreichen'}
            </button>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
          </div>
        )}

        {view === 'check' && !caseData && (
          <div>
            <button onClick={() => setView('start')} className="back-button">← Zurück</button>

            <h2>Status prüfen</h2>
            <p style={{ marginBottom: '20px' }}>
              Geben Sie Ihren Token ein, um den Status Ihrer Meldung zu prüfen.
            </p>

            <input
              type="text"
              placeholder="Ihr Token..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={loading}
            />

            <button onClick={() => loadCase(token)} disabled={loading}>
              {loading ? 'Lädt...' : 'Status abrufen'}
            </button>

            {error && <div className="error-message">{error}</div>}
          </div>
        )}

        {caseData && (
          <div>
            <div className="message-box">
              <h2>Ihr Fall</h2>
              <p><strong>Token:</strong> {caseData.token}</p>
              <p><strong>Status:</strong> {caseData.status}</p>
              {caseData.risk_category && getRiskBadge(caseData.risk_category)}

              <div style={{ marginTop: '20px' }}>
                <h3>Kommunikation</h3>
                {caseData.messages.map((msg) => (
                  <div key={msg.id} className={`message message-${msg.sender}`}>
                    <div className="message-header">
                      {msg.sender === 'whistleblower' && '👤 Sie'}
                      {msg.sender === 'ai' && '🤖 KI-System'}
                      {msg.sender === 'compliance' && '👔 Compliance'}
                      {' - '}
                      {new Date(msg.created_at).toLocaleString('de-DE')}
                    </div>
                    <div className="message-content">{msg.content}</div>
                  </div>
                ))}
              </div>

              {!caseData.is_complete && (
                <div style={{ marginTop: '20px' }}>
                  <h3>Antworten</h3>
                  <textarea
                    placeholder="Ihre Antwort..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={loading}
                  />
                  <button onClick={sendMessage} disabled={loading}>
                    {loading ? 'Wird gesendet...' : 'Antwort senden'}
                  </button>
                </div>
              )}

              {caseData.is_complete && (
                <div className="info-box" style={{ marginTop: '20px' }}>
                  <h3>✓ Analyse abgeschlossen</h3>
                  <p>Der Sachverhalt wurde vollständig erfasst und bewertet. Die Compliance-Abteilung wird sich bei Bedarf bei Ihnen melden.</p>
                </div>
              )}
            </div>

            <button onClick={() => {
              setCaseData(null);
              setToken('');
              setView('start');
            }}>
              Neue Abfrage
            </button>

            {error && <div className="error-message">{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default WhistleblowerPortal;
