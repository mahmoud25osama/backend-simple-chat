import express from 'express'
import { getUsers, getUserById } from './userController.js'
import { authenticate } from '../../middleware/auth.js'

const router = express.Router()

router.use(authenticate)

router.get('/', getUsers)
router.get('/:id', getUserById)

export default router
