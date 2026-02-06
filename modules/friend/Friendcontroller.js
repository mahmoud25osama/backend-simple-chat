import FriendRequest from '../../database/models/Friendrequest.js'
import User from '../../database/models/user.js'

// @desc    Send friend request
// @route   POST /api/friends/request/:userId
// @access  Private
export const sendFriendRequest = async (req, res) => {
    try {
        const senderId = req.user._id
        const recipientId = req.params.userId

        console.log(
            '📤 Sending friend request from',
            senderId,
            'to',
            recipientId
        )

        // Check if trying to add self
        if (senderId.toString() === recipientId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot send friend request to yourself',
            })
        }

        // Check if recipient exists
        const recipient = await User.findById(recipientId)
        if (!recipient) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            })
        }

        // Check if request already exists
        const existingRequest = await FriendRequest.findOne({
            $or: [
                { sender: senderId, recipient: recipientId },
                { sender: recipientId, recipient: senderId },
            ],
        })

        if (existingRequest) {
            if (existingRequest.status === 'accepted') {
                return res.status(400).json({
                    success: false,
                    message: 'Already friends',
                })
            } else if (existingRequest.status === 'pending') {
                return res.status(400).json({
                    success: false,
                    message: 'Friend request already sent',
                })
            }
        }

        // Create friend request
        const friendRequest = await FriendRequest.create({
            sender: senderId,
            recipient: recipientId,
        })

        await friendRequest.populate([
            { path: 'sender', select: 'username avatar' },
            { path: 'recipient', select: 'username avatar' },
        ])

        console.log('✅ Friend request sent successfully')

        res.status(201).json({
            success: true,
            message: 'Friend request sent',
            data: { friendRequest },
        })
    } catch (error) {
        console.error('Send friend request error:', error)
        res.status(500).json({
            success: false,
            message: 'Server error sending friend request',
        })
    }
}

// @desc    Accept friend request
// @route   PUT /api/friends/accept/:requestId
// @access  Private
export const acceptFriendRequest = async (req, res) => {
    try {
        const requestId = req.params.requestId
        const userId = req.user._id

        const friendRequest = await FriendRequest.findById(requestId)

        if (!friendRequest) {
            return res.status(404).json({
                success: false,
                message: 'Friend request not found',
            })
        }

        // Check if current user is the recipient
        if (friendRequest.recipient.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to accept this request',
            })
        }

        friendRequest.status = 'accepted'
        await friendRequest.save()

        await friendRequest.populate([
            { path: 'sender', select: 'username avatar isOnline' },
            { path: 'recipient', select: 'username avatar isOnline' },
        ])

        console.log('✅ Friend request accepted')

        res.status(200).json({
            success: true,
            message: 'Friend request accepted',
            data: { friendRequest },
        })
    } catch (error) {
        console.error('Accept friend request error:', error)
        res.status(500).json({
            success: false,
            message: 'Server error accepting friend request',
        })
    }
}

// @desc    Reject friend request
// @route   PUT /api/friends/reject/:requestId
// @access  Private
export const rejectFriendRequest = async (req, res) => {
    try {
        const requestId = req.params.requestId
        const userId = req.user._id

        const friendRequest = await FriendRequest.findById(requestId)

        if (!friendRequest) {
            return res.status(404).json({
                success: false,
                message: 'Friend request not found',
            })
        }

        // Check if current user is the recipient
        if (friendRequest.recipient.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to reject this request',
            })
        }

        friendRequest.status = 'rejected'
        await friendRequest.save()

        console.log('✅ Friend request rejected')

        res.status(200).json({
            success: true,
            message: 'Friend request rejected',
        })
    } catch (error) {
        console.error('Reject friend request error:', error)
        res.status(500).json({
            success: false,
            message: 'Server error rejecting friend request',
        })
    }
}

// @desc    Get user's friends
// @route   GET /api/friends
// @access  Private
export const getFriends = async (req, res) => {
    try {
        const userId = req.user._id

        const friends = await FriendRequest.getUserFriends(userId)

        res.status(200).json({
            success: true,
            data: { friends },
        })
    } catch (error) {
        console.error('Get friends error:', error)
        res.status(500).json({
            success: false,
            message: 'Server error fetching friends',
        })
    }
}

// @desc    Get pending friend requests (received)
// @route   GET /api/friends/requests/pending
// @access  Private
export const getPendingRequests = async (req, res) => {
    try {
        const userId = req.user._id

        const requests = await FriendRequest.find({
            recipient: userId,
            status: 'pending',
        })
            .populate('sender', 'username avatar isOnline')
            .sort({ createdAt: -1 })

        res.status(200).json({
            success: true,
            data: { requests },
        })
    } catch (error) {
        console.error('Get pending requests error:', error)
        res.status(500).json({
            success: false,
            message: 'Server error fetching pending requests',
        })
    }
}

// @desc    Search users (not friends)
// @route   GET /api/friends/search?q=query
// @access  Private
export const searchUsers = async (req, res) => {
    try {
        const userId = req.user._id
        const query = req.query.q

        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required',
            })
        }

        // Search for users by username or email
        const users = await User.find({
            _id: { $ne: userId }, // Exclude current user
            $or: [
                { username: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
            ],
        })
            .select('username email avatar isOnline')
            .limit(20)

        // Get user's friends and pending requests
        const friendships = await FriendRequest.find({
            $or: [{ sender: userId }, { recipient: userId }],
            status: { $in: ['accepted', 'pending'] },
        })

        // Create sets of friend IDs and pending request IDs
        const friendIds = new Set()
        const pendingIds = new Set()

        friendships.forEach((friendship) => {
            const otherId =
                friendship.sender.toString() === userId.toString()
                    ? friendship.recipient.toString()
                    : friendship.sender.toString()

            if (friendship.status === 'accepted') {
                friendIds.add(otherId)
            } else {
                pendingIds.add(otherId)
            }
        })

        // Add relationship status to each user
        const usersWithStatus = users.map((user) => {
            const userObj = user.toObject()
            const userIdStr = user._id.toString()

            if (friendIds.has(userIdStr)) {
                userObj.friendshipStatus = 'friends'
            } else if (pendingIds.has(userIdStr)) {
                userObj.friendshipStatus = 'pending'
            } else {
                userObj.friendshipStatus = 'none'
            }

            return userObj
        })

        res.status(200).json({
            success: true,
            data: { users: usersWithStatus },
        })
    } catch (error) {
        console.error('Search users error:', error)
        res.status(500).json({
            success: false,
            message: 'Server error searching users',
        })
    }
}

// @desc    Remove friend
// @route   DELETE /api/friends/:userId
// @access  Private
export const removeFriend = async (req, res) => {
    try {
        const userId = req.user._id
        const friendId = req.params.userId

        const friendship = await FriendRequest.findOneAndDelete({
            $or: [
                { sender: userId, recipient: friendId, status: 'accepted' },
                { sender: friendId, recipient: userId, status: 'accepted' },
            ],
        })

        if (!friendship) {
            return res.status(404).json({
                success: false,
                message: 'Friendship not found',
            })
        }

        console.log('✅ Friend removed')

        res.status(200).json({
            success: true,
            message: 'Friend removed successfully',
        })
    } catch (error) {
        console.error('Remove friend error:', error)
        res.status(500).json({
            success: false,
            message: 'Server error removing friend',
        })
    }
}
