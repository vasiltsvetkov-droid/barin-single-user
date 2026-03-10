import React, { useState, useCallback, useEffect } from 'react';
import UploadZone from './components/UploadZone';
import PlayerCardList from './components/PlayerCardList';
import GenerateButton from './components/GenerateButton';
import NeuralBackground from './components/NeuralBackground';
import { parseCSVText, computeMetrics, buildReport, downloadHTML } from './components/ReportBuilder';

const LOGO_DARK = 'https://i.imgur.com/LgVMPLV.png';  // white logo with red 360
const LOGO_LIGHT = 'https://i.imgur.com/7piXXXA.png'; // black logo with red 360

export default function App() {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setFiles([]);
    setStatus(null);
    setProgress(null);
  }, []);

  const handleFilesAdded = useCallback((newFiles) => {
    const entries = Array.from(newFiles)
      .filter((f) => f.name.endsWith('.csv'))
      .map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        fileName: f.name,
        name: '',
        activityType: 'Training Session',
      }));
    setFiles((prev) => [...prev, ...entries]);
    setStatus(null);
  }, []);

  const handleUpdateFile = useCallback((id, field, value) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  }, []);

  const handleRemoveFile = useCallback((id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleGenerate = useCallback(async () => {
    setStatus({ type: 'info', message: 'Parsing CSV files...' });
    setProgress({ current: 0, total: files.length });

    try {
      const players = [];
      for (let i = 0; i < files.length; i++) {
        setProgress({ current: i + 1, total: files.length });
        setStatus({ type: 'info', message: `Parsing ${i + 1} of ${files.length}...` });

        const { file, name, activityType } = files[i];
        const text = await file.text();
        const rows = parseCSVText(text);

        if (rows.length < 2) {
          setStatus({ type: 'error', message: `Parse error: ${files[i].fileName} has fewer than 2 data rows.` });
          setProgress(null);
          return;
        }

        players.push(computeMetrics(rows, name, activityType));
      }

      const html = buildReport(players);
      const filename = `barin_report_${players[0].date.replace(/\./g, '')}.html`;
      downloadHTML(html, filename);

      setStatus({ type: 'success', message: `Downloaded: ${filename}` });
      setProgress(null);
    } catch (err) {
      setStatus({ type: 'error', message: `Error: ${err.message}` });
      setProgress(null);
    }
  }, [files]);

  const allReady = files.length > 0 && files.every((f) => f.name.trim() !== '');
  const readyCount = files.filter((f) => f.name.trim() !== '').length;

  return (
    <>
      {/* Loading Screen */}
      <div className={`loading-screen${loading ? '' : ' hidden'}`}>
        <div className="loader-container">
          <div className="loader-spinner"></div>
          <div className="loader-text">Barin Sports 360</div>
        </div>
      </div>

      {/* Neural Network Background */}
      <NeuralBackground theme={theme} />

      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <a href="https://barinsports.com/" target="_blank" rel="noopener noreferrer">
            <img
              src={theme === 'dark' ? LOGO_DARK : LOGO_LIGHT}
              alt="Barin Sports PRO"
              className="header-logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </a>
          <span className="header-label">Report Generator</span>
        </div>
        <div className="header-right">
          {files.length > 0 && (
            <button className="reset-btn" onClick={handleReset}>
              Reset
            </button>
          )}
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          <span className="pro-badge">PRO</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="app-container">
        <div className="hero">
          <h1>Upload CSVs, get your <span className="accent">report</span>.</h1>
          <p>Upload one CSV per athlete. Fill in the form for each. Generate a full performance report.</p>
        </div>

        <UploadZone onFilesAdded={handleFilesAdded} />

        {files.length > 0 && (
          <PlayerCardList
            files={files}
            onUpdate={handleUpdateFile}
            onRemove={handleRemoveFile}
          />
        )}

        {files.length > 0 && (
          <GenerateButton
            disabled={!allReady}
            count={files.length}
            readyCount={readyCount}
            onGenerate={handleGenerate}
          />
        )}

        {progress && (
          <div className="progress-bar-container">
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <div className="progress-text">
              Parsing {progress.current} of {progress.total}...
            </div>
          </div>
        )}

        {status && (
          <div className={`status-bar ${status.type}`}>
            {status.message}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <p>&copy; 2024 Barin Sports 360. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
