import User from '../../database/models/user.js'
import { generateToken } from '../../utils/Jwt.js'

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body

        console.log('📝 Registration attempt:', { username, email })

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }],
        })

        if (existingUser) {
            console.log(
                '❌ User already exists:',
                existingUser.email === email ? 'email' : 'username'
            )
            return res.status(400).json({
                success: false,
                message:
                    existingUser.email === email
                        ? 'Email already registered'
                        : 'Username already taken',
            })
        }

        // Create new user
        console.log('✅ Creating new user...')
        const user = await User.create({
            username,
            email,
            password,
        })

        console.log('✅ User created successfully:', user.username)

        // Generate token
        const token = generateToken(user._id)

        console.log('✅ Token generated')

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                },
                token,
            },
        })
    } catch (error) {
        console.error('❌ Register error:', error.message)
        console.error('Error details:', error)

        // Duplicate key error (unique constraint)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0]
            return res.status(400).json({
                success: false,
                message: `${
                    field.charAt(0).toUpperCase() + field.slice(1)
                } already exists`,
            })
        }

        // Validation error
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(
                (err) => err.message
            )
            return res.status(400).json({
                success: false,
                message: messages.join(', '),
            })
        }

        res.status(500).json({
            success: false,
            message: 'Server error during registration',
            error:
                process.env.NODE_ENV === 'development'
                    ? error.message
                    : undefined,
        })
    }
}

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
    try {
        const { email, password } = req.body

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password',
            })
        }

        // Find user and include password for comparison
        const user = await User.findOne({ email }).select('+password')

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            })
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password)

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            })
        }

        // Generate token
        const token = generateToken(user._id)

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                },
                token,
            },
        })
    } catch (error) {
        console.error('Login error:', error)
        res.status(500).json({
            success: false,
            message: 'Server error during login',
        })
    }
}

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            data: {
                user: req.user,
            },
        })
    } catch (error) {
        console.error('Get me error:', error)
        res.status(500).json({
            success: false,
            message: 'Server error',
        })
    }
}
