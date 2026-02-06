import User from '../../database/models/user.js'

// @desc    Get all users except current user
// @route   GET /api/users
// @access  Private
export const getUsers = async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.user._id } })
            .select('-password')
            .sort({ isOnline: -1, username: 1 })

        res.status(200).json({
            success: true,
            data: {
                users,
            },
        })
    } catch (error) {
        console.error('Get users error:', error)
        res.status(500).json({
            success: false,
            message: 'Server error fetching users',
        })
    }
}

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
export const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            })
        }

        res.status(200).json({
            success: true,
            data: {
                user,
            },
        })
    } catch (error) {
        console.error('Get user by ID error:', error)
        res.status(500).json({
            success: false,
            message: 'Server error fetching user',
        })
    }
}
