import {io, Socket} from 'socket.io-client';
import store from '@/store';

const socket = io('process.env.VUE_APP_SOCKET_URL' || 'http://localhost:3000', {
  autoConnect: false
});

socket.on('connect', () => {
  store.commit('chat/setConnectionStatus', 'connected');
  console.log('Connected to server');
});

socket.io.on('reconnect', () => {
  store.commit('chat/setConnectionStatus', 'connected');
  console.log('Reconnected to server');
});

socket.io.on('disconnect', () => {
  store.commit('chat/setConnectionStatus', 'disconnected');
  console.log('Disconnected from server');
});

socket.io.on('error', (error) => {
  console.error('Error:', error);
});

export default socket;