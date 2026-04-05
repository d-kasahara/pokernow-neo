import { Card } from './card';

// プレイヤーの状態
export type PlayerStatus =
  | 'waiting'      // ロビーで待機中
  | 'active'       // ゲーム中（ハンドに参加中）
  | 'folded'       // フォールド済み
  | 'allIn'        // オールイン
  | 'eliminated'   // トーナメント脱落
  | 'disconnected'; // 切断

// サーバー側プレイヤー（全情報保持）
export interface ServerPlayer {
  id: string;          // ソケットIDベースの一意ID
  nickname: string;
  seatIndex: number;   // 0-8
  chips: number;
  bet: number;         // 現在のベッティングラウンドでのベット額
  holeCards: Card[];   // ホールカード（2枚）
  status: PlayerStatus;
  isHost: boolean;
  isConnected: boolean;
  lastAction?: string; // 最後のアクション表示用
  timeBankRemaining: number; // 残りタイムバンク回数
}

// クライアント側プレイヤー（他人のカードは非表示）
export interface ClientPlayer {
  id: string;
  nickname: string;
  seatIndex: number;
  chips: number;
  bet: number;
  hasCards: boolean;    // カードを持っているか（他人のカードは見えない）
  status: PlayerStatus;
  isHost: boolean;
  isConnected: boolean;
  lastAction?: string;
  timeBankRemaining: number;
}
