import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDB from './database/db.js'
import { initializeSocket } from './socket.js'
import authRoutes from './modules/auth/Auth.routes.js'
import userRoutes from './modules/user/User.route.js'
import messageRoutes from './modules/messages/Message.route.js'

import friendRoutes from './modules/friend/Friend.routes.js'

// Load environment variables
dotenv.config()

// Validate critical environment variables
console.log('🔍 Checking environment variables...')
const requiredEnvVars = {
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRE: process.env.JWT_EXPIRE,
    MONGODB_URI: process.env.MONGODB_URI,
}

let hasError = false
for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
        console.error(`❌ Missing ${key} in .env file`)
        hasError = true
    } else {
        console.log(`✅ ${key} loaded`)
    }
}

if (hasError) {
    console.error('\n⚠️  Please check your .env file in the backend directory')
    console.error('   Copy .env.example to .env and fill in the values\n')
    process.exit(1)
}

console.log('')

// Initialize Express app
const app = express()
const server = createServer(app)

// Connect to MongoDB
connectDB()

// Initialize Socket.io
const io = initializeSocket(server)

// Middleware
app.use(
    cors({
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
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Make io accessible to routes if needed
app.set('io', io)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/friends', friendRoutes)

// Health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    })
})

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack)
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
    })
})

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    })
})

// Start server
const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err)
    server.close(() => process.exit(1))
})

// Handle SIGTERM
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received, shutting down gracefully')
    server.close(() => {
        console.log('💤 Process terminated')
    })
})
