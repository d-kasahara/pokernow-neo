'use client';

import { ClientPlayer } from '../../types/player';
import { Card } from '../../types/card';
import { CardComponent } from './Card';

// BB単位でフォーマット
function formatBB(amount: number, bigBlind: number): string {
  if (bigBlind === 0) return amount.toLocaleString();
  const bb = amount / bigBlind;
  return bb % 1 === 0 ? `${bb}` : `${bb.toFixed(1)}`;
}

interface PlayerSeatProps {
  player: ClientPlayer | null;
  isMe: boolean;
  isDealer: boolean;
  isCurrentTurn: boolean;
  myCards?: Card[] | null;
  position: { top: string; left: string };
  showdownCards?: Card[] | null;
  timerPercent?: number; // 0-100 残り時間の割合
  bigBlind: number; // BB単位表示用
  handName?: string; // ショーダウン時の役名
}

export function PlayerSeat({
  player,
  isMe,
  isDealer,
  isCurrentTurn,
  myCards,
  position,
  showdownCards,
  timerPercent,
  bigBlind,
  handName,
}: PlayerSeatProps) {
  if (!player) {
    // 空席
    return (
      <div
        className="absolute transform -translate-x-1/2 -translate-y-1/2"
        style={{ top: position.top, left: position.left }}
      >
        <div className="w-28 h-18 rounded-xl border-2 border-dashed border-gray-700/30 flex items-center justify-center">
          <span className="text-gray-700 text-xs">空席</span>
        </div>
      </div>
    );
  }

  const isEliminated = player.status === 'eliminated';
  const isFolded = player.status === 'folded';
  const isAllIn = player.status === 'allIn';
  const isDisconnected = !player.isConnected;

  // 自分のカードはlgサイズ、他はmdサイズ
  const cardSize = isMe ? 'lg' : 'md';

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{ top: position.top, left: position.left }}
    >
      <div className={`relative ${isEliminated ? 'opacity-40' : ''}`}>
        {/* ディーラーボタン */}
        {isDealer && (
          <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br from-yellow-300 to-yellow-500 text-black rounded-full flex items-center justify-center text-sm font-black shadow-lg z-20 border-2 border-yellow-700">
            D
          </div>
        )}

        {/* プレイヤーカード */}
        <div className="relative">
          {/* タイマーリング（自分のターン時） */}
          {isCurrentTurn && timerPercent !== undefined && (
            <div className="absolute -inset-1 rounded-2xl overflow-hidden z-0">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <rect
                  x="0" y="0" width="100" height="100" rx="12" ry="12"
                  fill="none"
                  stroke={timerPercent < 25 ? '#ef4444' : timerPercent < 50 ? '#f59e0b' : '#10b981'}
                  strokeWidth="3"
                  strokeDasharray={`${timerPercent * 3.6} ${360 - timerPercent * 3.6}`}
                  className="transition-all duration-1000"
                />
              </svg>
            </div>
          )}

          <div
            className={`relative z-10 rounded-xl px-4 py-2.5 min-w-[120px] text-center transition-all ${
              isCurrentTurn
                ? 'bg-gray-800 border-2 border-gold active-player shadow-xl shadow-gold/40'
                : isMe
                  ? 'bg-gradient-to-b from-gray-800 to-gray-900 border-2 border-emerald-500/60 shadow-lg'
                  : 'bg-gradient-to-b from-gray-800/90 to-gray-900/90 border border-gray-700 shadow-md'
            } ${isFolded ? 'opacity-50' : ''}`}
          >
            {/* ニックネーム */}
            <div className={`text-sm font-bold truncate max-w-[110px] ${
              isMe ? 'text-emerald-400' : 'text-white'
            }`}>
              {player.nickname}
              {isDisconnected && ' (切断)'}
            </div>

            {/* チップ (BB単位) */}
            <div className="text-base text-gold font-mono font-black chip-stack mt-0.5">
              {formatBB(player.chips, bigBlind)} <span className="text-xs text-gold/70">BB</span>
            </div>

            {/* ステータス */}
            {isAllIn && (
              <div className="text-xs text-red-400 font-black mt-1 animate-pulse tracking-wide">ALL IN</div>
            )}
            {isFolded && (
              <div className="text-xs text-gray-500 mt-1 tracking-wide">FOLD</div>
            )}
            {isEliminated && (
              <div className="text-xs text-gray-500 mt-1 tracking-wide">OUT</div>
            )}

            {/* 最後のアクション */}
            {player.lastAction && !isFolded && !isEliminated && !isAllIn && (
              <div className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[110px]">{player.lastAction}</div>
            )}
          </div>
        </div>

        {/* ベット表示 (BB単位) */}
        {player.bet > 0 && (
          <div className="absolute -bottom-7 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-gradient-to-b from-yellow-600 to-yellow-800 px-3 py-1 rounded-full border border-yellow-400/60 shadow-lg">
              <span className="text-sm text-white font-mono font-black whitespace-nowrap drop-shadow">
                {formatBB(player.bet, bigBlind)} BB
              </span>
            </div>
          </div>
        )}

        {/* ホールカード */}
        <div className={`flex gap-1.5 justify-center mt-2 ${isFolded ? 'opacity-30' : ''}`}>
          {isMe && myCards && myCards.length === 2 ? (
            // 自分のカード（大きく表示）
            <>
              <CardComponent card={myCards[0]} size={cardSize} />
              <CardComponent card={myCards[1]} size={cardSize} />
            </>
          ) : showdownCards && showdownCards.length === 2 ? (
            // ショーダウン時の相手のカード
            <>
              <CardComponent card={showdownCards[0]} size="md" />
              <CardComponent card={showdownCards[1]} size="md" />
            </>
          ) : player.hasCards && !isFolded ? (
            // 他プレイヤーのカード（裏面）
            <>
              <CardComponent faceDown size="md" />
              <CardComponent faceDown size="md" />
            </>
          ) : null}
        </div>

        {/* 役名表示（ショーダウン時） */}
        {handName && (
          <div className="absolute -bottom-14 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-20">
            <div className="bg-gradient-to-b from-purple-600 to-purple-900 text-white text-sm font-bold px-3 py-1.5 rounded-lg border border-purple-400/50 shadow-xl">
              {handName}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
