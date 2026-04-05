import { PlayerAction } from './action';
import { ClientGameState, ShowdownResult, TournamentSettings } from './game';
import { ClientPlayer } from './player';

// ── Client → Server ──

export interface ClientToServerEvents {
  'room:join': (data: { roomId: string; nickname: string }) => void;
  'room:leave': () => void;
  'player:sit': (data: { seatIndex: number }) => void;
  'game:start': () => void;
  'player:action': (data: PlayerAction) => void;
  'player:timebank': () => void;  // タイムバンク使用
}

// ── Server → Client ──

export interface ServerToClientEvents {
  'game:state': (state: ClientGameState) => void;
  'game:action': (data: { playerId: string; action: string; amount?: number }) => void;
  'game:newHand': (data: { handNumber: number }) => void;
  'game:showdown': (data: { results: ShowdownResult[] }) => void;
  'game:eliminated': (data: { playerId: string; position: number }) => void;
  'game:winner': (data: { playerId: string; nickname: string }) => void;
  'room:playerJoined': (data: { player: ClientPlayer }) => void;
  'room:playerLeft': (data: { playerId: string }) => void;
  'room:created': (data: { roomId: string }) => void;
  'error': (data: { message: string }) => void;
}

// ── ルーム作成用 (REST API) ──

export interface CreateRoomRequest {
  nickname: string;
  settings?: Partial<TournamentSettings>;
}

export interface CreateRoomResponse {
  roomId: string;
}
