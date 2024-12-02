const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  room: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxLength: 1000
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isAdminMessage: {
    type: Boolean,
    default: false
  },
  recipient: {
    type: String,
    default: null
  }
});

// Índices para mejorar el rendimiento de las consultas
messageSchema.index({ room: 1, timestamp: -1 });
messageSchema.index({ author: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);