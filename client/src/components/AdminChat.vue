<template>
  <div class="container-fluid vh-100">
    <div v-if="connectionError" class="alert alert-danger alert-dismissible fade show shadow-sm border-0 rounded-0"
      role="alert">
      <i class="bi bi-exclamation-triangle-fill me-2"></i>
      {{ connectionError }}
      <button type="button" class="btn-close" @click="connectionError = ''" aria-label="Close"></button>
    </div>

    <div class="row h-100 g-0">
      <div class="col-3 bg-white border-end d-flex flex-column" style="height: calc(100vh - 60px)">
        <div class="px-4 py-3 bg-primary bg-gradient">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-shield-check text-white fs-4"></i>
            <div class="text-white">
              <h5 class="mb-0 fw-semibold">{{ adminUsername }}</h5>
              <div class="d-flex align-items-center gap-2">
                <div class="badge bg-light text-primary">Administrador</div>
                <div v-if="socket?.connected" class="badge bg-success">Online</div>
                <div v-else class="badge bg-danger">Offline</div>
              </div>
            </div>
          </div>
        </div>

        <div class="px-4 py-3 border-bottom bg-light">
          <div class="d-flex justify-content-between align-items-center">
            <h6 class="mb-0 text-primary fw-semibold">
              <i class="bi bi-people-fill me-2"></i>
              Usuarios activos ({{ userCount }})
            </h6>
            <button class="btn btn-sm btn-primary rounded-circle p-1" @click="refreshRooms" :disabled="isRefreshing">
              <i class="bi bi-arrow-clockwise" :class="{ 'spinner': isRefreshing }"></i>
            </button>
          </div>
        </div>

        <div class="overflow-auto flex-grow-1 custom-scrollbar">
          <div class="list-group list-group-flush">
            <button class="list-group-item list-group-item-action border-0 px-4 py-3"
              :class="{ 'active': currentRoom === 'general' && !selectedUser }" @click="selectRoom('general')">
              <div class="d-flex align-items-center">
                <i class="bi bi-chat-square-text me-2"></i>
                <span>Chat General</span>
              </div>
            </button>

            <div v-if="currentRoom === 'general'" class="border-top">
              <div v-for="user in sortedUsers" :key="user.username"
                class="list-group-item list-group-item-action border-0 px-4 py-3" :class="{
                  'active': selectedUser === user.username,
                  'border-start border-4 border-warning': user.hasUnreadMessages
                }" @click="selectUser(user.username)">
                <div class="d-flex align-items-center gap-2">
                  <div class="position-relative">
                    <i class="bi bi-person-circle fs-5"></i>
                    <span v-if="user.isConnected"
                      class="position-absolute bottom-0 end-0 translate-middle p-1 bg-success border border-light rounded-circle">
                    </span>
                  </div>
                  <div class="flex-grow-1 min-w-0">
                    <div class="d-flex justify-content-between align-items-center">
                      <span class="fw-medium text-truncate">{{ user.username }}</span>
                      <span v-if="user.hasUnreadMessages" class="badge bg-warning text-dark rounded-pill">
                        Nuevo
                      </span>
                    </div>
                    <small :class="user.isConnected ? 'text-success' : 'text-muted'">
                      {{ user.isConnected ? 'En línea' : 'Desconectado' }}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Chat Principal -->
      <div class="col-9 d-flex flex-column bg-light">
        <div class="px-4 py-3 bg-white border-bottom shadow-sm">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h5 class="mb-0 fw-semibold">{{ chatTitle }}</h5>
              <small class="text-muted" v-if="selectedUser">
                <i class="bi bi-arrow-return-right me-1"></i>
                Conversación privada
              </small>
            </div>
            <div v-if="selectedUser">
              <button class="btn btn-outline-primary btn-sm" @click="clearUser">
                <i class="bi bi-arrow-left me-1"></i>
                Volver al general
              </button>
            </div>
          </div>
        </div>

        <div class="flex-grow-1 p-4 overflow-auto custom-scrollbar" ref="messagesContainer">
          <div v-if="isLoadingMessages" class="d-flex justify-content-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Cargando...</span>
            </div>
          </div>

          <template v-else-if="filteredMessages.length">
            <div v-for="message in filteredMessages" :key="message._id" class="mb-3"
              :class="message.author === adminUsername ? 'text-end' : 'text-start'">
              <div class="d-inline-block message-bubble" :class="getMessageClass(message)">
                <div class="fw-medium mb-1 message-author">{{ message.author }}</div>
                <div class="message-content">{{ message.content }}</div>
                <div class="message-time">{{ formatTime(message.timestamp) }}</div>
              </div>
            </div>

            <div v-if="typingUsers.length" class="typing-indicator">
              <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span class="ms-2 text-primary fw-medium">
                {{ typingUsers.join(', ') }}
                {{ typingUsers.length === 1 ? 'está' : 'están' }} escribiendo...
              </span>
            </div>
          </template>

          <div v-else class="d-flex align-items-center justify-content-center h-100">
            <div class="text-center text-muted">
              <i class="bi bi-chat-square-text fs-1 mb-2"></i>
              <p class="mb-0">No hay mensajes para mostrar</p>
            </div>
          </div>
        </div>

        <!-- Input de mensaje -->
        <!-- <div class="p-3 bg-white border-top">
          <div class="input-group">
            <input v-model="newMessage" type="text" class="form-control border-end-0"
              placeholder="Escribe un mensaje..." @keyup.enter="sendMessage" @input="handleTyping" @blur="stopTyping"
              :disabled="!isInputEnabled" />
            <button class="btn btn-primary px-4" @click="sendMessage" :disabled="!isInputEnabled || !newMessage.trim()">
              <i class="bi bi-send-fill"></i>
            </button>
          </div>
        </div> -->
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch, watchEffect } from 'vue';
import { io } from 'socket.io-client';
import moment from 'moment';

export default {
  name: 'AdminChat',

  setup() {
    const socket = ref(null);
    const adminUsername = ref('Admin');
    const currentRoom = ref('general');
    const selectedUser = ref(null);
    const messages = ref([]);
    const newMessage = ref('');
    const typingUsers = ref([]);
    const users = ref([]);
    const typingTimeout = ref(null);
    const messagesContainer = ref(null);
    const connectionError = ref('');
    const isRefreshing = ref(false);
    const isLoadingMessages = ref(false);

    const chatTitle = computed(() => {
      if (selectedUser.value) {
        return `Chat con ${selectedUser.value}`;
      }
      return `Sala ${currentRoom.value}`;
    });

    const userCount = computed(() => {
      return users.value.filter(user => user.isConnected).length;
    });

    const sortedUsers = computed(() => {
      return [...users.value].sort((a, b) => {
        if (a.isConnected && !b.isConnected) return -1;
        if (!a.isConnected && b.isConnected) return 1;
        if (a.hasUnreadMessages && !b.hasUnreadMessages) return -1;
        if (!a.hasUnreadMessages && b.hasUnreadMessages) return 1;
        return a.username.localeCompare(b.username);
      });
    });

    const filteredMessages = computed(() => {
      if (selectedUser.value) {
        return messages.value.filter(msg =>
          msg.author === selectedUser.value || msg.recipient === selectedUser.value
        );
      }
      return messages.value.filter(msg => msg.room === currentRoom.value);
    });

    const isInputEnabled = computed(() => {
      return socket.value?.connected && (currentRoom.value || selectedUser.value);
    });

    const connectSocket = async () => {
      try {
        socket.value = io(process.env.VUE_APP_SOCKET_URL, {
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          query: { isAdmin: true }
        });

        setupSocketListeners();
        return true;
      } catch (error) {
        console.error('Error al conectar socket:', error);
        connectionError.value = 'Error al establecer la conexión';
        return false;
      }
    };

    const setupSocketListeners = () => {
      if (!socket.value) return;

      socket.value.on('connect', () => {
        connectionError.value = '';
        socket.value.emit('join_room', {
          username: adminUsername.value,
          room: 'admin',
          isAdmin: true
        });
        loadUsers();
      });

      socket.value.on('connect_error', (error) => {
        connectionError.value = 'Error de conexión con el servidor';
        console.error('Error de conexión:', error);
      });


      socket.value.on('receive_message', (message) => {
        if (!messages.value.some(msg => msg._id === message._id)) {
          messages.value.push(message);
          handleNewMessage(message);
          scrollToBottom();
        }
      });

      socket.value.on('system_message', (message) => {
        if (!messages.value.some(msg => msg._id === message._id)) {
          messages.value.push(message);
          if (message.content.includes('se ha unido') ||
            message.content.includes('ha abandonado')) {
            loadUsers();
          }
        }
      });

      socket.value.on('users_list', (usersList) => {
        const updatedUsers = usersList.map(newUser => {
          const existingUser = users.value.find(u => u.username === newUser.username);
          return {
            ...newUser,
            hasUnreadMessages: existingUser?.hasUnreadMessages || false,
            lastActivity: existingUser?.lastActivity || new Date()
          };
        });
        users.value = updatedUsers;
      });

      socket.value.on('user_typing', ({ username, room }) => {
        if (!typingUsers.value.includes(username) &&
          (room === currentRoom.value || username === selectedUser.value)) {
          typingUsers.value.push(username);
        }
      });

      socket.value.on('user_stop_typing', ({ username }) => {
        typingUsers.value = typingUsers.value.filter(user => user !== username);
      });

      socket.value.on('disconnect', () => {
        connectionError.value = 'Desconectado del servidor. Intentando reconectar...';
        users.value = users.value.map(user => ({
          ...user,
          isConnected: false
        }));
      });
    };

    const handleNewMessage = (message) => {
      if (message.author !== adminUsername.value &&
        message.author !== selectedUser.value &&
        !message.isSystemMessage) {
        const user = users.value.find(u => u.username === message.author);
        if (user) {
          user.hasUnreadMessages = true;
          user.lastActivity = new Date();
        }
      }
    };

    const loadMessages = async () => {
      try {
        isLoadingMessages.value = true;
        const room = selectedUser.value || currentRoom.value;
        const response = await fetch(
          `${process.env.VUE_APP_BACKEND_URL}/api/messages/${room}`
        );
        if (!response.ok) throw new Error('Error al cargar mensajes');
        messages.value = await response.json();
        scrollToBottom();
      } catch (error) {
        console.error('Error al cargar mensajes:', error);
        connectionError.value = 'Error al cargar los mensajes';
      } finally {
        isLoadingMessages.value = false;
      }
    };

    const loadUsers = () => {
      if (socket.value?.connected) {
        socket.value.emit('get_users');
      }
    };

    const selectRoom = (room) => {
      currentRoom.value = room;
      selectedUser.value = null;
      loadMessages();
    };

    const selectUser = (username) => {
      selectedUser.value = username;
      const user = users.value.find(u => u.username === username);
      if (user) {
        user.hasUnreadMessages = false;
      }
      loadMessages();
    };

    const clearUser = () => {
      selectedUser.value = null;
      selectRoom('general');
    };

    const sendMessage = () => {
      if (newMessage.value.trim() && socket.value?.connected) {
        const messageData = {
          room: selectedUser.value || currentRoom.value,
          author: adminUsername.value,
          content: newMessage.value.trim(),
          timestamp: new Date(),
          isAdminMessage: true,
          recipient: selectedUser.value || null
        };

        socket.value.emit('send_message', messageData, (error) => {
          if (error) {
            console.error('Error al enviar mensaje:', error);
            connectionError.value = 'Error al enviar el mensaje';
          } else {
            messages.value.push({
              ...messageData,
              _id: Date.now().toString()
            });
            newMessage.value = '';
            stopTyping();
            scrollToBottom();
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
          username: adminUsername.value,
          room: selectedUser.value || currentRoom.value
        });

        typingTimeout.value = setTimeout(stopTyping, 1000);
      }
    };

    const stopTyping = () => {
      if (socket.value?.connected) {
        socket.value.emit('stop_typing', {
          username: adminUsername.value,
          room: selectedUser.value || currentRoom.value
        });
      }
    };

    const refreshRooms = async () => {
      isRefreshing.value = true;
      loadUsers();
      await loadMessages();
      isRefreshing.value = false;
    };

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

    const getMessageClass = (message) => {
      if (message.isAdminMessage) return 'bg-warning text-dark';
      return message.author === adminUsername.value
        ? 'bg-primary text-white'
        : 'bg-light border';
    };

    const getUserStatus = (username) => {
      const user = users.value.find(u => u.username === username);
      return user?.isConnected ? 'En línea' : 'Desconectado';
    };

    onMounted(async () => {
      await connectSocket();
    });

    onUnmounted(() => {
      if (socket.value) {
        socket.value.disconnect();
        socket.value = null;
      }
      if (typingTimeout.value) {
        clearTimeout(typingTimeout.value);
      }
    });

    watchEffect(() => {
      if (socket.value?.connected) {
        loadUsers();
      }
    });

    watch(messages, () => {
      scrollToBottom();
    }, { deep: true });

    return {
      adminUsername,
      currentRoom,
      selectedUser,
      messages,
      newMessage,
      typingUsers,
      users,
      messagesContainer,
      connectionError,
      isRefreshing,
      isLoadingMessages,
      socket,
      chatTitle,
      userCount,
      sortedUsers,
      filteredMessages,
      isInputEnabled,
      selectRoom,
      selectUser,
      clearUser,
      sendMessage,
      handleTyping,
      stopTyping,
      refreshRooms,
      formatTime,
      getMessageClass,
      getUserStatus,
    };
  }
};
</script>