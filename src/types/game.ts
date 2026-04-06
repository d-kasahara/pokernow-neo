import { Card } from './card';
import { ServerPlayer, ClientPlayer } from './player';
import { AvailableActions } from './action';

// ゲームフェーズ
export type GamePhase = 'waiting' | 'playing' | 'finished';

// ベッティングラウンド
export type BettingRound = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

// ポット情報
export interface Pot {
  amount: number;
  eligiblePlayerIds: string[]; // このポットの対象プレイヤー
}

// ショーダウン結果
export interface ShowdownResult {
  playerId: string;
  cards: Card[];
  handName: string;    // 例: "Full House"
  potWon: number;
}

// トーナメント設定
export interface TournamentSettings {
  startingChips: number;        // 初期チップ (デフォルト: 10000)
  blindLevelDuration: number;   // ブラインドレベル持続時間（秒）
  actionTimeout: number;        // アクションタイムアウト（秒）
  maxPlayers: number;           // 最大プレイヤー数 (2-9)
  timeBankCount: number;        // タイムバンク回数
  timeBankSeconds: number;      // タイムバンク1回あたりの延長秒数
  blindSchedule: BlindLevel[];  // カスタムブラインドスケジュール
}

// デフォルト設定（ROOTS ANNIVERSARY準拠）
export const DEFAULT_TOURNAMENT_SETTINGS: TournamentSettings = {
  startingChips: 30000,
  blindLevelDuration: 1200, // 20分
  actionTimeout: 30,
  maxPlayers: 9,
  timeBankCount: 3,
  timeBankSeconds: 30,
  blindSchedule: [],  // 空=デフォルトスケジュール使用
};

// ブラインドレベル
export interface BlindLevel {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
}

// サーバー側ゲーム状態（完全情報）
export interface ServerGameState {
  roomId: string;
  phase: GamePhase;
  players: ServerPlayer[];
  communityCards: Card[];
  pots: Pot[];
  dealerIndex: number;
  currentPlayerIndex: number;
  currentBet: number;
  round: BettingRound;
  blindLevel: BlindLevel;
  blindTimerRemaining: number; // 次レベルまでの残り秒数
  handNumber: number;
  settings: TournamentSettings;
}

// クライアント側ゲーム状態（フィルタ済み）
export interface ClientGameState {
  roomId: string;
  phase: GamePhase;
  players: ClientPlayer[];
  myPlayerId: string | null;
  myCards: Card[] | null;
  communityCards: Card[];
  pots: Pot[];
  dealerIndex: number;
  currentPlayerIndex: number;
  currentBet: number;
  round: BettingRound;
  blindLevel: BlindLevel;
  blindTimerRemaining: number;
  handNumber: number;
  settings: TournamentSettings;
  availableActions: AvailableActions | null; // 自分のターンの場合のみ
  showdownResults: ShowdownResult[] | null;
  winners: string[] | null; // トーナメント勝者
  // タイマー情報
  actionTimerRemaining: number;  // 残りアクション秒数
  actionTimerTotal: number;      // 合計アクション秒数（タイムバンク含む）
  myTimeBankRemaining: number;   // 自分の残りタイムバンク回数
}
