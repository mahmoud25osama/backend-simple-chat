import Message from '../../database/models/Message.js'

// @desc    Get conversation between two users
// @route   GET /api/messages/:userId
// @access  Private
export const getConversation = async (req, res) => {
    try {
        const { userId } = req.params
        const currentUserId = req.user._id

        const messages = await Message.getConversation(currentUserId, userId)

        // Reverse to get chronological order (oldest first)
        messages.reverse()

        res.status(200).json({
            success: true,
            data: {
                messages,
            },
        })
    } catch (error) {
        console.error('Get conversation error:', error)
        res.status(500).json({
            success: false,
            message: 'Server error fetching conversation',
        })
    }
}

// @desc    Mark messages as read
// @route   PUT /api/messages/read/:userId
// @access  Private
export const markMessagesAsRead = async (req, res) => {
    try {
        const { userId } = req.params
        const currentUserId = req.user._id

        await Message.updateMany(
            {
                sender: userId,
                recipient: currentUserId,
                isRead: false,
            },
            {
                $set: {
                    isRead: true,
                    readAt: new Date(),
                },
            }
        )

        res.status(200).json({
            success: true,
            message: 'Messages marked as read',
        })
    } catch (error) {
        console.error('Mark messages as read error:', error)
        res.status(500).json({
            success: false,
            message: 'Server error marking messages as read',
        })
    }
}

// @desc    Delete message (for current user only)
// @route   DELETE /api/messages/:messageId
// @access  Private
export const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params
        const currentUserId = req.user._id

        const message = await Message.findById(messageId)

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found',
            })
        }

        // Check if user is sender or recipient
        const isSender = message.sender.toString() === currentUserId.toString()
        const isRecipient =
            message.recipient.toString() === currentUserId.toString()

        if (!isSender && !isRecipient) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this message',
            })
        }

        // Add user to deletedBy array
        if (!message.deletedBy.includes(currentUserId)) {
            message.deletedBy.push(currentUserId)
        }

        // If both users deleted it, mark as deleted
        if (message.deletedBy.length === 2) {
            message.isDeleted = true
        }

        await message.save()

        console.log('✅ Message deleted for user:', currentUserId)

        res.status(200).json({
            success: true,
            message: 'Message deleted successfully',
            data: { messageId },
        })
    } catch (error) {
        console.error('Delete message error:', error)
        res.status(500).json({
            success: false,
            message: 'Server error deleting message',
        })
    }
}
