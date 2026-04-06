import { BlindLevel } from '../src/types/game';

// デフォルトブラインドスケジュール（ROOTS ANNIVERSARY準拠）
// BBアンティ = BB額、Starting Stack: 30,000
export const DEFAULT_BLIND_SCHEDULE: BlindLevel[] = [
  { level: 1,  smallBlind: 100,    bigBlind: 200,     ante: 200 },
  { level: 2,  smallBlind: 200,    bigBlind: 400,     ante: 400 },
  { level: 3,  smallBlind: 300,    bigBlind: 600,     ante: 600 },
  { level: 4,  smallBlind: 400,    bigBlind: 800,     ante: 800 },
  { level: 5,  smallBlind: 500,    bigBlind: 1000,    ante: 1000 },
  { level: 6,  smallBlind: 700,    bigBlind: 1400,    ante: 1400 },
  // Break
  { level: 7,  smallBlind: 1000,   bigBlind: 2000,    ante: 2000 },
  { level: 8,  smallBlind: 1500,   bigBlind: 2500,    ante: 2500 },
  { level: 9,  smallBlind: 2000,   bigBlind: 4000,    ante: 4000 },
  { level: 10, smallBlind: 3000,   bigBlind: 6000,    ante: 6000 },
  { level: 11, smallBlind: 5000,   bigBlind: 10000,   ante: 10000 },
  { level: 12, smallBlind: 7000,   bigBlind: 14000,   ante: 14000 },
  { level: 13, smallBlind: 10000,  bigBlind: 20000,   ante: 20000 },
  { level: 14, smallBlind: 15000,  bigBlind: 30000,   ante: 30000 },
  { level: 15, smallBlind: 25000,  bigBlind: 50000,   ante: 50000 },
  { level: 16, smallBlind: 50000,  bigBlind: 100000,  ante: 100000 },
  { level: 17, smallBlind: 100000, bigBlind: 200000,  ante: 200000 },
];

// ルーム設定
export const ROOM_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5分ごとにクリーンアップ
export const ROOM_INACTIVE_TIMEOUT_MS = 30 * 60 * 1000; // 30分で非アクティブルーム削除

// 再接続猶予期間
export const RECONNECT_GRACE_PERIOD_MS = 10 * 1000; // 10秒

// ルームIDの長さ
export const ROOM_ID_LENGTH = 6;
