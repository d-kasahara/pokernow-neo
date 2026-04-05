'use client';

import { useState } from 'react';
import { ClientGameState, TournamentSettings } from '../../types/game';
import { StructureSettings } from './StructureSettings';

interface LobbyProps {
  gameState: ClientGameState;
  roomId: string;
  onStartGame: () => void;
  onSitAt: (seatIndex: number) => void;
  onUpdateSettings?: (settings: Partial<TournamentSettings>) => void;
}

export function Lobby({ gameState, roomId, onStartGame, onSitAt, onUpdateSettings }: LobbyProps) {
  const isHost = gameState.players.find(p => p.id === gameState.myPlayerId)?.isHost ?? false;
  const seatedCount = gameState.players.filter(p => p.seatIndex >= 0).length;
  const canStart = isHost && seatedCount >= 2;
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] to-[#1a1a3a] p-4">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-white">Poker</span>
            <span className="text-gold">Now</span>
            <span className="text-emerald-400"> Neo</span>
          </h1>
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="text-gray-400 text-sm">ルームID:</span>
            <span className="font-mono text-2xl tracking-widest text-gold font-bold">{roomId}</span>
            <button
              onClick={copyLink}
              className={`ml-2 px-3 py-1 ${copied ? 'bg-emerald-700 text-emerald-200' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'} text-xs rounded-lg transition`}
            >
              {copied ? 'コピー済み!' : 'リンクをコピー'}
            </button>
          </div>
        </div>

        {/* プレイヤー一覧 */}
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-800 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            プレイヤー ({gameState.players.length}/9)
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 9 }, (_, i) => {
              const player = gameState.players.find(p => p.seatIndex === i);
              const isMe = player?.id === gameState.myPlayerId;

              return (
                <button
                  key={i}
                  onClick={() => !player && onSitAt(i)}
                  disabled={!!player}
                  className={`p-3 rounded-xl border-2 transition text-center ${
                    player
                      ? isMe
                        ? 'border-emerald-500 bg-emerald-900/30'
                        : 'border-gray-700 bg-gray-800/50'
                      : 'border-dashed border-gray-700 hover:border-emerald-500 hover:bg-gray-800/30 cursor-pointer'
                  }`}
                >
                  <div className="text-xs text-gray-500 mb-1">席 {i + 1}</div>
                  {player ? (
                    <>
                      <div className={`font-medium ${isMe ? 'text-emerald-400' : 'text-white'}`}>
                        {player.nickname}
                      </div>
                      {player.isHost && (
                        <span className="text-xs text-gold">ホスト</span>
                      )}
                    </>
                  ) : (
                    <div className="text-gray-600 text-sm">空席</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 開始ボタン & 設定ボタン */}
        <div className="text-center space-y-3">
          {isHost ? (
            <>
              <button
                onClick={onStartGame}
                disabled={!canStart}
                className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-lg font-bold rounded-xl transition shadow-lg shadow-emerald-600/25"
              >
                {canStart
                  ? `トーナメント開始 (${seatedCount}人)`
                  : '2人以上でスタートできます'}
              </button>
              <div>
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition text-sm"
                >
                  ストラクチャー設定
                </button>
              </div>
            </>
          ) : (
            <p className="text-gray-400">ホストがゲームを開始するのを待っています...</p>
          )}
        </div>

        {/* 設定情報 */}
        <div className="mt-6 bg-gray-900/50 rounded-xl p-4 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-2">トーナメント設定</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-500">初期チップ</div>
            <div className="text-white">{gameState.settings.startingChips.toLocaleString()}</div>
            <div className="text-gray-500">ブラインド時間</div>
            <div className="text-white">{gameState.settings.blindLevelDuration / 60}分</div>
            <div className="text-gray-500">持ち時間</div>
            <div className="text-white">{gameState.settings.actionTimeout}秒</div>
            <div className="text-gray-500">タイムバンク</div>
            <div className="text-white">{gameState.settings.timeBankCount}回 × {gameState.settings.timeBankSeconds}秒</div>
          </div>
        </div>
      </div>

      {/* ストラクチャー設定モーダル */}
      {showSettings && (
        <StructureSettings
          onSave={(settings) => {
            onUpdateSettings?.(settings);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
