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
  positionMobile: { top: string; left: string };
  positionDesktop: { top: string; left: string };
  showdownCards?: Card[] | null;
  timerPercent?: number;
  bigBlind: number;
  handName?: string;
  isMobile: boolean;
}

export function PlayerSeat({
  player,
  isMe,
  isDealer,
  isCurrentTurn,
  myCards,
  positionMobile,
  positionDesktop,
  showdownCards,
  timerPercent,
  bigBlind,
  handName,
  isMobile,
}: PlayerSeatProps) {
  if (!player) {
    // 空席
    if (isMobile) {
      return (
        <div
          className="sm:hidden absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{ top: positionMobile.top, left: positionMobile.left }}
        >
          <div className="w-12 h-6 rounded border border-dashed border-gray-700/20 flex items-center justify-center">
            <span className="text-gray-700 text-[7px]">空席</span>
          </div>
        </div>
      );
    }
    return (
      <div
        className="hidden sm:block absolute transform -translate-x-1/2 -translate-y-1/2"
        style={{ top: positionDesktop.top, left: positionDesktop.left }}
      >
        <div className="w-24 h-14 rounded-xl border-2 border-dashed border-gray-700/30 flex items-center justify-center">
          <span className="text-gray-700 text-xs">空席</span>
        </div>
      </div>
    );
  }

  const isEliminated = player.status === 'eliminated';
  const isFolded = player.status === 'folded';
  const isAllIn = player.status === 'allIn';
  const isDisconnected = !player.isConnected;

  // === スマホ版 ===
  if (isMobile) {
    return (
      <div
        className="sm:hidden absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
        style={{ top: positionMobile.top, left: positionMobile.left }}
      >
        <div className={`relative ${isEliminated ? 'opacity-40' : ''} ${isFolded ? 'opacity-50' : ''}`}>
          {/* ディーラーボタン */}
          {isDealer && (
            <div className="absolute -top-1 -left-1 w-3.5 h-3.5 bg-white text-black rounded-full flex items-center justify-center text-[7px] font-black shadow-md z-30 border border-gray-400">
              D
            </div>
          )}

          {/* プレイヤー情報ボックス */}
          <div
            className={`relative rounded-md px-1.5 py-1 min-w-[48px] text-center ${
              isCurrentTurn
                ? 'bg-gray-800 border-2 border-yellow-400 shadow-lg shadow-yellow-400/30'
                : isMe
                  ? 'bg-gray-800/95 border border-emerald-500/60'
                  : 'bg-gray-800/90 border border-gray-600/50'
            }`}
          >
            {/* ニックネーム */}
            <div className={`text-[8px] font-bold truncate max-w-[44px] leading-tight ${
              isMe ? 'text-emerald-400' : 'text-white'
            }`}>
              {player.nickname}
            </div>

            {/* チップ */}
            <div className="text-[9px] text-gold font-mono font-black leading-tight">
              {formatBB(player.chips, bigBlind)}
            </div>

            {/* ステータスバッジ */}
            {isAllIn && (
              <div className="text-[6px] text-red-400 font-black animate-pulse">ALL IN</div>
            )}
            {isFolded && (
              <div className="text-[6px] text-gray-500">FOLD</div>
            )}
            {isEliminated && (
              <div className="text-[6px] text-gray-500">OUT</div>
            )}
          </div>

          {/* 他プレイヤーのカード（自分以外のみ。自分のカードはアクションパネル横に表示） */}
          {!isMe && (
            <div className={`flex gap-px justify-center mt-0.5 ${isFolded ? 'opacity-30' : ''}`}>
              {showdownCards && showdownCards.length === 2 ? (
                <>
                  <CardComponent card={showdownCards[0]} size="sm" />
                  <CardComponent card={showdownCards[1]} size="sm" />
                </>
              ) : player.hasCards && !isFolded ? (
                <>
                  <CardComponent faceDown size="sm" />
                  <CardComponent faceDown size="sm" />
                </>
              ) : null}
            </div>
          )}

          {/* 役名表示（ショーダウン時） */}
          {handName && (
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-20">
              <div className="bg-purple-700/90 text-white text-[7px] font-bold px-1 py-0.5 rounded border border-purple-400/50">
                {handName}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // === PC版 ===
  return (
    <div
      className="hidden sm:block absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{ top: positionDesktop.top, left: positionDesktop.left }}
    >
      <div className={`relative ${isEliminated ? 'opacity-40' : ''}`}>
        {/* ディーラーボタン */}
        {isDealer && (
          <div className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-yellow-300 to-yellow-500 text-black rounded-full flex items-center justify-center text-xs font-black shadow-lg z-20 border-2 border-yellow-700">
            D
          </div>
        )}

        {/* プレイヤーカード */}
        <div className="relative">
          <div
            className={`relative z-10 rounded-xl px-3 py-2 min-w-[100px] text-center transition-all ${
              isCurrentTurn
                ? 'bg-gray-800 border-2 border-gold active-player shadow-xl shadow-gold/40'
                : isMe
                  ? 'bg-gradient-to-b from-gray-800 to-gray-900 border-2 border-emerald-500/60 shadow-lg'
                  : 'bg-gradient-to-b from-gray-800/90 to-gray-900/90 border border-gray-700 shadow-md'
            } ${isFolded ? 'opacity-50' : ''}`}
          >
            {/* ニックネーム */}
            <div className={`text-sm font-bold truncate max-w-[90px] ${
              isMe ? 'text-emerald-400' : 'text-white'
            }`}>
              {player.nickname}
              {isDisconnected && ' (切断)'}
            </div>

            {/* チップ (BB単位) */}
            <div className="text-sm text-gold font-mono font-black chip-stack">
              {formatBB(player.chips, bigBlind)} <span className="text-[10px] text-gold/70">BB</span>
            </div>

            {/* ステータス */}
            {isAllIn && (
              <div className="text-[10px] text-red-400 font-black animate-pulse tracking-wide">ALL IN</div>
            )}
            {isFolded && (
              <div className="text-[10px] text-gray-500 tracking-wide">FOLD</div>
            )}
            {isEliminated && (
              <div className="text-[10px] text-gray-500 tracking-wide">OUT</div>
            )}

            {/* 最後のアクション */}
            {player.lastAction && !isFolded && !isEliminated && !isAllIn && (
              <div className="text-[10px] text-gray-400 truncate max-w-[90px]">{player.lastAction}</div>
            )}
          </div>
        </div>

        {/* ホールカード（自分のカードはアクションパネル横に表示するのでここでは非表示） */}
        {!isMe && (
          <div className={`flex gap-1 justify-center mt-1.5 ${isFolded ? 'opacity-30' : ''}`}>
            {showdownCards && showdownCards.length === 2 ? (
              <>
                <CardComponent card={showdownCards[0]} size="md" />
                <CardComponent card={showdownCards[1]} size="md" />
              </>
            ) : player.hasCards && !isFolded ? (
              <>
                <CardComponent faceDown size="md" />
                <CardComponent faceDown size="md" />
              </>
            ) : null}
          </div>
        )}

        {/* 自分のショーダウン時のみカード表示 */}
        {isMe && showdownCards && showdownCards.length === 2 && (
          <div className={`flex gap-1 justify-center mt-1.5 ${isFolded ? 'opacity-30' : ''}`}>
            <CardComponent card={showdownCards[0]} size="md" />
            <CardComponent card={showdownCards[1]} size="md" />
          </div>
        )}

        {/* 役名表示（ショーダウン時） */}
        {handName && (
          <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-20">
            <div className="bg-gradient-to-b from-purple-600 to-purple-900 text-white text-xs font-bold px-2 py-1 rounded-lg border border-purple-400/50 shadow-xl">
              {handName}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
