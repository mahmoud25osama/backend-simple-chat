import express from 'express'
import {
    deleteMessage,
    getConversation,
    markMessagesAsRead,
} from './messageController.js'
import { authenticate } from '../../middleware/auth.js'

const router = express.Router()

router.use(authenticate)

router.get('/:userId', getConversation)
router.put('/read/:userId', markMessagesAsRead)
router.delete('/:messageId', deleteMessage)

export default router
