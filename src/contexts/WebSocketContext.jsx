import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { message } from 'antd';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  const connect = useCallback(() => {
    if (!user) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;

    // Use current host, assuming the backend WS is exposed on the same domain or a known subpath
    // For local dev, we might point directly to the workers dev server
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8787/ws';
    
    const socket = new WebSocket(`${WS_URL}?token=${token}`);

    socket.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket Connected');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
        
        // Handle global notifications if we want to show popups automatically
        if (data.type === 'low_stock_alert') {
          message.warning(`Low stock alert: ${data.data?.product?.name}`);
        } else if (data.type === 'inventory_updated') {
          message.info('Inventory updated globally');
        }
      } catch (e) {
        console.error('Error parsing WS message', e);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket Disconnected. Reconnecting in 5s...');
      // Simple exponential backoff or fixed reconnect
      setTimeout(connect, 5000);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      socket.close();
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [user]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  const sendMessage = useCallback((type, data) => {
    if (ws && isConnected) {
      ws.send(JSON.stringify({ type, data }));
    }
  }, [ws, isConnected]);

  return (
    <WebSocketContext.Provider value={{ isConnected, lastMessage, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
