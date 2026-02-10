import { Server } from 'socket.io'
import { verifyToken } from './utils/Jwt.js'
import User from './database/models/user.js'
import Message from './database/models/Message.js'

// Store active users and their socket IDs
const activeUsers = new Map()

export const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: function (origin, callback) {
            const allowedOrigins = [
                'http://localhost:5173',
                'http://127.0.0.1:5173',
                'http://localhost:3000',
                'https://link2up.vercel.app',
            ];

            // Allow requests with no origin (mobile apps, Postman, etc.)
            if (!origin) return callback(null, true);

            if (
                allowedOrigins.includes(origin) ||
                origin.endsWith('.vercel.app')  // ← allows ALL Vercel preview URLs
            ) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
            credentials: true,
            methods: ['GET', 'POST'],
        },
    })

    // Middleware to authenticate socket connections
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token

            if (!token) {
                return next(
                    new Error('Authentication error: No token provided')
                )
            }

            const decoded = verifyToken(token)

            if (!decoded) {
                return next(new Error('Authentication error: Invalid token'))
            }

            const user = await User.findById(decoded.id)

            if (!user) {
                return next(new Error('Authentication error: User not found'))
            }

            socket.userId = user._id.toString()
            socket.username = user.username
            next()
        } catch (error) {
            console.error('Socket auth error:', error)
            next(new Error('Authentication error'))
        }
    })

    io.on('connection', async (socket) => {
        console.log(`✅ User connected: ${socket.username} (${socket.userId})`)

        // Add user to active users
        activeUsers.set(socket.userId, socket.id)

        // Update user status to online
        await User.findByIdAndUpdate(socket.userId, {
            isOnline: true,
            lastSeen: new Date(),
        })

        // Broadcast updated online users to all clients
        const onlineUserIds = Array.from(activeUsers.keys())
        io.emit('online-users', onlineUserIds)

        // Handle private messages
        socket.on('send-message', async (data) => {
            try {
                const { recipientId, content } = data

                // Save message to database
                const message = await Message.create({
                    sender: socket.userId,
                    recipient: recipientId,
                    content,
                })

                // Populate sender and recipient info
                await message.populate([
                    { path: 'sender', select: 'username avatar' },
                    { path: 'recipient', select: 'username avatar' },
                ])

                // Send message to recipient if online
                const recipientSocketId = activeUsers.get(recipientId)
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('receive-message', message)
                }

                // Send confirmation back to sender
                socket.emit('message-sent', message)
            } catch (error) {
                console.error('Send message error:', error)
                socket.emit('message-error', {
                    message: 'Failed to send message',
                })
            }
        })

        // Handle typing indicator
        socket.on('typing', (data) => {
            const { recipientId } = data
            const recipientSocketId = activeUsers.get(recipientId)

            if (recipientSocketId) {
                io.to(recipientSocketId).emit('user-typing', {
                    userId: socket.userId,
                    username: socket.username,
                })
            }
        })

        // Handle stop typing indicator
        socket.on('stop-typing', (data) => {
            const { recipientId } = data
            const recipientSocketId = activeUsers.get(recipientId)

            if (recipientSocketId) {
                io.to(recipientSocketId).emit('user-stop-typing', {
                    userId: socket.userId,
                })
            }
        })

        // Handle disconnection
        socket.on('disconnect', async () => {
            console.log(
                `❌ User disconnected: ${socket.username} (${socket.userId})`
            )

            // Remove user from active users
            activeUsers.delete(socket.userId)

            // Update user status to offline
            await User.findByIdAndUpdate(socket.userId, {
                isOnline: false,
                lastSeen: new Date(),
            })

            // Broadcast updated online users to all clients
            const onlineUserIds = Array.from(activeUsers.keys())
            io.emit('online-users', onlineUserIds)
        })
    })

    return io
}

export { activeUsers }
