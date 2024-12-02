<template>
  <div class="chat-container my-4">
    <div v-if="connectionError" class="alert alert-danger alert-dismissible fade show shadow-sm" role="alert">
      <i class="bi bi-exclamation-triangle-fill me-2"></i>
      {{ connectionError }}
      <button type="button" class="btn-close" @click="connectionError = ''" aria-label="Close"></button>
    </div>

    <div v-if="!isLoggedIn" class="card shadow-sm mx-auto" style="max-width: 400px;">
      <div class="card-body p-4">
        <div class="text-center mb-4">
          <i class="bi bi-chat-dots text-primary" style="font-size: 2.5rem;"></i>
          <h2 class="mt-3 mb-4">Bienvenido al Sellia Chat</h2>
        </div>
        <div class="form-floating mb-3">
          <input v-model="username" type="text" class="form-control" :class="{ 'is-invalid': usernameError }"
            id="usernameInput" placeholder="Nombre de usuario" @keyup.enter="login" @input="validateUsername" />
          <label for="usernameInput">Nombre de usuario</label>
          <div class="invalid-feedback" v-if="usernameError">
            {{ usernameError }}
          </div>
        </div>
        <button class="btn btn-primary w-100 py-2" @click="login" :disabled="!isUsernameValid || isConnecting">
          <span v-if="isConnecting" class="spinner-border spinner-border-sm me-2"></span>
          {{ isConnecting ? 'Conectando...' : 'Entrar al Chat' }}
        </button>
      </div>
    </div>

    <div v-else class="card shadow-sm">
      <div class="card-header bg-white py-3">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h5 class="mb-0 d-flex align-items-center">
              <i class="bi bi-person-circle text-primary me-2"></i>
              {{ username }}
            </h5>
          </div>
          <button class="btn btn-outline-danger btn-sm" @click="logout">
            <i class="bi bi-box-arrow-right me-1"></i>
            Salir
          </button>
        </div>
        <div class="input-group mt-3">
          <input v-model="searchQuery" type="text" class="form-control" id="searchMessages"
            placeholder="Buscar mensajes..." />
          <button class="btn btn-outline-secondary" type="button">
            <i class="bi bi-search"></i>
          </button>
        </div>
      </div>

      <div class="chat-messages p-3" ref="messagesContainer">
        <div v-if="filteredMessages.length === 0" class="text-center text-muted py-5">
          <i class="bi bi-chat-dots mb-2" style="font-size: 2rem;"></i>
          <p class="mb-0">No hay mensajes aún. ¡Sé el primero en escribir!</p>
        </div>

        <div v-for="message in filteredMessages" :key="message._id" class="message-wrapper mb-3"
          :class="message.author === username ? 'own-message' : ''">
          <div class="message-bubble">
            <div class="message-header">
              <span class="message-author">
                <i v-if="message.author === 'Sistema'" class="bi bi-gear-fill me-1"></i>
                {{ message.author }}
              </span>
              <span class="message-time">{{ formatTime(message.timestamp) }}</span>
            </div>
            <div class="message-content">{{ message.content }}</div>
          </div>
        </div>

        <div v-if="typingUsers.length" class="typing-indicator">
          <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span class="ms-2 fw-medium text-primary" style="font-size: 0.9rem;">
            {{ typingUsers.join(', ') }}
            {{ typingUsers.length === 1 ? 'está' : 'están' }} escribiendo...
          </span>
        </div>
      </div>

      <div class="card-footer bg-white p-3">
        <div class="input-group">
          <input v-model="newMessage" type="text" class="form-control" placeholder="Escribe un mensaje..."
            @keyup.enter="sendMessage" @input="handleTyping" @blur="stopTyping" :disabled="!socket?.connected" />
          <button class="btn btn-primary px-4" @click="sendMessage"
            :disabled="!newMessage.trim() || !socket?.connected">
            <i class="bi bi-send-fill"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { io } from 'socket.io-client';
import moment from 'moment';
import { ref, onUnmounted, computed } from 'vue';

export default {
  name: 'ClientChat',

  setup() {
    const socket = ref(null);
    const username = ref('');
    const usernameError = ref('');
    const isLoggedIn = ref(false);
    const isConnecting = ref(false);
    const connectionError = ref('');
    const room = ref('Cliente');
    const messages = ref([]);
    const newMessage = ref('');
    const typingUsers = ref([]);
    const typingTimeout = ref(null);
    const messagesContainer = ref(null);
    const isUsernameValid = ref(false);
    const searchQuery = ref('');

    const validateUsername = () => {
      const value = username.value.trim();

      if (!value) {
        usernameError.value = 'El nombre de usuario es requerido';
        isUsernameValid.value = false;
      } else if (value.length < 3) {
        usernameError.value = 'El nombre debe tener al menos 3 caracteres';
        isUsernameValid.value = false;
      } else if (value.length > 20) {
        usernameError.value = 'El nombre no puede exceder 20 caracteres';
        isUsernameValid.value = false;
      } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
        usernameError.value = 'Solo se permiten letras, números y guiones bajos';
        isUsernameValid.value = false;
      } else {
        usernameError.value = '';
        isUsernameValid.value = true;
      }
    };

    const connectSocket = async () => {
      try {
        socket.value = io(process.env.VUE_APP_SOCKET_URL, {
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socket.value.on('connect', () => {
          connectionError.value = '';
          socket.value.emit('join_room', { username: username.value, room: room.value });
        });

        socket.value.on('connect_error', () => {
          connectionError.value = 'No se pudo conectar al servidor. Por favor, intente nuevamente.';
        });

        socket.value.on('receive_message', (message) => {
          if (!messages.value.some((msg) => msg._id === message._id)) {
            if (message.recipient === username.value || message.room === room.value) {
              messages.value.push(message);
            }
            scrollToBottom();
          }
        });

        socket.value.on('user_typing', ({ username: typingUser }) => {
          if (!typingUsers.value.includes(typingUser)) {
            typingUsers.value.push(typingUser);
          }
        });

        socket.value.on('user_stop_typing', ({ username: typingUser }) => {
          typingUsers.value = typingUsers.value.filter(user => user !== typingUser);
        });

        socket.value.on('disconnect', () => {
          connectionError.value = 'Se perdió la conexión con el servidor. Reconectando...';
        });

        return true;
      } catch {
        connectionError.value = 'Error al establecer la conexión';
        return false;
      }
    };

    const login = async () => {
      if (!isUsernameValid.value) return;

      isConnecting.value = true;
      const connected = await connectSocket();

      if (connected) {
        isLoggedIn.value = true;
        loadMessages();
      }

      isConnecting.value = false;
    };

    const logout = () => {
      if (socket.value) {
        socket.value.disconnect();
      }
      isLoggedIn.value = false;
      username.value = '';
      messages.value = [];
      connectionError.value = '';
    };

    const loadMessages = async () => {
      try {
        const response = await fetch(
          `${process.env.VUE_APP_BACKEND_URL}/api/messages/${room.value}`
        );
        if (!response.ok) throw new Error('Error al cargar mensajes');
        messages.value = await response.json();
        scrollToBottom();
      } catch {
        connectionError.value = 'Error al cargar los mensajes anteriores';
      }
    };

    const sendMessage = () => {
      if (newMessage.value.trim() && socket.value?.connected) {
        const messageData = {
          room: room.value,
          author: username.value,
          content: newMessage.value.trim(),
          timestamp: new Date()
        };

        socket.value.emit('send_message', messageData, (error) => {
          if (error) {
            connectionError.value = 'Error al enviar el mensaje';
          } else {
            newMessage.value = '';
            stopTyping();
          }
        });
      }
    };

    const handleTyping = () => {
      if (typingTimeout.value) {
        clearTimeout(typingTimeout.value);
      }

      if (socket.value?.connected) {
        socket.value.emit('typing', {
          username: username.value,
          room: room.value
        });

        typingTimeout.value = setTimeout(stopTyping, 1000);
      }
    };

    const stopTyping = () => {
      if (socket.value?.connected) {
        socket.value.emit('stop_typing', {
          username: username.value,
          room: room.value
        });
      }
    };

    const filteredMessages = computed(() => {
      if (!searchQuery.value.trim()) {
        return messages.value;
      }
      const query = searchQuery.value.toLowerCase();
      return messages.value.filter(message =>
        message.content.toLowerCase().includes(query) ||
        message.author.toLowerCase().includes(query)
      );
    });

    const scrollToBottom = () => {
      setTimeout(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
      }, 100);
    };

    const formatTime = (timestamp) => {
      return moment(timestamp).format('HH:mm');
    };

    onUnmounted(() => {
      if (socket.value) {
        socket.value.disconnect();
      }
      if (typingTimeout.value) {
        clearTimeout(typingTimeout.value);
      }
    });

    return {
      username,
      usernameError,
      isUsernameValid,
      isLoggedIn,
      isConnecting,
      connectionError,
      room,
      messages,
      newMessage,
      typingUsers,
      messagesContainer,
      socket,
      login,
      logout,
      sendMessage,
      handleTyping,
      stopTyping,
      formatTime,
      validateUsername,
      searchQuery,
      filteredMessages,
    };
  }
};
</script>