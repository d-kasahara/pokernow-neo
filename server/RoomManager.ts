import { nanoid } from 'nanoid';
import { TournamentSettings } from '../src/types/game';
import { GameRoom } from './game/GameRoom';
import { ROOM_ID_LENGTH, ROOM_CLEANUP_INTERVAL_MS, ROOM_INACTIVE_TIMEOUT_MS } from './constants';

/**
 * 全ルーム管理クラス
 * ルームの作成/検索/削除を行う
 */
export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startCleanup();
  }

  // ルーム作成
  createRoom(settings?: Partial<TournamentSettings>): GameRoom {
    let roomId: string;
    do {
      roomId = nanoid(ROOM_ID_LENGTH).toUpperCase();
    } while (this.rooms.has(roomId));

    const room = new GameRoom(roomId, settings);
    this.rooms.set(roomId, room);
    return room;
  }

  // ルーム取得
  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId.toUpperCase());
  }

  // ルーム削除
  removeRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.cleanup();
      this.rooms.delete(roomId);
    }
  }

  // ルーム数
  getRoomCount(): number {
    return this.rooms.size;
  }

  // 非アクティブルームのクリーンアップ
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [roomId, room] of this.rooms) {
        if (now - room.getLastActivity() > ROOM_INACTIVE_TIMEOUT_MS) {
          console.log(`[RoomManager] 非アクティブルーム削除: ${roomId}`);
          room.cleanup();
          this.rooms.delete(roomId);
        }
      }
    }, ROOM_CLEANUP_INTERVAL_MS);
  }

  // クリーンアップ停止
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    for (const room of this.rooms.values()) {
      room.cleanup();
    }
    this.rooms.clear();
  }
}
