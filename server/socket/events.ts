// Socket.ioイベント名定数

// Client → Server
export const CLIENT_EVENTS = {
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  PLAYER_SIT: 'player:sit',
  GAME_START: 'game:start',
  PLAYER_ACTION: 'player:action',
} as const;

// Server → Client
export const SERVER_EVENTS = {
  GAME_STATE: 'game:state',
  GAME_ACTION: 'game:action',
  GAME_NEW_HAND: 'game:newHand',
  GAME_SHOWDOWN: 'game:showdown',
  GAME_ELIMINATED: 'game:eliminated',
  GAME_WINNER: 'game:winner',
  ROOM_PLAYER_JOINED: 'room:playerJoined',
  ROOM_PLAYER_LEFT: 'room:playerLeft',
  ROOM_CREATED: 'room:created',
  ERROR: 'error',
} as const;
