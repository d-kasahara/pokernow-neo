// カードのスート（マーク）
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

// カードのランク
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

// カード
export interface Card {
  rank: Rank;
  suit: Suit;
}

// スート表示用シンボル
export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

// スートカラー
export const SUIT_COLORS: Record<Suit, 'red' | 'black'> = {
  hearts: 'red',
  diamonds: 'red',
  clubs: 'black',
  spades: 'black',
};

// ランク一覧（昇順）
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

// スート一覧
export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

// ランク表示名
export const RANK_DISPLAY: Record<Rank, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  '7': '7', '8': '8', '9': '9', 'T': '10',
  'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A',
};

// pokersolver用フォーマット変換 (例: { rank: 'A', suit: 'spades' } -> 'As')
export function cardToPokersolverFormat(card: Card): string {
  const suitMap: Record<Suit, string> = {
    spades: 's',
    hearts: 'h',
    diamonds: 'd',
    clubs: 'c',
  };
  return card.rank + suitMap[card.suit];
}
