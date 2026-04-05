'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '../types/socket-events';
import { ClientGameState } from '../types/game';
import { PlayerAction } from '../types/action';

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
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    });

    socket.on('error', (data) => {
      setError(data.message);
      setTimeout(() => setError(null), 3000);
    });

    return () => {
      socket.disconnect();
    };
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
  };
}
