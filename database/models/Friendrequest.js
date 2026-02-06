import mongoose from 'mongoose'

const friendRequestSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending',
        },
    },
    {
        timestamps: true,
    }
)

// Compound index to prevent duplicate requests
friendRequestSchema.index({ sender: 1, recipient: 1 }, { unique: true })

// Static method to check if friendship exists
friendRequestSchema.statics.areFriends = async function (user1Id, user2Id) {
    const friendship = await this.findOne({
        $or: [
            { sender: user1Id, recipient: user2Id, status: 'accepted' },
            { sender: user2Id, recipient: user1Id, status: 'accepted' },
        ],
    })
    return !!friendship
}

// Static method to get user's friends
friendRequestSchema.statics.getUserFriends = async function (userId) {
    const friendships = await this.find({
        $or: [
            { sender: userId, status: 'accepted' },
            { recipient: userId, status: 'accepted' },
        ],
    })
        .populate('sender', 'username avatar isOnline')
        .populate('recipient', 'username avatar isOnline')

    // Extract friend user objects
    const friends = friendships.map((friendship) => {
        if (friendship.sender._id.toString() === userId.toString()) {
            return friendship.recipient
        } else {
            return friendship.sender
        }
    })

    return friends
}

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema)

export default FriendRequest
