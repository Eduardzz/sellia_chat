// src/store/modules/chat.js
import axios from 'axios';

const state = {
  messages: [],
  currentRoom: null,
  username: null,
  isConnected: false
};

const mutations = {
  SET_MESSAGES(state, messages) {
    state.messages = messages;
  },
  ADD_MESSAGE(state, message) {
    state.messages.push(message);
  },
  SET_CURRENT_ROOM(state, room) {
    state.currentRoom = room;
  },
  SET_USERNAME(state, username) {
    state.username = username;
  },
  SET_CONNECTION_STATUS(state, status) {
    state.isConnected = status;
  }
};

const actions = {
  async fetchMessages({ commit }, room) {
    try {
      const response = await axios.get(`${process.env.VUE_APP_API_URL}/api/messages/${room}`);
      commit('SET_MESSAGES', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  },

  async searchMessages({ commit }, { room, query }) {
    try {
      const response = await axios.get(
        `${process.env.VUE_APP_API_URL}/api/messages/${room}/search`,
        { params: { query } }
      );
      return response.data;
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  },

  setRoom({ commit }, room) {
    commit('SET_CURRENT_ROOM', room);
  },

  setUsername({ commit }, username) {
    commit('SET_USERNAME', username);
    localStorage.setItem('chat_username', username);
  },

  setConnectionStatus({ commit }, status) {
    commit('SET_CONNECTION_STATUS', status);
  }
};

const getters = {
  currentMessages: state => state.messages,
  currentRoom: state => state.currentRoom,
  username: state => state.username,
  isConnected: state => state.isConnected
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};