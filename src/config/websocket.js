import { WebSocketServer, WebSocket } from 'ws';

let wss = null;

export const initWebSocket = (server) => {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established.');

    ws.on('message', (message) => {
      console.log('Received message:', message.toString());
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed.');
    });
  });

  console.log('WebSocket server initialized.');
};

export const broadcast = (type, data) => {
  if (!wss) return;

  const payload = JSON.stringify({ type, data });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
};
