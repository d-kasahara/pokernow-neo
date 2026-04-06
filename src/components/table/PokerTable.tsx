'use client';

import { ClientGameState } from '../../types/game';
import { PlayerSeat } from './PlayerSeat';
import { CardComponent } from './Card';

interface PokerTableProps {
  gameState: ClientGameState;
}

// PC用: 楕円テーブル上のパーセント座標
const SEAT_POSITIONS_DESKTOP = [
  { top: '88%', left: '50%' },   // 0: 下部中央 (自分)
  { top: '78%', left: '12%' },   // 1: 左下
  { top: '48%', left: '3%' },    // 2: 左
  { top: '18%', left: '12%' },   // 3: 左上
  { top: '5%', left: '35%' },    // 4: 上部左
  { top: '5%', left: '65%' },    // 5: 上部右
  { top: '18%', left: '88%' },   // 6: 右上
  { top: '48%', left: '97%' },   // 7: 右
  { top: '78%', left: '88%' },   // 8: 右下
];

// スマホ用: 角丸長方形テーブル上の座標
const SEAT_POSITIONS_MOBILE = [
  { top: '92%', left: '50%' },   // 0: 下部中央 (自分)
  { top: '80%', left: '8%' },    // 1: 左下
  { top: '50%', left: '3%' },    // 2: 左
  { top: '20%', left: '8%' },    // 3: 左上
  { top: '5%', left: '32%' },    // 4: 上部左
  { top: '5%', left: '68%' },    // 5: 上部右
  { top: '20%', left: '92%' },   // 6: 右上
  { top: '50%', left: '97%' },   // 7: 右
  { top: '80%', left: '92%' },   // 8: 右下
];

// ベットチップの位置（テーブル内側に配置）
const BET_POSITIONS_MOBILE = [
  { top: '78%', left: '50%' },   // 0
  { top: '70%', left: '22%' },   // 1
  { top: '50%', left: '16%' },   // 2
  { top: '30%', left: '22%' },   // 3
  { top: '18%', left: '38%' },   // 4
  { top: '18%', left: '62%' },   // 5
  { top: '30%', left: '78%' },   // 6
  { top: '50%', left: '84%' },   // 7
  { top: '70%', left: '78%' },   // 8
];

const BET_POSITIONS_DESKTOP = [
  { top: '76%', left: '50%' },   // 0
  { top: '68%', left: '22%' },   // 1
  { top: '48%', left: '15%' },   // 2
  { top: '28%', left: '22%' },   // 3
  { top: '18%', left: '40%' },   // 4
  { top: '18%', left: '60%' },   // 5
  { top: '28%', left: '78%' },   // 6
  { top: '48%', left: '85%' },   // 7
  { top: '68%', left: '78%' },   // 8
];

// BB単位でフォーマット
function formatBB(amount: number, bigBlind: number): string {
  if (bigBlind === 0) return amount.toLocaleString();
  const bb = amount / bigBlind;
  return bb % 1 === 0 ? `${bb}` : `${bb.toFixed(1)}`;
}

export function PokerTable({ gameState }: PokerTableProps) {
  const { players, myPlayerId, myCards, communityCards, pots, dealerIndex, currentPlayerIndex, showdownResults, blindLevel } = gameState;
  const bigBlind = blindLevel.bigBlind;

  const myPlayer = players.find(p => p.id === myPlayerId);
  const mySeatIndex = myPlayer?.seatIndex ?? 0;

  // ショーダウン時のカード・役名マップ
  const showdownCardMap = new Map<string, { rank: string; suit: string }[]>();
  const handNameMap = new Map<string, string>();
  if (showdownResults) {
    for (const result of showdownResults) {
      showdownCardMap.set(result.playerId, result.cards as any);
      handNameMap.set(result.playerId, result.handName);
    }
  }

  const totalPot = pots.reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      {/* === スマホ版 === */}
      <div className="sm:hidden relative w-full" style={{ height: 'calc(100vh - 120px)' }}>
        {/* テーブル本体（角丸長方形） */}
        <div className="absolute inset-3 rounded-3xl poker-table-mobile">
          {/* ブラインド情報（テーブル中央） */}
          <div className="absolute top-[52%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="text-white/40 text-[10px] font-semibold tracking-wider uppercase">
              NLH ~ {blindLevel.smallBlind.toLocaleString()}/{blindLevel.bigBlind.toLocaleString()}
            </div>
          </div>

          {/* コミュニティカード */}
          <div className="absolute top-[38%] left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="flex gap-1 justify-center">
              {communityCards.map((card, i) => (
                <CardComponent key={i} card={card} size="sm" />
              ))}
              {/* 空スロット */}
              {Array.from({ length: 5 - communityCards.length }, (_, i) => (
                <div
                  key={`empty-${i}`}
                  className="w-10 h-14 rounded-md border border-white/10 border-dashed"
                />
              ))}
            </div>
          </div>

          {/* ポット */}
          {totalPot > 0 && (
            <div className="absolute top-[48%] left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="bg-black/50 rounded-full px-3 py-0.5 border border-gray-600/40">
                <span className="text-gray-300 text-[10px] font-semibold whitespace-nowrap">
                  total <span className="text-white font-bold">{formatBB(totalPot, bigBlind)}</span>
                </span>
              </div>
            </div>
          )}

          {/* ベットチップ表示 */}
          {Array.from({ length: 9 }, (_, posIndex) => {
            const actualSeatIndex = (posIndex + mySeatIndex) % 9;
            const player = players.find(p => p.seatIndex === actualSeatIndex);
            if (!player || player.bet <= 0) return null;
            const betPos = BET_POSITIONS_MOBILE[posIndex];
            return (
              <div
                key={`bet-${posIndex}`}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
                style={{ top: betPos.top, left: betPos.left }}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg border-2 border-yellow-300/60">
                  <span className="text-[10px] text-black font-black">
                    {formatBB(player.bet, bigBlind)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* プレイヤー座席 */}
        {Array.from({ length: 9 }, (_, posIndex) => {
          const actualSeatIndex = (posIndex + mySeatIndex) % 9;
          const player = players.find(p => p.seatIndex === actualSeatIndex);

          return (
            <PlayerSeat
              key={posIndex}
              player={player ?? null}
              isMe={player?.id === myPlayerId}
              isDealer={actualSeatIndex === dealerIndex}
              isCurrentTurn={actualSeatIndex === currentPlayerIndex}
              myCards={player?.id === myPlayerId ? myCards : null}
              positionMobile={SEAT_POSITIONS_MOBILE[posIndex]}
              positionDesktop={SEAT_POSITIONS_DESKTOP[posIndex]}
              showdownCards={player ? (showdownCardMap.get(player.id) as any) : null}
              bigBlind={bigBlind}
              handName={player ? handNameMap.get(player.id) : undefined}
              isMobile={true}
            />
          );
        })}

        {/* ショーダウン結果 */}
        {showdownResults && showdownResults.length > 0 && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-30 w-[90%]">
            <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl p-2.5 border-2 border-gold/60 shadow-2xl">
              <h3 className="text-[10px] text-gold font-bold mb-1 text-center tracking-[0.2em] uppercase">ショーダウン</h3>
              <div className="space-y-0.5">
                {showdownResults.map((result, i) => {
                  const player = players.find(p => p.id === result.playerId);
                  const isWinner = result.potWon > 0;
                  return (
                    <div
                      key={i}
                      className={`text-[11px] flex justify-between items-center gap-2 px-2 py-0.5 rounded ${
                        isWinner ? 'bg-gold/20 border border-gold/40' : 'bg-gray-800/50'
                      }`}
                    >
                      <span className={`font-bold truncate ${isWinner ? 'text-gold' : 'text-gray-300'}`}>
                        {player?.nickname}
                      </span>
                      <span className={`font-semibold whitespace-nowrap ${isWinner ? 'text-white' : 'text-gray-400'}`}>
                        {result.handName}
                      </span>
                      {isWinner && (
                        <span className="text-gold font-black whitespace-nowrap">+{formatBB(result.potWon, bigBlind)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* === PC版（既存デザイン） === */}
      <div className="hidden sm:block relative w-full max-w-[1100px] aspect-[16/10]">
        {/* テーブル本体 */}
        <div className="absolute inset-[6%] poker-table rounded-[50%]">
          {/* コミュニティカード */}
          <div className="absolute top-[38%] left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="flex gap-2.5 justify-center">
              {communityCards.map((card, i) => (
                <CardComponent key={i} card={card} size="xl" />
              ))}
              {Array.from({ length: 5 - communityCards.length }, (_, i) => (
                <div
                  key={`empty-${i}`}
                  className="w-28 h-40 rounded-xl border-2 border-white/10 border-dashed"
                />
              ))}
            </div>
          </div>

          {/* ポット */}
          {totalPot > 0 && (
            <div className="absolute top-[62%] left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="bg-black/60 backdrop-blur-sm rounded-full px-5 py-2 border border-yellow-600/40 shadow-lg">
                <span className="text-gold font-bold text-base whitespace-nowrap">
                  POT: {formatBB(totalPot, bigBlind)} BB
                </span>
              </div>
            </div>
          )}

          {/* ラウンド表示 */}
          {gameState.phase === 'playing' && (
            <div className="absolute top-[72%] left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <span className="text-white/50 text-sm uppercase tracking-[0.3em] font-semibold">
                {gameState.round}
              </span>
            </div>
          )}

          {/* ベットチップ表示 (PC) */}
          {Array.from({ length: 9 }, (_, posIndex) => {
            const actualSeatIndex = (posIndex + mySeatIndex) % 9;
            const player = players.find(p => p.seatIndex === actualSeatIndex);
            if (!player || player.bet <= 0) return null;
            const betPos = BET_POSITIONS_DESKTOP[posIndex];
            return (
              <div
                key={`bet-desktop-${posIndex}`}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
                style={{ top: betPos.top, left: betPos.left }}
              >
                <div className="bg-gradient-to-b from-yellow-600 to-yellow-800 px-3 py-1 rounded-full border border-yellow-400/60 shadow-lg">
                  <span className="text-sm text-white font-mono font-black whitespace-nowrap drop-shadow">
                    {formatBB(player.bet, bigBlind)} BB
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* プレイヤー座席 */}
        {Array.from({ length: 9 }, (_, posIndex) => {
          const actualSeatIndex = (posIndex + mySeatIndex) % 9;
          const player = players.find(p => p.seatIndex === actualSeatIndex);

          return (
            <PlayerSeat
              key={posIndex}
              player={player ?? null}
              isMe={player?.id === myPlayerId}
              isDealer={actualSeatIndex === dealerIndex}
              isCurrentTurn={actualSeatIndex === currentPlayerIndex}
              myCards={player?.id === myPlayerId ? myCards : null}
              positionMobile={SEAT_POSITIONS_MOBILE[posIndex]}
              positionDesktop={SEAT_POSITIONS_DESKTOP[posIndex]}
              showdownCards={player ? (showdownCardMap.get(player.id) as any) : null}
              bigBlind={bigBlind}
              handName={player ? handNameMap.get(player.id) : undefined}
              isMobile={false}
            />
          );
        })}

        {/* ショーダウン結果 */}
        {showdownResults && showdownResults.length > 0 && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
            <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl p-4 border-2 border-gold/60 shadow-2xl min-w-[320px]">
              <h3 className="text-sm text-gold font-bold mb-2 text-center tracking-[0.2em] uppercase">ショーダウン</h3>
              <div className="space-y-1.5">
                {showdownResults.map((result, i) => {
                  const player = players.find(p => p.id === result.playerId);
                  const isWinner = result.potWon > 0;
                  return (
                    <div
                      key={i}
                      className={`text-sm flex justify-between items-center gap-4 px-3 py-1.5 rounded-lg ${
                        isWinner ? 'bg-gold/20 border border-gold/40' : 'bg-gray-800/50'
                      }`}
                    >
                      <span className={`font-bold truncate ${isWinner ? 'text-gold' : 'text-gray-300'}`}>
                        {player?.nickname}
                      </span>
                      <span className={`font-semibold whitespace-nowrap ${isWinner ? 'text-white' : 'text-gray-400'}`}>
                        {result.handName}
                      </span>
                      {isWinner && (
                        <span className="text-gold font-black whitespace-nowrap">+{formatBB(result.potWon, bigBlind)} BB</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
