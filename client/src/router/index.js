import { createRouter, createWebHistory } from 'vue-router';
import ChatRoom from '../components/ChatRoom.vue';
import AdminChat from '../components/AdminChat.vue'; // Asegúrate de tener este componente creado

const routes = [
  {
    path: '/',
    name: 'ChatRoom',
    component: ChatRoom, // Ruta principal para los usuarios
  },
  {
    path: '/admin',
    name: 'AdminChat',
    component: AdminChat, // Ruta para la interfaz de administración
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
