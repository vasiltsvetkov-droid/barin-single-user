import React from 'react';
import PlayerCard from './PlayerCard';

export default function PlayerCardList({ files, onUpdate, onRemove }) {
  return (
    <div className="player-card-list">
      {files.map((entry) => (
        <PlayerCard
          key={entry.id}
          entry={entry}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
