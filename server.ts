import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { RoomManager } from './server/RoomManager';
import { SocketManager } from './server/socket/SocketManager';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);

    // ルーム作成API
    if (req.method === 'POST' && parsedUrl.pathname === '/api/rooms') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try {
          const { nickname, settings } = JSON.parse(body || '{}');
          const room = roomManager.createRoom(settings);
          // ルーム作成はSocket.ioで行うので、ここではroomIdだけ返す
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ roomId: room.roomId }));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid request' }));
        }
      });
      return;
    }

    // ルーム存在確認API
    if (req.method === 'GET' && parsedUrl.pathname?.startsWith('/api/rooms/')) {
      const roomId = parsedUrl.pathname.split('/').pop();
      if (roomId) {
        const room = roomManager.getRoom(roomId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          exists: !!room,
          playerCount: room?.getPlayerCount() ?? 0,
          phase: room?.getPhase() ?? null,
        }));
      }
      return;
    }

    // Next.jsハンドラ
    handle(req, res, parsedUrl);
  });

  // Socket.ioセットアップ
  const io = new Server(httpServer, {
    cors: {
      origin: dev ? '*' : undefined,
      methods: ['GET', 'POST'],
    },
  });

  const roomManager = new RoomManager();
  const socketManager = new SocketManager(io, roomManager);

  httpServer.listen(port, () => {
    console.log(`> PokerNow Neo サーバー起動: http://localhost:${port}`);
    console.log(`> 環境: ${dev ? '開発' : '本番'}`);
  });

  // グレースフルシャットダウン
  const shutdown = () => {
    console.log('> シャットダウン中...');
    roomManager.shutdown();
    io.close();
    httpServer.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
});
