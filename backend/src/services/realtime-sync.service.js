const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

class RealTimeSyncService {
    constructor(httpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
                methods: ['GET', 'POST'],
                credentials: true
            }
        });

        this.setupMiddleware();
        console.log('🔌 Real-time sync service initialized');
    }

    setupMiddleware() {
        // Authentication middleware
        this.io.use((socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                
                if (!token) {
                    return next(new Error('Authentication required'));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.userId = decoded.userId;
                
                next();
            } catch (error) {
                next(new Error('Invalid token'));
            }
        });

        // Connection handling
        this.io.on('connection', (socket) => {
            console.log(`✅ User ${socket.userId} connected`);

            // Join user's private room
            socket.join(`user:${socket.userId}`);

            // Handle disconnect
            socket.on('disconnect', (reason) => {
                console.log(`❌ User ${socket.userId} disconnected (${reason})`);
            });

            // Handle heartbeat
            socket.on('heartbeat', () => {
                socket.broadcast.to(`user:${socket.userId}`).emit('heartbeat_ack', {
                    timestamp: Date.now()
                });
            });
        });
    }

    /**
     * Emit file operation event to specific user
     */
    emitFileOperation(userId, action, fileInfo) {
        this.io.to(`user:${userId}`).emit('file_operation', {
            action,
            file: fileInfo,
            timestamp: Date.now()
        });
    }

    /**
     * Broadcast file operation to all users (for shared files)
     */
    broadcastToSharedUsers(fileId, action, fileInfo) {
        // Get all users with access to this file
        // TODO: Implement shared user lookup
        this.io.emit('shared_file_update', {
            fileId,
            action,
            file: fileInfo,
            timestamp: Date.now()
        });
    }

    /**
     * Update UI in real-time for file changes
     */
    updateFileState(userId, fileId, updates) {
        this.io.to(`user:${userId}`).emit('file_update', {
            fileId,
            updates,
            timestamp: Date.now()
        });
    }

    /**
     * Send streaming progress update
     */
    sendUploadProgress(userId, fileId, progress) {
        this.io.to(`user:${userId}`).emit('upload_progress', {
            fileId,
            progress,
            speed: progress.speed,
            eta: progress.eta
        });
    }

    /**
     * Notify about new notifications
     */
    notifyUser(userId, type, message, data = {}) {
        this.io.to(`user:${userId}`).emit('notification', {
            id: Date.now(),
            type,
            message,
            data,
            read: false,
            createdAt: new Date().toISOString()
        });
    }
}

module.exports = RealTimeSyncService;
