import { io } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

let socket = null

export const connectSocket = () => {
    const token = localStorage.getItem('token')

    if (!token) {
        console.log('No token found, skipping socket connection')
        return null
    }

    if (socket?.connected) {
        return socket
    }

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

    socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    })

    socket.on('connect', () => {
        console.log('Socket connected:', socket.id)
    })

    socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason)
    })

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message)
    })

    return socket
}

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect()
        socket = null
    }
}

export const getSocket = () => socket

// Chat specific functions
export const joinConversation = (conversationId) => {
    if (socket) {
        socket.emit('join_conversation', conversationId)
    }
}

export const leaveConversation = (conversationId) => {
    if (socket) {
        socket.emit('leave_conversation', conversationId)
    }
}

export const sendMessage = (data) => {
    if (socket) {
        socket.emit('send_message', data)
    }
}

export const sendEditMessage = (data) => {
    if (socket) {
        socket.emit('edit_message', data)
    }
}

export const sendDeleteMessage = (data) => {
    if (socket) {
        socket.emit('delete_message', data)
    }
}

export const sendTyping = (conversationId, receiverId) => {
    if (socket) {
        socket.emit('typing', { conversationId, receiverId })
    }
}

export const stopTyping = (conversationId, receiverId) => {
    if (socket) {
        socket.emit('stop_typing', { conversationId, receiverId })
    }
}

export const markMessagesRead = (conversationId, senderId) => {
    if (socket) {
        socket.emit('mark_read', { conversationId, senderId })
    }
}

// Video call signaling functions
export const sendVideoCallInvite = (conversationId, receiverId, callType = 'video') => {
    if (socket) {
        socket.emit('video_call_invite', { conversationId, receiverId, callType })
    }
}

export const sendVideoCallResponse = (conversationId, receiverId, accepted, callType = 'video') => {
    if (socket) {
        socket.emit('video_call_response', { conversationId, receiverId, accepted, callType })
    }
}

export const sendVideoCallOffer = (conversationId, receiverId, sdp, callType = 'video') => {
    if (socket) {
        socket.emit('video_call_offer', { conversationId, receiverId, sdp, callType })
    }
}

export const sendVideoCallAnswer = (conversationId, receiverId, sdp, callType = 'video') => {
    if (socket) {
        socket.emit('video_call_answer', { conversationId, receiverId, sdp, callType })
    }
}

export const sendVideoCallIceCandidate = (conversationId, receiverId, candidate) => {
    if (socket) {
        socket.emit('video_call_ice_candidate', { conversationId, receiverId, candidate })
    }
}

export const sendVideoCallEnd = (conversationId, receiverId) => {
    if (socket) {
        socket.emit('video_call_end', { conversationId, receiverId })
    }
}

// Notification functions
export const subscribeToNotifications = () => {
    if (socket) {
        socket.emit('subscribe_notifications')
    }
}

export const unsubscribeFromNotifications = () => {
    if (socket) {
        socket.emit('unsubscribe_notifications')
    }
}
