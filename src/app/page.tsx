'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');

  // ルーム作成
  const handleCreateRoom = async () => {
    if (!nickname.trim()) {
      setError('ニックネームを入力してください');
      return;
    }
    setIsCreating(true);
    setError('');

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim() }),
      });
      const data = await res.json();
      if (data.roomId) {
        // ニックネームをセッションストレージに保存
        sessionStorage.setItem('poker_nickname', nickname.trim());
        router.push(`/room/${data.roomId}`);
      }
    } catch {
      setError('ルーム作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  // ルーム参加
  const handleJoinRoom = () => {
    if (!nickname.trim()) {
      setError('ニックネームを入力してください');
      return;
    }
    if (!joinRoomId.trim()) {
      setError('ルームIDを入力してください');
      return;
    }
    sessionStorage.setItem('poker_nickname', nickname.trim());
    router.push(`/room/${joinRoomId.trim().toUpperCase()}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0a1a] to-[#1a1a3a] p-4">
      <div className="w-full max-w-md">
        {/* ロゴ・タイトル */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2">
            <span className="text-white">Poker</span>
            <span className="text-gold">Now</span>
            <span className="text-emerald-400"> Neo</span>
          </h1>
          <p className="text-gray-400 text-sm">
            会員登録不要 - 最大9人でポーカートーナメント
          </p>
        </div>

        {/* メインカード */}
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-gray-800">
          {/* ニックネーム入力 */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">ニックネーム</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="あなたの名前"
              maxLength={12}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  mode === 'create' ? handleCreateRoom() : handleJoinRoom();
                }
              }}
            />
          </div>

          {/* タブ切り替え */}
          <div className="flex mb-6 bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => setMode('create')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                mode === 'create'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ルームを作成
            </button>
            <button
              onClick={() => setMode('join')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                mode === 'join'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ルームに参加
            </button>
          </div>

          {/* 作成モード */}
          {mode === 'create' && (
            <button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-600/25"
            >
              {isCreating ? '作成中...' : 'ルームを作成して開始'}
            </button>
          )}

          {/* 参加モード */}
          {mode === 'join' && (
            <div className="space-y-3">
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                placeholder="ルームID (例: ABC123)"
                maxLength={6}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition tracking-widest text-center text-lg font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleJoinRoom();
                }}
              />
              <button
                onClick={handleJoinRoom}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-600/25"
              >
                ル��ムに参加
              </button>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <p className="mt-4 text-red-400 text-sm text-center">{error}</p>
          )}
        </div>

        {/* フッター情報 */}
        <div className="text-center mt-6 space-y-2">
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
            <span>Texas Hold&apos;em</span>
            <span>|</span>
            <span>最大9人</span>
            <span>|</span>
            <span>トーナメント形式</span>
          </div>
        </div>
      </div>
    </div>
  );
}
