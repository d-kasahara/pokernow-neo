'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSocket } from '../../../hooks/useSocket';
import { PokerTable } from '../../../components/table/PokerTable';
import { ActionPanel } from '../../../components/actions/ActionPanel';
import { TournamentInfo } from '../../../components/info/TournamentInfo';
import { Lobby } from '../../../components/lobby/Lobby';

export default function RoomPage() {
  const params = useParams();
  const roomId = (params.roomId as string).toUpperCase();
  const {
    isConnected,
    gameState,
    error,
    joinRoom,
    useTimeBank,
    startGame,
    sendAction,
    sitAt,
  } = useSocket();

  const [hasJoined, setHasJoined] = useState(false);
  const [nickname, setNickname] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');

  // セッションストレージからニックネームを復元
  useEffect(() => {
    const saved = sessionStorage.getItem('poker_nickname');
    if (saved) {
      setNickname(saved);
      setNicknameInput(saved);
    }
  }, []);

  // 自動参加（ニックネームがある場合）
  useEffect(() => {
    if (nickname && !hasJoined) {
      joinRoom(roomId, nickname);
      setHasJoined(true);
    }
  }, [nickname, roomId, hasJoined, joinRoom]);

  // ニックネーム入力後に参加
  const handleJoin = () => {
    if (!nicknameInput.trim()) return;
    const name = nicknameInput.trim();
    sessionStorage.setItem('poker_nickname', name);
    setNickname(name);
    joinRoom(roomId, name);
    setHasJoined(true);
  };

  // まだ参加していない場合 → ニックネーム入力
  if (!hasJoined || !nickname) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0a1a] to-[#1a1a3a] p-4">
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-gray-800 w-full max-w-sm">
          <h2 className="text-xl font-bold text-center mb-2">ルーム参加</h2>
          <p className="text-gray-400 text-sm text-center mb-6">
            ルームID: <span className="font-mono text-gold">{roomId}</span>
          </p>
          <input
            type="text"
            value={nicknameInput}
            onChange={(e) => setNicknameInput(e.target.value)}
            placeholder="ニックネーム"
            maxLength={12}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition mb-4"
            onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
            autoFocus
          />
          <button
            onClick={handleJoin}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition"
          >
            参加する
          </button>
          {error && (
            <p className="mt-3 text-red-400 text-sm text-center">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // ロード中
  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">
            {isConnected ? 'ゲーム情報を読み込み中...' : 'サーバーに接続中...'}
          </p>
        </div>
      </div>
    );
  }

  // ロビー（待機中）
  if (gameState.phase === 'waiting') {
    return (
      <Lobby
        gameState={gameState}
        roomId={roomId}
        onStartGame={startGame}
        onSitAt={sitAt}
      />
    );
  }

  // ゲーム画面
  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col">
      {/* トーナメント情報 */}
      <TournamentInfo gameState={gameState} />

      {/* ポーカーテーブル */}
      <div className="flex-1 flex items-center justify-center p-2 md:p-4">
        <PokerTable gameState={gameState} />
      </div>

      {/* アクションパネル */}
      <ActionPanel
        gameState={gameState}
        onAction={sendAction}
        onUseTimeBank={useTimeBank}
      />

      {/* エラー通知 */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-900/90 border border-red-700 text-red-200 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* 勝者表示 */}
      {gameState.winners && gameState.winners.length > 0 && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border-2 border-gold rounded-2xl p-8 text-center max-w-sm mx-4">
            <div className="text-6xl mb-4">&#127942;</div>
            <h2 className="text-2xl font-bold text-gold mb-2">トーナメント優勝！</h2>
            <p className="text-xl text-white mb-6">
              {gameState.players.find(p => p.id === gameState.winners?.[0])?.nickname ?? 'Unknown'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition"
            >
              もう一度プレイ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
