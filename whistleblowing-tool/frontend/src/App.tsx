import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import WhistleblowerPortal from './pages/WhistleblowerPortal';
import ComplianceDashboard from './pages/ComplianceDashboard';
import './App.css';

function Home() {
  return (
    <div className="home-container">
      <div className="home-content">
        <h1>🔒 Whistleblowing Case Checker</h1>
        <p className="subtitle">Anonymes Meldesystem nach Geldwäschegesetz (GwG)</p>

        <div className="button-group">
          <Link to="/whistleblower" className="btn btn-primary">
            <span className="btn-icon">📢</span>
            <div>
              <div className="btn-title">Anonyme Meldung</div>
              <div className="btn-subtitle">Für Whistleblower</div>
            </div>
          </Link>

          <Link to="/compliance" className="btn btn-secondary">
            <span className="btn-icon">👔</span>
            <div>
              <div className="btn-title">Compliance-Dashboard</div>
              <div className="btn-subtitle">Für Compliance-Abteilung</div>
            </div>
          </Link>
        </div>

        <div className="info-box">
          <h3>ℹ️ Informationen</h3>
          <ul>
            <li>Alle Meldungen sind vollständig anonym</li>
            <li>KI-gestützte Vorprüfung nach GwG-Standards</li>
            <li>Automatische Kategorisierung (Grün/Gelb/Rot)</li>
            <li>Sichere Kommunikation über Token</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/whistleblower" element={<WhistleblowerPortal />} />
        <Route path="/compliance" element={<ComplianceDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
