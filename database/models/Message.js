import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Sender is required'],
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Recipient is required'],
        },
        content: {
            type: String,
            required: [true, 'Message content is required'],
            trim: true,
            maxlength: [1000, 'Message must be less than 1000 characters'],
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        readAt: {
            type: Date,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        deletedBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        replyTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
        },
    },
    {
        timestamps: true,
    }
)

// Compound index for efficient querying of conversations
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 })
messageSchema.index({ recipient: 1, sender: 1, createdAt: -1 })

// Static method to get conversation between two users
messageSchema.statics.getConversation = async function (
    user1Id,
    user2Id,
    limit = 50
) {
    return this.find({
        $or: [
            { sender: user1Id, recipient: user2Id },
            { sender: user2Id, recipient: user1Id },
        ],
        deletedBy: { $ne: user1Id }, // Exclude messages deleted by current user
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('sender', 'username avatar')
        .populate('recipient', 'username avatar')
        .populate({
            path: 'replyTo',
            select: 'content sender',
            populate: {
                path: 'sender',
                select: 'username',
            },
        })
        .lean()
}

const Message = mongoose.model('Message', messageSchema)

export default Message
