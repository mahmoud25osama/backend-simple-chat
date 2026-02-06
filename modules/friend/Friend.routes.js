import express from 'express'
import {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getFriends,
    getPendingRequests,
    searchUsers,
    removeFriend,
} from './Friendcontroller.js'
import { authenticate } from '../../middleware/auth.js'

const router = express.Router()

router.use(authenticate)

// Get user's friends
router.get('/', getFriends)

// Search for users
router.get('/search', searchUsers)

// Get pending friend requests
router.get('/requests/pending', getPendingRequests)

// Send friend request
router.post('/request/:userId', sendFriendRequest)

// Accept friend request
router.put('/accept/:requestId', acceptFriendRequest)

// Reject friend request
router.put('/reject/:requestId', rejectFriendRequest)

// Remove friend
router.delete('/:userId', removeFriend)

export default router
