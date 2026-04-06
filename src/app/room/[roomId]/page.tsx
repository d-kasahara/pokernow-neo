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
    soundEnabled,
    toggleSound,
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
    <div className="h-screen bg-[#0a0a1a] flex flex-col overflow-hidden">
      {/* トーナメント情報（PC: 通常表示、スマホ: 非表示） */}
      <div className="hidden sm:block">
        <TournamentInfo gameState={gameState} />
      </div>

      {/* ポーカーテーブル */}
      <div className="flex-1 flex items-center justify-center sm:p-4 min-h-0 overflow-hidden">
        <PokerTable gameState={gameState} />
      </div>

      {/* アクションパネル */}
      <div className="shrink-0">
      <ActionPanel
        gameState={gameState}
        onAction={sendAction}
        onUseTimeBank={useTimeBank}
      />
      </div>

      {/* サウンドトグルボタン */}
      <button
        onClick={toggleSound}
        className="fixed top-2 right-2 sm:top-4 sm:right-4 z-40 w-8 h-8 sm:w-10 sm:h-10 bg-gray-800/80 hover:bg-gray-700 border border-gray-600 rounded-full flex items-center justify-center text-white shadow-lg backdrop-blur-sm transition"
        title={soundEnabled ? 'サウンドをオフ' : 'サウンドをオン'}
      >
        {soundEnabled ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
        )}
      </button>

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
