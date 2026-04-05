'use client';

import { ClientPlayer } from '../../types/player';
import { Card } from '../../types/card';
import { CardComponent } from './Card';

// BB単位でフォーマット
function formatBB(amount: number, bigBlind: number): string {
  if (bigBlind === 0) return amount.toLocaleString();
  const bb = amount / bigBlind;
  // 整数ならそのまま、小数なら1桁まで
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
}: PlayerSeatProps) {
  if (!player) {
    // 空席
    return (
      <div
        className="absolute transform -translate-x-1/2 -translate-y-1/2"
        style={{ top: position.top, left: position.left }}
      >
        <div className="w-24 h-16 rounded-xl border-2 border-dashed border-gray-700/30 flex items-center justify-center">
          <span className="text-gray-700 text-xs">空席</span>
        </div>
      </div>
    );
  }

  const isEliminated = player.status === 'eliminated';
  const isFolded = player.status === 'folded';
  const isAllIn = player.status === 'allIn';
  const isDisconnected = !player.isConnected;

  // 自分のカードはmdサイズ、他はsmサイズ
  const cardSize = isMe ? 'md' : 'sm';

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{ top: position.top, left: position.left }}
    >
      <div className={`relative ${isEliminated ? 'opacity-40' : ''}`}>
        {/* ディーラーボタン */}
        {isDealer && (
          <div className="absolute -top-3 -right-3 w-7 h-7 bg-yellow-400 text-black rounded-full flex items-center justify-center text-xs font-bold shadow-lg z-10 border-2 border-yellow-600">
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
            className={`relative z-10 rounded-xl px-3 py-2 min-w-[90px] text-center transition-all ${
              isCurrentTurn
                ? 'bg-gray-800 border-2 border-gold active-player shadow-lg shadow-gold/30'
                : isMe
                  ? 'bg-gray-800/90 border-2 border-emerald-500/50'
                  : 'bg-gray-800/80 border border-gray-700'
            } ${isFolded ? 'opacity-50' : ''}`}
          >
            {/* ニックネーム */}
            <div className={`text-sm font-semibold truncate max-w-[90px] ${
              isMe ? 'text-emerald-400' : 'text-white'
            }`}>
              {player.nickname}
              {isDisconnected && ' (切断)'}
            </div>

            {/* チップ (BB単位) */}
            <div className="text-sm text-gold font-mono font-bold chip-stack">
              {formatBB(player.chips, bigBlind)} BB
            </div>

            {/* ステータス */}
            {isAllIn && (
              <div className="text-xs text-red-400 font-bold mt-0.5 animate-pulse">ALL IN</div>
            )}
            {isFolded && (
              <div className="text-xs text-gray-500 mt-0.5">FOLD</div>
            )}
            {isEliminated && (
              <div className="text-xs text-gray-500 mt-0.5">OUT</div>
            )}

            {/* 最後のアクション */}
            {player.lastAction && !isFolded && !isEliminated && !isAllIn && (
              <div className="text-[10px] text-gray-400 mt-0.5">{player.lastAction}</div>
            )}
          </div>
        </div>

        {/* ベット表示 (BB単位) */}
        {player.bet > 0 && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
            <div className="bg-gray-900/80 px-2 py-0.5 rounded-full border border-yellow-600/50">
              <span className="text-xs text-yellow-300 font-mono font-bold whitespace-nowrap">
                {formatBB(player.bet, bigBlind)} BB
              </span>
            </div>
          </div>
        )}

        {/* ホールカード */}
        <div className={`flex gap-1 justify-center mt-1.5 ${isFolded ? 'opacity-30' : ''}`}>
          {isMe && myCards && myCards.length === 2 ? (
            // 自分のカード（大きく表示）
            <>
              <CardComponent card={myCards[0]} size={cardSize} />
              <CardComponent card={myCards[1]} size={cardSize} />
            </>
          ) : showdownCards && showdownCards.length === 2 ? (
            // ショーダウン時の相手のカード
            <>
              <CardComponent card={showdownCards[0]} size="sm" />
              <CardComponent card={showdownCards[1]} size="sm" />
            </>
          ) : player.hasCards && !isFolded ? (
            // 他プレイヤーのカード（裏面）
            <>
              <CardComponent faceDown size="sm" />
              <CardComponent faceDown size="sm" />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
