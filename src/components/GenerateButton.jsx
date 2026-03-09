import React from 'react';

export default function GenerateButton({ disabled, count, readyCount, onGenerate }) {
  return (
    <div className="generate-section">
      <button className="generate-btn" disabled={disabled} onClick={onGenerate}>
        Generate Report
      </button>
      <div className="generate-count">
        {readyCount === count
          ? `${count} athlete${count !== 1 ? 's' : ''} loaded — ready to generate`
          : `${readyCount} of ${count} athletes ready`}
      </div>
    </div>
  );
}
