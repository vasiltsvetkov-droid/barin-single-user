import React, { useState, useCallback } from 'react';
import UploadZone from './components/UploadZone';
import PlayerCardList from './components/PlayerCardList';
import GenerateButton from './components/GenerateButton';
import { parseCSVText, computeMetrics, buildReport, downloadHTML } from './components/ReportBuilder';

export default function App() {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState(null); // { type: 'info'|'success'|'error', message }
  const [progress, setProgress] = useState(null); // { current, total }

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
      <header className="app-header">
        <div className="header-left">
          <img
            src="https://i.imgur.com/hHgp1iR.png"
            alt="Barin Sports PRO"
            className="header-logo"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span className="header-label">Report Generator</span>
        </div>
        <span className="pro-badge">PRO</span>
      </header>

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
    </>
  );
}
