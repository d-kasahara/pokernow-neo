import { Hand } from 'pokersolver';
import { Card, cardToPokersolverFormat } from '../../src/types/card';

// ハンド評価結果
export interface HandResult {
  playerId: string;
  hand: Hand;
  handName: string;
  cards: Card[];
}

/**
 * ハンド評価クラス
 * pokersolver ラッパー
 */
export class HandEvaluator {
  // プレイヤーのベストハンドを評価
  static evaluate(holeCards: Card[], communityCards: Card[]): Hand {
    const allCards = [...holeCards, ...communityCards].map(cardToPokersolverFormat);
    return Hand.solve(allCards);
  }

  // 複数プレイヤーから勝者を決定
  static determineWinners(
    players: { id: string; holeCards: Card[] }[],
    communityCards: Card[]
  ): HandResult[] {
    const hands = players.map(player => {
      const hand = this.evaluate(player.holeCards, communityCards);
      return {
        playerId: player.id,
        hand,
        handName: hand.descr,
        cards: player.holeCards,
      };
    });

    // pokersolver.Hand.winners() で勝者を決定（スプリットポット対応）
    const winningHands = Hand.winners(hands.map(h => h.hand));

    // 勝者のHandオブジェクトに一致するプレイヤーを返す
    return hands.filter(h =>
      winningHands.some(w => w === h.hand)
    );
  }
}
