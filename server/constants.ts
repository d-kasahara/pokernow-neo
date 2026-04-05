import { BlindLevel } from '../src/types/game';

// デフォルトブラインドスケジュール
export const DEFAULT_BLIND_SCHEDULE: BlindLevel[] = [
  { level: 1, smallBlind: 10, bigBlind: 20, ante: 0 },
  { level: 2, smallBlind: 15, bigBlind: 30, ante: 0 },
  { level: 3, smallBlind: 25, bigBlind: 50, ante: 0 },
  { level: 4, smallBlind: 50, bigBlind: 100, ante: 10 },
  { level: 5, smallBlind: 75, bigBlind: 150, ante: 15 },
  { level: 6, smallBlind: 100, bigBlind: 200, ante: 25 },
  { level: 7, smallBlind: 150, bigBlind: 300, ante: 25 },
  { level: 8, smallBlind: 200, bigBlind: 400, ante: 50 },
  { level: 9, smallBlind: 300, bigBlind: 600, ante: 75 },
  { level: 10, smallBlind: 500, bigBlind: 1000, ante: 100 },
  { level: 11, smallBlind: 750, bigBlind: 1500, ante: 150 },
  { level: 12, smallBlind: 1000, bigBlind: 2000, ante: 200 },
];

// ルーム設定
export const ROOM_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5分ごとにクリーンアップ
export const ROOM_INACTIVE_TIMEOUT_MS = 30 * 60 * 1000; // 30分で非アクティブルーム削除

// 再接続猶予期間
export const RECONNECT_GRACE_PERIOD_MS = 10 * 1000; // 10秒

// ルームIDの長さ
export const ROOM_ID_LENGTH = 6;
