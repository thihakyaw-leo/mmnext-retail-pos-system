import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types/env.js';

/**
 * PosDurableObject
 * Handles real-time WebSocket connections using the Hibernatable WebSockets API.
 */
export class PosDurableObject extends DurableObject<Env> {
  // Store connected clients in memory (though getWebSockets() is preferred)
  // We can use this to keep track of active connections if we want to store metadata in the DO state
  
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    
    // Internal API for broadcasting from other workers/routes
    if (request.method === 'POST' && new URL(request.url).pathname === '/internal/broadcast') {
      try {
        const payload = await request.json();
        this.broadcast(payload);
        return new Response(JSON.stringify({ success: true }), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
      }
    }

    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    // Create a WebSocket pair
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Accept the WebSocket connection into this Durable Object
    this.ctx.acceptWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Called when a WebSocket sends a message
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      const data = JSON.parse(message as string);
      
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
          
        case 'subscribe':
          // We can attach tags to WebSockets if we want to filter broadcasts later
          // e.g. this.ctx.acceptWebSocket(ws, ["branch-123"]);
          // But for now, we just acknowledge the subscription
          ws.send(JSON.stringify({ type: 'subscribed', status: 'success' }));
          break;
          
        case 'broadcast':
          // Example: A client sends a broadcast message to all other clients
          this.broadcast(data.payload, [ws]);
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  }

  /**
   * Called when a WebSocket connection is closed
   */
  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    console.log(`WebSocket closed: ${code} - ${reason}`);
  }

  /**
   * Called when a WebSocket connection has an error
   */
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('WebSocket error:', error);
  }

  /**
   * Helper function to broadcast a message to all connected WebSockets
   */
  broadcast(message: any, excludeWs: WebSocket[] = []): void {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    const sockets = this.ctx.getWebSockets();
    
    for (const ws of sockets) {
      if (!excludeWs.includes(ws)) {
        try {
          ws.send(payload);
        } catch (err) {
          console.error('Failed to send broadcast to a websocket:', err);
        }
      }
    }
  }
}
