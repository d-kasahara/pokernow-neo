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

  // ショーダウン時のカードマップ
  const showdownCardMap = new Map<string, { rank: string; suit: string }[]>();
  if (showdownResults) {
    for (const result of showdownResults) {
      showdownCardMap.set(result.playerId, result.cards as any);
    }
  }

  // 座席をローテーション（自分を位置0に配置）
  const getRotatedPosition = (seatIndex: number): number => {
    return (seatIndex - mySeatIndex + 9) % 9;
  };

  const totalPot = pots.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="relative w-full max-w-[800px] aspect-[16/10]">
      {/* テーブル本体 */}
      <div className="absolute inset-[8%] poker-table rounded-[50%]">
        {/* コミュニティカード */}
        <div className="absolute top-[38%] left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="flex gap-2 justify-center">
            {communityCards.map((card, i) => (
              <CardComponent key={i} card={card} size="lg" />
            ))}
            {/* 空スロット */}
            {Array.from({ length: 5 - communityCards.length }, (_, i) => (
              <div key={`empty-${i}`} className="w-20 h-28 rounded-lg border border-white/10" />
            ))}
          </div>
        </div>

        {/* ポット */}
        {totalPot > 0 && (
          <div className="absolute top-[55%] left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-black/40 rounded-full px-4 py-1.5">
              <span className="text-gold font-bold text-sm">
                Pot: {formatBB(totalPot)} BB
              </span>
            </div>
          </div>
        )}

        {/* ラウンド表示 */}
        {gameState.phase === 'playing' && (
          <div className="absolute top-[68%] left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <span className="text-white/40 text-xs uppercase tracking-wider">
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
          />
        );
      })}

      {/* ショーダウン結果 */}
      {showdownResults && showdownResults.length > 0 && (
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full mt-2">
          <div className="bg-gray-900/90 rounded-xl p-3 border border-gray-700 max-w-sm">
            <h3 className="text-xs text-gray-400 mb-1 text-center">ショーダウン</h3>
            {showdownResults.map((result, i) => {
              const player = players.find(p => p.id === result.playerId);
              return (
                <div key={i} className={`text-xs ${result.potWon > 0 ? 'text-gold' : 'text-gray-400'} flex justify-between gap-4`}>
                  <span>{player?.nickname}</span>
                  <span>{result.handName}</span>
                  {result.potWon > 0 && <span>+{formatBB(result.potWon)} BB</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
