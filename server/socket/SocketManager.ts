import { Server, Socket } from 'socket.io';
import { RoomManager } from '../RoomManager';
import { CLIENT_EVENTS, SERVER_EVENTS } from './events';
import { PlayerAction } from '../../src/types/action';
import { ClientToServerEvents, ServerToClientEvents } from '../../src/types/socket-events';
import { RECONNECT_GRACE_PERIOD_MS } from '../constants';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// ソケットID → { roomId, playerId } のマッピング
interface SocketInfo {
  roomId: string;
  playerId: string;
}

/**
 * Socket.ioイベントハンドラ管理
 */
export class SocketManager {
  private io: Server;
  private roomManager: RoomManager;
  private socketMap: Map<string, SocketInfo> = new Map();
  private disconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(io: Server, roomManager: RoomManager) {
    this.io = io;
    this.roomManager = roomManager;
    this.setupConnectionHandler();
  }

  private setupConnectionHandler(): void {
    this.io.on('connection', (socket: TypedSocket) => {
      console.log(`[Socket] 接続: ${socket.id}`);

      socket.on(CLIENT_EVENTS.ROOM_JOIN, (data) => this.handleRoomJoin(socket, data));
      socket.on(CLIENT_EVENTS.ROOM_LEAVE, () => this.handleRoomLeave(socket));
      socket.on(CLIENT_EVENTS.PLAYER_SIT, (data) => this.handlePlayerSit(socket, data));
      socket.on(CLIENT_EVENTS.GAME_START, () => this.handleGameStart(socket));
      socket.on(CLIENT_EVENTS.PLAYER_ACTION, (data) => this.handlePlayerAction(socket, data));
      socket.on('player:timebank', () => this.handleTimeBank(socket));
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  // ルーム参加
  private handleRoomJoin(socket: TypedSocket, data: { roomId: string; nickname: string }): void {
    const { roomId, nickname } = data;

    if (!roomId || !nickname || nickname.trim().length === 0) {
      socket.emit(SERVER_EVENTS.ERROR, { message: 'ルームIDとニックネームは必須です' });
      return;
    }

    let room = this.roomManager.getRoom(roomId);

    // ルームが存在しない場合は新規作成
    if (!room) {
      room = this.roomManager.createRoom();
      // roomIdを上書きできないので、指定されたIDでルームを作り直す
      // 実際にはcreateRoomのIDを使う
    }

    room = this.roomManager.getRoom(roomId);
    if (!room) {
      socket.emit(SERVER_EVENTS.ERROR, { message: 'ルームが見つかりません' });
      return;
    }

    // 切断タイマーがあればキャンセル（再接続）
    const disconnectTimer = this.disconnectTimers.get(socket.id);
    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
      this.disconnectTimers.delete(socket.id);
    }

    const player = room.addPlayer(socket.id, nickname.trim());
    if (!player) {
      socket.emit(SERVER_EVENTS.ERROR, { message: 'ルームに参加できません（満員またはゲーム中）' });
      return;
    }

    // 自動着席
    room.autoSitPlayer(socket.id);

    // ソケットマッピング登録
    this.socketMap.set(socket.id, { roomId: room.roomId, playerId: socket.id });

    // Socket.ioルームに参加
    socket.join(room.roomId);

    // ルームイベントハンドラ設定
    this.setupRoomEvents(room);

    // 参加者に通知
    this.io.to(room.roomId).emit(SERVER_EVENTS.ROOM_PLAYER_JOINED, {
      player: {
        id: player.id,
        nickname: player.nickname,
        seatIndex: player.seatIndex,
        chips: player.chips,
        bet: player.bet,
        hasCards: false,
        status: player.status,
        isHost: player.isHost,
        isConnected: true,
      },
    });

    // 全員に最新状態を送信
    this.broadcastGameState(room);
  }

  // ルームイベントハンドラ設定
  private setupRoomEvents(room: ReturnType<typeof this.roomManager.getRoom>): void {
    if (!room) return;

    room.onStateChange = () => {
      this.broadcastGameState(room);
    };

    room.onPlayerAction = (playerId, action, amount) => {
      this.io.to(room.roomId).emit(SERVER_EVENTS.GAME_ACTION, {
        playerId,
        action,
        amount,
      });
    };

    room.onNewHand = (handNumber) => {
      this.io.to(room.roomId).emit(SERVER_EVENTS.GAME_NEW_HAND, { handNumber });
      this.broadcastGameState(room);
    };

    room.onShowdown = (results) => {
      this.io.to(room.roomId).emit(SERVER_EVENTS.GAME_SHOWDOWN, { results });
      this.broadcastGameState(room);
    };

    room.onPlayerEliminated = (playerId, position) => {
      this.io.to(room.roomId).emit(SERVER_EVENTS.GAME_ELIMINATED, {
        playerId,
        position,
      });
    };

    room.onTournamentEnd = (winnerId) => {
      const winner = room.getPlayers().find(p => p.id === winnerId);
      this.io.to(room.roomId).emit(SERVER_EVENTS.GAME_WINNER, {
        playerId: winnerId,
        nickname: winner?.nickname ?? 'Unknown',
      });
      this.broadcastGameState(room);
    };
  }

  // ルーム退出
  private handleRoomLeave(socket: TypedSocket): void {
    const info = this.socketMap.get(socket.id);
    if (!info) return;

    const room = this.roomManager.getRoom(info.roomId);
    if (!room) return;

    room.removePlayer(info.playerId);
    socket.leave(info.roomId);
    this.socketMap.delete(socket.id);

    this.io.to(info.roomId).emit(SERVER_EVENTS.ROOM_PLAYER_LEFT, {
      playerId: info.playerId,
    });

    this.broadcastGameState(room);

    // ルームが空なら削除
    if (room.isEmpty()) {
      this.roomManager.removeRoom(info.roomId);
    }
  }

  // 座席選択
  private handlePlayerSit(socket: TypedSocket, data: { seatIndex: number }): void {
    const info = this.socketMap.get(socket.id);
    if (!info) return;

    const room = this.roomManager.getRoom(info.roomId);
    if (!room) return;

    const success = room.sitPlayer(info.playerId, data.seatIndex);
    if (!success) {
      socket.emit(SERVER_EVENTS.ERROR, { message: 'その席には座れません' });
      return;
    }

    this.broadcastGameState(room);
  }

  // ゲーム開始
  private handleGameStart(socket: TypedSocket): void {
    const info = this.socketMap.get(socket.id);
    if (!info) return;

    const room = this.roomManager.getRoom(info.roomId);
    if (!room) return;

    const success = room.startGame(info.playerId);
    if (!success) {
      socket.emit(SERVER_EVENTS.ERROR, { message: 'ゲームを開始できません（ホスト権限が必要、または2人以上のプレイヤーが必要）' });
      return;
    }

    this.broadcastGameState(room);
  }

  // プレイヤーアクション
  private handlePlayerAction(socket: TypedSocket, data: PlayerAction): void {
    const info = this.socketMap.get(socket.id);
    if (!info) return;

    const room = this.roomManager.getRoom(info.roomId);
    if (!room) return;

    const success = room.processAction(info.playerId, data);
    if (!success) {
      socket.emit(SERVER_EVENTS.ERROR, { message: '無効なアクションです' });
    }
  }

  // タイムバンク使用
  private handleTimeBank(socket: TypedSocket): void {
    const info = this.socketMap.get(socket.id);
    if (!info) return;

    const room = this.roomManager.getRoom(info.roomId);
    if (!room) return;

    const success = room.useTimeBank(info.playerId);
    if (!success) {
      socket.emit(SERVER_EVENTS.ERROR, { message: 'タイムバンクを使用できません' });
    }
  }

  // 切断処理
  private handleDisconnect(socket: TypedSocket): void {
    console.log(`[Socket] 切断: ${socket.id}`);

    const info = this.socketMap.get(socket.id);
    if (!info) return;

    const room = this.roomManager.getRoom(info.roomId);
    if (!room) {
      this.socketMap.delete(socket.id);
      return;
    }

    // ゲーム中は猶予期間を設けて再接続を待つ
    if (room.getPhase() === 'playing') {
      const timer = setTimeout(() => {
        room.removePlayer(info.playerId);
        this.socketMap.delete(socket.id);
        this.disconnectTimers.delete(socket.id);

        this.io.to(info.roomId).emit(SERVER_EVENTS.ROOM_PLAYER_LEFT, {
          playerId: info.playerId,
        });
        this.broadcastGameState(room);
      }, RECONNECT_GRACE_PERIOD_MS);

      this.disconnectTimers.set(socket.id, timer);

      // 即座に切断状態を通知
      room.getPlayers().find(p => p.id === info.playerId)!.isConnected = false;
      this.broadcastGameState(room);
    } else {
      room.removePlayer(info.playerId);
      this.socketMap.delete(socket.id);

      this.io.to(info.roomId).emit(SERVER_EVENTS.ROOM_PLAYER_LEFT, {
        playerId: info.playerId,
      });
      this.broadcastGameState(room);

      if (room.isEmpty()) {
        this.roomManager.removeRoom(info.roomId);
      }
    }
  }

  // 全プレイヤーに個別のゲーム状態を送信
  private broadcastGameState(room: ReturnType<typeof this.roomManager.getRoom>): void {
    if (!room) return;

    // 各プレイヤーに個別の状態を送信（カードフィルタリング）
    for (const player of room.getPlayers()) {
      const sockets = this.io.sockets.sockets;
      // playerのIDはsocket.idと同じ
      const socket = sockets.get(player.id);
      if (socket && player.isConnected) {
        const state = room.getClientState(player.id);
        socket.emit(SERVER_EVENTS.GAME_STATE, state);
      }
    }
  }
}
