import React from 'react';

const ACTIVITY_TYPES = [
  'Training Session',
  'Match',
  'Recovery Run',
  'Friendly Match',
  'Fitness Test',
  'Other',
];

export default function PlayerCard({ entry, onUpdate, onRemove }) {
  const isReady = entry.name.trim() !== '';

  return (
    <div className="player-card">
      <button className="remove-btn" onClick={() => onRemove(entry.id)} title="Remove">
        ×
      </button>
      <div className="file-name">{entry.fileName}</div>
      <div className="form-row">
        <input
          type="text"
          placeholder="Enter athlete name"
          value={entry.name}
          onChange={(e) => onUpdate(entry.id, 'name', e.target.value)}
        />
        <select
          value={entry.activityType}
          onChange={(e) => onUpdate(entry.id, 'activityType', e.target.value)}
        >
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <span className={`ready-badge${isReady ? ' visible' : ''}`}>✓ Ready</span>
    </div>
  );
}
