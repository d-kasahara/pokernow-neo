'use client';

import { ClientGameState } from '../../types/game';

interface TournamentInfoProps {
  gameState: ClientGameState;
}

export function TournamentInfo({ gameState }: TournamentInfoProps) {
  const { blindLevel, blindTimerRemaining, handNumber, players } = gameState;

  const activePlayers = players.filter(p => p.status !== 'eliminated');
  const totalPlayers = players.length;

  // タイマー表示（mm:ss）
  const minutes = Math.floor(blindTimerRemaining / 60);
  const seconds = blindTimerRemaining % 60;
  const timerDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // プレイヤーをチップ順にソート
  const rankedPlayers = [...players]
    .filter(p => p.status !== 'eliminated')
    .sort((a, b) => b.chips - a.chips);

  return (
    <div className="bg-gray-900/90 border-b border-gray-800 px-4 py-2">
      <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-2">
        {/* ブラインド情報 */}
        <div className="flex items-center gap-4">
          <div>
            <span className="text-xs text-gray-500">Level {blindLevel.level}</span>
            <div className="text-sm font-bold text-white">
              {blindLevel.smallBlind.toLocaleString()}/{blindLevel.bigBlind.toLocaleString()}
              {blindLevel.ante > 0 && (
                <span className="text-gray-400 ml-1">
                  (ante {blindLevel.ante.toLocaleString()})
                </span>
              )}
            </div>
          </div>

          {/* タイマー */}
          <div className="text-center">
            <span className="text-xs text-gray-500">次のレベルまで</span>
            <div className={`text-sm font-mono font-bold ${
              blindTimerRemaining <= 30 ? 'text-red-400' : 'text-white'
            }`}>
              {timerDisplay}
            </div>
          </div>
        </div>

        {/* ハンド・プレイヤー情報 */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <span className="text-xs text-gray-500">Hand</span>
            <div className="text-sm font-bold text-white">#{handNumber}</div>
          </div>

          <div className="text-center">
            <span className="text-xs text-gray-500">Players</span>
            <div className="text-sm font-bold text-white">
              {activePlayers.length}/{totalPlayers}
            </div>
          </div>

          {/* チップリーダー */}
          {rankedPlayers.length > 0 && (
            <div className="hidden md:block text-center">
              <span className="text-xs text-gray-500">Leader</span>
              <div className="text-sm font-bold text-gold">
                {rankedPlayers[0].nickname} ({rankedPlayers[0].chips.toLocaleString()})
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
