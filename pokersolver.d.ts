// pokersolver の型定義
declare module 'pokersolver' {
  export class Hand {
    name: string;
    descr: string;
    rank: number;
    cards: { value: string; suit: string }[];

    static solve(cards: string[]): Hand;
    static winners(hands: Hand[]): Hand[];

    toString(): string;
  }
}
