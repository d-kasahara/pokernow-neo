'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '../types/socket-events';
import { ClientGameState } from '../types/game';
import { PlayerAction } from '../types/action';
import { useSoundEffects } from './useSoundEffects';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface UseSocketReturn {
  socket: TypedSocket | null;
  isConnected: boolean;
  gameState: ClientGameState | null;
  error: string | null;
  joinRoom: (roomId: string, nickname: string) => void;
  leaveRoom: () => void;
  sitAt: (seatIndex: number) => void;
  startGame: () => void;
  sendAction: (action: PlayerAction) => void;
  useTimeBank: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { play: playSound, enabled: soundEnabled, toggleEnabled: toggleSound } = useSoundEffects();
  // playSoundの最新参照を保持（useEffect内で使用するため）
  const playSoundRef = useRef(playSound);
  useEffect(() => {
    playSoundRef.current = playSound;
  }, [playSound]);

  // プレイヤーのターン変化とタイマー警告を追跡するためのref
  const lastCurrentPlayerRef = useRef<number>(-1);
  const lastMyTurnRef = useRef<boolean>(false);
  const lastTimerRef = useRef<number>(0);

  useEffect(() => {
    const socket = io({
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    }) as TypedSocket;

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('game:state', (state) => {
      setGameState(state);

      // 自分のターンになった瞬間に通知音
      const isMyTurn = !!state.availableActions;
      if (isMyTurn && !lastMyTurnRef.current) {
        playSoundRef.current('yourTurn');
      }
      lastMyTurnRef.current = isMyTurn;

      // タイマー警告（残り5秒以下で1秒ごと）
      if (isMyTurn && state.actionTimerRemaining > 0 && state.actionTimerRemaining <= 5) {
        if (state.actionTimerRemaining !== lastTimerRef.current) {
          playSoundRef.current('timerWarn');
        }
      }
      lastTimerRef.current = state.actionTimerRemaining;
      lastCurrentPlayerRef.current = state.currentPlayerIndex;
    });

    // プレイヤーアクションの効果音（各アクション個別の音）
    socket.on('game:action', (data) => {
      const action = data.action;
      switch (action) {
        case 'fold':
          playSoundRef.current('fold');
          break;
        case 'check':
          playSoundRef.current('check');
          break;
        case 'call':
          playSoundRef.current('call');
          break;
        case 'bet':
          playSoundRef.current('bet');
          break;
        case 'raise':
          playSoundRef.current('raise');
          break;
        case 'allIn':
          playSoundRef.current('allIn');
          break;
      }
    });

    // 新しいハンド
    socket.on('game:newHand', () => {
      playSoundRef.current('deal');
    });

    // ショーダウン
    socket.on('game:showdown', () => {
      // 短いディレイで配布音
      setTimeout(() => playSoundRef.current('deal'), 100);
    });

    // 勝者
    socket.on('game:winner', () => {
      playSoundRef.current('win');
    });

    socket.on('error', (data) => {
      setError(data.message);
      setTimeout(() => setError(null), 3000);
    });

    return () => {
      socket.disconnect();
    };
    // playSoundは安定したrefから取得するため依存配列に入れない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const joinRoom = useCallback((roomId: string, nickname: string) => {
    const socket = socketRef.current;
    if (!socket) return;

    if (!socket.connected) {
      socket.connect();
    }

    const tryJoin = () => {
      socket.emit('room:join', { roomId, nickname });
    };

    if (socket.connected) {
      tryJoin();
    } else {
      socket.once('connect', tryJoin);
    }
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave');
  }, []);

  const sitAt = useCallback((seatIndex: number) => {
    socketRef.current?.emit('player:sit', { seatIndex });
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit('game:start');
  }, []);

  const sendAction = useCallback((action: PlayerAction) => {
    socketRef.current?.emit('player:action', action);
  }, []);

  const useTimeBank = useCallback(() => {
    socketRef.current?.emit('player:timebank');
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    gameState,
    error,
    joinRoom,
    leaveRoom,
    sitAt,
    startGame,
    sendAction,
    useTimeBank,
    soundEnabled,
    toggleSound,
  };
}
