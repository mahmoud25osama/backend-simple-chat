import { verifyToken } from '../utils/Jwt.js'
import User from '../database/models/user.js'

export const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided. Access denied.',
            })
        }

        const token = authHeader.split(' ')[1]

        // Verify token
        const decoded = verifyToken(token)

        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token.',
            })
        }

        // Get user from token
        const user = await User.findById(decoded.id).select('-password')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.',
            })
        }

        // Attach user to request
        req.user = user
        next()
    } catch (error) {
        console.error('Auth middleware error:', error)
        res.status(500).json({
            success: false,
            message: 'Authentication failed.',
        })
    }
}
