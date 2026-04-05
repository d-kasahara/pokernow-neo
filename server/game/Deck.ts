import { Card, Rank, Suit, RANKS, SUITS } from '../../src/types/card';

/**
 * デッキ管理クラス
 * Fisher-Yatesシャッフルでカードを混ぜ、1枚ずつ配る
 */
export class Deck {
  private cards: Card[] = [];

  constructor() {
    this.reset();
  }

  // デッキをリセット（52枚の新しいデッキ）
  reset(): void {
    this.cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push({ rank, suit });
      }
    }
    this.shuffle();
  }

  // Fisher-Yatesシャッフル
  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  // カードを1枚引く
  deal(): Card {
    const card = this.cards.pop();
    if (!card) {
      throw new Error('デッキにカードがありません');
    }
    return card;
  }

  // 複数枚引く
  dealMultiple(count: number): Card[] {
    const cards: Card[] = [];
    for (let i = 0; i < count; i++) {
      cards.push(this.deal());
    }
    return cards;
  }

  // 残りカード数
  get remaining(): number {
    return this.cards.length;
  }
}
