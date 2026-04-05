'use client';

import { ClientGameState } from '../../types/game';
import { PlayerSeat } from './PlayerSeat';
import { CardComponent } from './Card';

interface PokerTableProps {
  gameState: ClientGameState;
}

// 9人用の座席位置（楕円形テーブル上のパーセント座標）
// 自分（myPlayerId）を下部中央に配置するためにローテーション
const SEAT_POSITIONS = [
  { top: '88%', left: '50%' },   // 0: 下部中央 (自分)
  { top: '78%', left: '15%' },   // 1: 左下
  { top: '50%', left: '5%' },    // 2: 左
  { top: '22%', left: '15%' },   // 3: 左上
  { top: '10%', left: '35%' },   // 4: 上部左
  { top: '10%', left: '65%' },   // 5: 上部右
  { top: '22%', left: '85%' },   // 6: 右上
  { top: '50%', left: '95%' },   // 7: 右
  { top: '78%', left: '85%' },   // 8: 右下
];

export function PokerTable({ gameState }: PokerTableProps) {
  const { players, myPlayerId, myCards, communityCards, pots, dealerIndex, currentPlayerIndex, showdownResults, blindLevel } = gameState;
  const bigBlind = blindLevel.bigBlind;

  // BB単位でフォーマット
  const formatBB = (amount: number): string => {
    if (bigBlind === 0) return amount.toLocaleString();
    const bb = amount / bigBlind;
    return bb % 1 === 0 ? `${bb}` : `${bb.toFixed(1)}`;
  };

  // 自分の席インデックスを基準にローテーション
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

  // 座席をローテーション（自分を位置0に配置）
  const getRotatedPosition = (seatIndex: number): number => {
    return (seatIndex - mySeatIndex + 9) % 9;
  };

  const totalPot = pots.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="relative w-full max-w-[1100px] aspect-[16/10]">
      {/* テーブル本体 */}
      <div className="absolute inset-[6%] poker-table rounded-[50%]">
        {/* コミュニティカード */}
        <div className="absolute top-[38%] left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="flex gap-2.5 justify-center">
            {communityCards.map((card, i) => (
              <CardComponent key={i} card={card} size="xl" />
            ))}
            {/* 空スロット */}
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
              <span className="text-gold font-bold text-base">
                POT: {formatBB(totalPot)} BB
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
      </div>

      {/* プレイヤー座席 */}
      {Array.from({ length: 9 }, (_, posIndex) => {
        // posIndex = テーブル上の位置 (0=下部中央, ...)
        // 実際のseatIndex = (posIndex + mySeatIndex) % 9
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
            position={SEAT_POSITIONS[posIndex]}
            showdownCards={player ? (showdownCardMap.get(player.id) as any) : null}
            bigBlind={bigBlind}
            handName={player ? handNameMap.get(player.id) : undefined}
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
                    <span className={`font-bold ${isWinner ? 'text-gold' : 'text-gray-300'}`}>
                      {player?.nickname}
                    </span>
                    <span className={`font-semibold ${isWinner ? 'text-white' : 'text-gray-400'}`}>
                      {result.handName}
                    </span>
                    {isWinner && (
                      <span className="text-gold font-black">+{formatBB(result.potWon)} BB</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
