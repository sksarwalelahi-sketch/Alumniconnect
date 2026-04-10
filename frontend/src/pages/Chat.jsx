import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import {
    connectSocket,
    joinConversation,
    leaveConversation,
    sendMessage,
    sendEditMessage,
    sendDeleteMessage,
    sendTyping,
    stopTyping,
    sendVideoCallInvite,
    sendVideoCallResponse,
    sendVideoCallOffer,
    sendVideoCallAnswer,
    sendVideoCallIceCandidate,
    sendVideoCallEnd
} from '../services/socket'
import { getMediaUrl } from '../utils/media'
import toast from 'react-hot-toast'
import PageHero from '../components/PageHero'
import {
    ArrowLeftIcon,
    PaperAirplaneIcon,
    PaperClipIcon,
    DocumentTextIcon,
    ArrowDownTrayIcon,
    VideoCameraIcon,
    PhoneIcon,
    ComputerDesktopIcon,
    PhoneXMarkIcon,
    EllipsisVerticalIcon,
    PencilSquareIcon,
    TrashIcon
} from '@heroicons/react/20/solid'

const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
}

export default function Chat() {
    const { conversationId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const [conversations, setConversations] = useState([])
    const [selectedConversation, setSelectedConversation] = useState(null)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [editingMessageId, setEditingMessageId] = useState(null)
    const [contextMenu, setContextMenu] = useState(null)
    const [isChatMenuOpen, setIsChatMenuOpen] = useState(false)
    const [chatBackgroundImage, setChatBackgroundImage] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [isCallActive, setIsCallActive] = useState(false)
    const [isCallConnecting, setIsCallConnecting] = useState(false)
    const [callType, setCallType] = useState('video')
    const [incomingCall, setIncomingCall] = useState(null)
    const [pendingOutgoingCall, setPendingOutgoingCall] = useState(null)
    const [localStream, setLocalStream] = useState(null)
    const [remoteStream, setRemoteStream] = useState(null)
    const [isMicMuted, setIsMicMuted] = useState(false)
    const [isCameraOff, setIsCameraOff] = useState(false)
    const [isScreenSharing, setIsScreenSharing] = useState(false)
    const messagesEndRef = useRef(null)
    const fileInputRef = useRef(null)
    const backgroundFileInputRef = useRef(null)
    const messageInputRef = useRef(null)
    const selectedConversationRef = useRef(null)
    const peerConnectionRef = useRef(null)
    const localStreamRef = useRef(null)
    const screenStreamRef = useRef(null)
    const videoSenderRef = useRef(null)
    const audioSenderRef = useRef(null)
    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)
    const pendingOutgoingCallRef = useRef(null)
    const currentCallRef = useRef({ conversationId: null, peerId: null, callType: 'video' })
    const pendingIceCandidatesRef = useRef([])
    const disconnectTimeoutRef = useRef(null)
    const outgoingCallTimeoutRef = useRef(null)
    const editingMessageIdRef = useRef(null)

    useEffect(() => {
        selectedConversationRef.current = selectedConversation
    }, [selectedConversation])

    useEffect(() => {
        pendingOutgoingCallRef.current = pendingOutgoingCall
    }, [pendingOutgoingCall])

    useEffect(() => {
        editingMessageIdRef.current = editingMessageId
    }, [editingMessageId])

    useEffect(() => {
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream || null
        }
    }, [localStream])

    useEffect(() => {
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream || null
            if (remoteStream) {
                remoteVideoRef.current.play().catch(() => {
                    // Autoplay can be blocked until user interaction in some browsers.
                })
            }
        }
    }, [remoteStream])

    useEffect(() => {
        if (!contextMenu) return

        const closeMenu = () => setContextMenu(null)
        window.addEventListener('click', closeMenu)
        window.addEventListener('scroll', closeMenu, true)

        return () => {
            window.removeEventListener('click', closeMenu)
            window.removeEventListener('scroll', closeMenu, true)
        }
    }, [contextMenu])

    useEffect(() => {
        const savedBackground = localStorage.getItem('chat_background_image') || ''
        setChatBackgroundImage(savedBackground)
    }, [])

    useEffect(() => {
        if (!isChatMenuOpen) return

        const closeMenu = () => setIsChatMenuOpen(false)
        window.addEventListener('click', closeMenu)
        window.addEventListener('scroll', closeMenu, true)

        return () => {
            window.removeEventListener('click', closeMenu)
            window.removeEventListener('scroll', closeMenu, true)
        }
    }, [isChatMenuOpen])

    const stopScreenShare = () => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((track) => track.stop())
            screenStreamRef.current = null
        }
        setIsScreenSharing(false)
    }

    const clearDisconnectTimeout = () => {
        if (disconnectTimeoutRef.current) {
            clearTimeout(disconnectTimeoutRef.current)
            disconnectTimeoutRef.current = null
        }
    }

    const clearOutgoingCallTimeout = () => {
        if (outgoingCallTimeoutRef.current) {
            clearTimeout(outgoingCallTimeoutRef.current)
            outgoingCallTimeoutRef.current = null
        }
    }

    const stopLocalMedia = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop())
        }
        localStreamRef.current = null
        setLocalStream(null)
        stopScreenShare()
    }

    const resetCallState = () => {
        clearDisconnectTimeout()
        clearOutgoingCallTimeout()
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close()
            peerConnectionRef.current = null
        }
        videoSenderRef.current = null
        audioSenderRef.current = null
        currentCallRef.current = { conversationId: null, peerId: null, callType: 'video' }
        pendingIceCandidatesRef.current = []
        stopLocalMedia()
        setRemoteStream(null)
        setIsCallActive(false)
        setIsCallConnecting(false)
        setIncomingCall(null)
        setPendingOutgoingCall(null)
        setIsMicMuted(false)
        setIsCameraOff(false)
        setCallType('video')
    }

    const endCall = (receiverId, activeConversationId, notifyRemote = true) => {
        if (notifyRemote && receiverId && activeConversationId) {
            sendVideoCallEnd(activeConversationId, receiverId)
        }
        resetCallState()
    }

    const ensureLocalMedia = async (nextCallType = 'video') => {
        const wantsVideo = nextCallType === 'video'
        if (!localStreamRef.current) {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: wantsVideo,
                audio: true
            })
            localStreamRef.current = stream
            setLocalStream(stream)
            return stream
        }

        const stream = localStreamRef.current
        const hasAudio = stream.getAudioTracks().length > 0
        const hasVideo = stream.getVideoTracks().length > 0

        if (!hasAudio || (wantsVideo && !hasVideo)) {
            const extraStream = await navigator.mediaDevices.getUserMedia({
                video: wantsVideo && !hasVideo,
                audio: !hasAudio
            })
            extraStream.getTracks().forEach((track) => stream.addTrack(track))
            setLocalStream(new MediaStream(stream.getTracks()))
        }

        return stream
    }

    const flushPendingIceCandidates = async () => {
        const pc = peerConnectionRef.current
        if (!pc || !pc.remoteDescription) return
        const queued = pendingIceCandidatesRef.current
        pendingIceCandidatesRef.current = []
        for (const candidate of queued) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (error) {
                console.error('Queued ICE candidate error:', error)
            }
        }
    }

    const createPeerConnection = async (activeConversationId, receiverId) => {
        if (peerConnectionRef.current) return peerConnectionRef.current

        const pc = new RTCPeerConnection(rtcConfig)
        const incomingStream = new MediaStream()

        pc.ontrack = (event) => {
            incomingStream.addTrack(event.track)
            setRemoteStream(incomingStream)
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendVideoCallIceCandidate(activeConversationId, receiverId, event.candidate)
            }
        }

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') {
                clearDisconnectTimeout()
                setIsCallConnecting(false)
                return
            }

            if (['failed', 'closed'].includes(pc.connectionState)) {
                resetCallState()
                return
            }

            if (pc.connectionState === 'disconnected') {
                clearDisconnectTimeout()
                disconnectTimeoutRef.current = setTimeout(() => {
                    const currentPc = peerConnectionRef.current
                    if (!currentPc) return
                    if (['disconnected', 'failed', 'closed'].includes(currentPc.connectionState)) {
                        resetCallState()
                    }
                }, 8000)
            }
        }

        peerConnectionRef.current = pc
        return pc
    }

    const bindLocalTracksToPeerConnection = async () => {
        const pc = peerConnectionRef.current
        const stream = localStreamRef.current
        if (!pc || !stream) return

        const senders = pc.getSenders()
        if (!audioSenderRef.current) {
            audioSenderRef.current = senders.find((sender) => sender.track && sender.track.kind === 'audio') || null
        }
        if (!videoSenderRef.current) {
            videoSenderRef.current = senders.find((sender) => sender.track && sender.track.kind === 'video') || null
        }

        const audioTrack = stream.getAudioTracks()[0]
        const videoTrack = stream.getVideoTracks()[0]

        if (audioSenderRef.current) {
            await audioSenderRef.current.replaceTrack(audioTrack || null)
        } else if (audioTrack) {
            audioSenderRef.current = pc.addTrack(audioTrack, stream)
        }

        if (videoSenderRef.current) {
            await videoSenderRef.current.replaceTrack(videoTrack || null)
        } else if (videoTrack) {
            videoSenderRef.current = pc.addTrack(videoTrack, stream)
        }
    }

    const applyVoiceMode = async () => {
        setCallType('voice')
        setIsCameraOff(true)
        stopScreenShare()

        if (videoSenderRef.current) {
            await videoSenderRef.current.replaceTrack(null)
        }
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach((track) => {
                track.stop()
                localStreamRef.current.removeTrack(track)
            })
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()))
        }
        currentCallRef.current.callType = 'voice'
    }

    const applyVideoMode = async () => {
        const stream = await ensureLocalMedia('video')
        const videoTrack = stream.getVideoTracks()[0]
        if (!videoTrack) {
            throw new Error('Video track unavailable')
        }

        if (videoSenderRef.current) {
            await videoSenderRef.current.replaceTrack(videoTrack)
        } else if (peerConnectionRef.current) {
            videoSenderRef.current = peerConnectionRef.current.addTrack(videoTrack, stream)
        }
        videoTrack.enabled = true
        setCallType('video')
        setIsCameraOff(false)
        currentCallRef.current.callType = 'video'
        setLocalStream(new MediaStream(stream.getTracks()))
    }

    const toggleCallMode = async () => {
        if (!isCallActive) return
        try {
            if (callType === 'video') {
                await applyVoiceMode()
            } else {
                await applyVideoMode()
            }
        } catch (error) {
            toast.error('Unable to switch call mode')
        }
    }

    const toggleScreenShare = async () => {
        if (!isCallActive) return
        if (callType !== 'video') {
            toast.error('Switch to video mode to share screen')
            return
        }

        try {
            if (isScreenSharing) {
                stopScreenShare()
                await applyVideoMode()
                return
            }

            const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
            const screenTrack = displayStream.getVideoTracks()[0]
            if (!screenTrack) {
                throw new Error('No screen track')
            }

            screenTrack.onended = async () => {
                stopScreenShare()
                try {
                    await applyVideoMode()
                } catch (error) {
                    resetCallState()
                }
            }

            if (videoSenderRef.current) {
                await videoSenderRef.current.replaceTrack(screenTrack)
            } else if (peerConnectionRef.current && localStreamRef.current) {
                videoSenderRef.current = peerConnectionRef.current.addTrack(screenTrack, localStreamRef.current)
            }

            if (localStreamRef.current) {
                localStreamRef.current.getVideoTracks().forEach((track) => {
                    localStreamRef.current.removeTrack(track)
                })
                localStreamRef.current.addTrack(screenTrack)
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()))
            }

            screenStreamRef.current = displayStream
            setIsScreenSharing(true)
            setIsCameraOff(false)
        } catch (error) {
            toast.error('Screen sharing failed')
        }
    }

    useEffect(() => {
        let mounted = true
        fetchConversations(mounted)
        const socket = connectSocket()
        if (!socket) return

        const onNewMessage = (message) => {
            const activeId = selectedConversationRef.current?._id
            const sameConversation = activeId && String(message.conversation) === String(activeId)

            if (sameConversation) {
                setMessages(prev => {
                    if (prev.some(m => m._id === message._id)) return prev
                    return [...prev, message]
                })
            }

            setConversations(prev => {
                const messageConversationId = String(message.conversation)
                const activeConversationId = selectedConversationRef.current?._id
                const userId = getCurrentUserId()
                const isOwnMessage = String(message.sender?._id || message.sender) === String(userId)

                const index = prev.findIndex(c => String(c._id) === messageConversationId)
                if (index === -1) return prev

                const next = [...prev]
                const current = next[index]
                const shouldIncrementUnread = !isOwnMessage && String(activeConversationId) !== messageConversationId

                next[index] = {
                    ...current,
                    lastMessage: message,
                    lastMessageAt: message.createdAt || new Date().toISOString(),
                    unreadCount: shouldIncrementUnread ? (current.unreadCount || 0) + 1 : current.unreadCount || 0
                }

                const [updated] = next.splice(index, 1)
                return [updated, ...next]
            })
        }

        const onMessageUpdated = (updatedMessage) => {
            setMessages(prev => prev.map((item) => (
                String(item._id) === String(updatedMessage._id) ? updatedMessage : item
            )))
        }

        const onMessageDeleted = ({ conversationId: changedConversationId, messageId }) => {
            if (String(selectedConversationRef.current?._id) !== String(changedConversationId)) return
            setMessages(prev => prev.filter((item) => String(item._id) !== String(messageId)))
            if (String(editingMessageIdRef.current) === String(messageId)) {
                setEditingMessageId(null)
                setNewMessage('')
            }
        }

        const onConversationUpdated = ({ conversationId: changedConversationId, lastMessage, lastMessageAt }) => {
            setConversations(prev => {
                const idx = prev.findIndex((item) => String(item._id) === String(changedConversationId))
                if (idx === -1) return prev
                const next = [...prev]
                next[idx] = {
                    ...next[idx],
                    lastMessage: lastMessage || null,
                    lastMessageAt: lastMessageAt !== undefined ? lastMessageAt : next[idx].lastMessageAt
                }
                return next
            })
        }

        const onMessageError = ({ error }) => {
            if (error) {
                toast.error(error)
            }
        }

        const onUserTyping = ({ conversationId }) => {
            if (String(conversationId) === String(selectedConversationRef.current?._id)) {
                setIsTyping(true)
            }
        }

        const onUserStoppedTyping = ({ conversationId }) => {
            if (String(conversationId) === String(selectedConversationRef.current?._id)) {
                setIsTyping(false)
            }
        }

        const onVideoCallInvite = ({ conversationId: callConversationId, callerId, callType: incomingCallType = 'video' }) => {
            setIncomingCall({ conversationId: callConversationId, callerId, callType: incomingCallType })
            toast(`Incoming ${incomingCallType} call`)
        }

        const onVideoCallResponse = async ({ conversationId: callConversationId, responderId, accepted, callType: acceptedCallType = 'video' }) => {
            const pendingCall = pendingOutgoingCallRef.current
            if (!pendingCall) return
            if (String(pendingCall.conversationId) !== String(callConversationId)) return
            if (String(pendingCall.receiverId) !== String(responderId)) return
            clearOutgoingCallTimeout()

            if (!accepted) {
                toast.error('Call was declined')
                resetCallState()
                return
            }

            try {
                currentCallRef.current = {
                    conversationId: callConversationId,
                    peerId: responderId,
                    callType: acceptedCallType
                }
                setCallType(acceptedCallType)
                setIsCallConnecting(true)
                await ensureLocalMedia(acceptedCallType)
                const pc = await createPeerConnection(callConversationId, responderId)
                await bindLocalTracksToPeerConnection()
                const offer = await pc.createOffer()
                await pc.setLocalDescription(offer)
                sendVideoCallOffer(callConversationId, responderId, offer, acceptedCallType)
                setIsCallActive(true)
                if (acceptedCallType === 'voice') {
                    setIsCameraOff(true)
                }
            } catch (error) {
                toast.error('Unable to start call')
                resetCallState()
            }
        }

        const onVideoCallOffer = async ({ conversationId: callConversationId, senderId, sdp, callType: offerCallType = 'video' }) => {
            try {
                currentCallRef.current = {
                    conversationId: callConversationId,
                    peerId: senderId,
                    callType: offerCallType
                }
                setCallType(offerCallType)
                await ensureLocalMedia(offerCallType)
                const pc = await createPeerConnection(callConversationId, senderId)
                await pc.setRemoteDescription(new RTCSessionDescription(sdp))
                await bindLocalTracksToPeerConnection()
                await flushPendingIceCandidates()
                const answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)
                sendVideoCallAnswer(callConversationId, senderId, answer, offerCallType)
                setIsCallConnecting(false)
                setIsCallActive(true)
                setIncomingCall(null)
                if (offerCallType === 'voice') {
                    setIsCameraOff(true)
                }
            } catch (error) {
                toast.error('Failed to connect call')
                resetCallState()
            }
        }

        const onVideoCallAnswer = async ({ conversationId: callConversationId, senderId, sdp, callType: answerCallType = 'video' }) => {
            const pendingCall = pendingOutgoingCallRef.current
            if (!pendingCall) return
            if (String(pendingCall.conversationId) !== String(callConversationId)) return
            if (String(pendingCall.receiverId) !== String(senderId)) return

            try {
                const pc = peerConnectionRef.current
                if (!pc) return
                await pc.setRemoteDescription(new RTCSessionDescription(sdp))
                await flushPendingIceCandidates()
                setCallType(answerCallType)
                currentCallRef.current.callType = answerCallType
                setIsCallConnecting(false)
                setIsCallActive(true)
                setPendingOutgoingCall(null)
                if (answerCallType === 'voice') {
                    setIsCameraOff(true)
                }
            } catch (error) {
                toast.error('Failed to complete call setup')
                resetCallState()
            }
        }

        const onVideoCallIceCandidate = async ({ candidate }) => {
            const pc = peerConnectionRef.current
            if (!candidate) return
            if (!pc || !pc.remoteDescription) {
                pendingIceCandidatesRef.current.push(candidate)
                return
            }
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (error) {
                console.error('ICE candidate error:', error)
            }
        }

        const onVideoCallEnd = () => {
            toast('Call ended')
            resetCallState()
        }

        socket.on('new_message', onNewMessage)
        socket.on('message_updated', onMessageUpdated)
        socket.on('message_deleted', onMessageDeleted)
        socket.on('conversation_updated', onConversationUpdated)
        socket.on('message_error', onMessageError)
        socket.on('user_typing', onUserTyping)
        socket.on('user_stopped_typing', onUserStoppedTyping)
        socket.on('video_call_invite', onVideoCallInvite)
        socket.on('video_call_response', onVideoCallResponse)
        socket.on('video_call_offer', onVideoCallOffer)
        socket.on('video_call_answer', onVideoCallAnswer)
        socket.on('video_call_ice_candidate', onVideoCallIceCandidate)
        socket.on('video_call_end', onVideoCallEnd)

        return () => {
            mounted = false
            socket.off('new_message', onNewMessage)
            socket.off('message_updated', onMessageUpdated)
            socket.off('message_deleted', onMessageDeleted)
            socket.off('conversation_updated', onConversationUpdated)
            socket.off('message_error', onMessageError)
            socket.off('user_typing', onUserTyping)
            socket.off('user_stopped_typing', onUserStoppedTyping)
            socket.off('video_call_invite', onVideoCallInvite)
            socket.off('video_call_response', onVideoCallResponse)
            socket.off('video_call_offer', onVideoCallOffer)
            socket.off('video_call_answer', onVideoCallAnswer)
            socket.off('video_call_ice_candidate', onVideoCallIceCandidate)
            socket.off('video_call_end', onVideoCallEnd)
            if (selectedConversationRef.current?._id) {
                leaveConversation(selectedConversationRef.current._id)
            }
            resetCallState()
        }
    }, [user?.id, user?._id])

    useEffect(() => {
        if (conversationId && conversations.length > 0) {
            if (String(selectedConversationRef.current?._id) === String(conversationId)) return
            const conv = conversations.find(c => c._id === conversationId)
            if (conv) {
                selectConversation(conv)
            }
        }
    }, [conversationId, conversations])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const fetchConversations = async (mounted = true) => {
        try {
            const response = await api.get('/chat/conversations')
            if (!mounted) return
            const list = response.data.data.conversations || []
            setConversations(list)
            if (!selectedConversationRef.current && list.length > 0 && !conversationId) {
                selectConversation(list[0])
            }
        } catch (error) {
            toast.error('Failed to load conversations')
        } finally {
            if (mounted) setLoading(false)
        }
    }

    const selectConversation = async (conversation) => {
        const previousId = selectedConversationRef.current?._id
        if (previousId && String(previousId) !== String(conversation._id)) {
            leaveConversation(previousId)
        }

        setSelectedConversation(conversation)
        setMessages([])
        setEditingMessageId(null)
        setContextMenu(null)
        setNewMessage('')
        setConversations(prev =>
            prev.map(c => (String(c._id) === String(conversation._id) ? { ...c, unreadCount: 0 } : c))
        )
        joinConversation(conversation._id)

        try {
            const response = await api.get(`/chat/messages/${conversation._id}`)
            setMessages(response.data.data.messages || [])
        } catch (error) {
            toast.error('Failed to load messages')
        }
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const openParticipantProfile = (participant, event) => {
        if (event) {
            event.stopPropagation()
        }

        if (!participant?.profileId || !participant?.role) {
            toast.error('Profile not available')
            return
        }

        navigate(`/profile/${participant.profileId}?role=${participant.role}`)
    }

    const getCurrentUserId = () => String(user?.id || user?._id || '')

    const isOwnMessage = (message) => String(message?.sender?._id || message?.sender) === getCurrentUserId()

    const handleMessageContextMenu = (event, message) => {
        if (!isOwnMessage(message)) return
        event.preventDefault()
        setContextMenu({
            x: event.clientX,
            y: event.clientY,
            messageId: message._id
        })
    }

    const beginEditingMessage = (messageId) => {
        const targetMessage = messages.find((item) => String(item._id) === String(messageId))
        if (!targetMessage || !isOwnMessage(targetMessage)) return
        setContextMenu(null)
        setEditingMessageId(targetMessage._id)
        setNewMessage(targetMessage.message || '')
        messageInputRef.current?.focus()
    }

    const handleDeleteMessage = (messageId) => {
        if (!selectedConversation?._id) return
        setContextMenu(null)
        sendDeleteMessage({
            conversationId: selectedConversation._id,
            messageId
        })
    }

    const cancelEditing = () => {
        setEditingMessageId(null)
        setNewMessage('')
    }

    const openBackgroundPicker = () => {
        setIsChatMenuOpen(false)
        backgroundFileInputRef.current?.click()
    }

    const removeChatBackground = () => {
        setIsChatMenuOpen(false)
        setChatBackgroundImage('')
        localStorage.removeItem('chat_background_image')
    }

    const handleBackgroundFileSelected = (event) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file')
            event.target.value = ''
            return
        }

        const reader = new FileReader()
        reader.onload = () => {
            const imageData = typeof reader.result === 'string' ? reader.result : ''
            if (!imageData) return
            setChatBackgroundImage(imageData)
            localStorage.setItem('chat_background_image', imageData)
            toast.success('Chat background updated')
        }
        reader.onerror = () => {
            toast.error('Failed to read image')
        }
        reader.readAsDataURL(file)
        event.target.value = ''
    }

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!newMessage.trim() || !selectedConversation) return
        setSending(true)
        setContextMenu(null)
        const activeEditingMessageId = editingMessageId
        const messageText = newMessage
        setNewMessage('')

        try {
            if (activeEditingMessageId) {
                sendEditMessage({
                    conversationId: selectedConversation._id,
                    messageId: activeEditingMessageId,
                    message: messageText
                })
                setEditingMessageId(null)
                setSending(false)
                return
            }

            const otherParticipant = selectedConversation.otherParticipant
            sendMessage({
                conversationId: selectedConversation._id,
                receiverId: otherParticipant._id,
                message: messageText,
                messageType: 'text'
            })
        } catch (error) {
            toast.error('Failed to send message')
            setNewMessage(messageText)
            if (activeEditingMessageId) {
                setEditingMessageId(activeEditingMessageId)
            }
        } finally {
            setSending(false)
        }
    }

    const handleFilePick = () => {
        fileInputRef.current?.click()
    }

    const handleFileSelected = async (e) => {
        const file = e.target.files?.[0]
        if (!file || !selectedConversation) return

        try {
            const formData = new FormData()
            formData.append('file', file)

            const uploadRes = await api.post('/chat/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })

            const { url, mimeType, originalName } = uploadRes.data.data
            const otherParticipant = selectedConversation.otherParticipant
            const isImage = mimeType?.startsWith('image/')

            sendMessage({
                conversationId: selectedConversation._id,
                receiverId: otherParticipant._id,
                message: originalName || 'Attachment',
                messageType: isImage ? 'image' : 'file',
                attachmentUrl: url
            })
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to upload file')
        } finally {
            e.target.value = ''
        }
    }

    const handleTyping = () => {
        if (selectedConversation) {
            const otherParticipant = selectedConversation.otherParticipant
            sendTyping(selectedConversation._id, otherParticipant._id)
            setTimeout(() => {
                stopTyping(selectedConversation._id, otherParticipant._id)
            }, 3000)
        }
    }

    const handleStartCall = async (nextCallType = 'video') => {
        if (!selectedConversation?.otherParticipant?._id) return
        try {
            await ensureLocalMedia(nextCallType)
            const callData = {
                conversationId: selectedConversation._id,
                receiverId: selectedConversation.otherParticipant._id,
                callType: nextCallType
            }
            currentCallRef.current = {
                conversationId: callData.conversationId,
                peerId: callData.receiverId,
                callType: nextCallType
            }
            setCallType(nextCallType)
            setIsCameraOff(nextCallType === 'voice')
            setPendingOutgoingCall(callData)
            setIsCallConnecting(true)
            setIsCallActive(true)
            clearOutgoingCallTimeout()
            outgoingCallTimeoutRef.current = setTimeout(() => {
                toast.error('Call timed out')
                resetCallState()
            }, 30000)
            sendVideoCallInvite(callData.conversationId, callData.receiverId, callData.callType)
            toast(`${nextCallType === 'voice' ? 'Voice' : 'Video'} calling...`)
        } catch (error) {
            toast.error('Please allow camera and microphone access')
            resetCallState()
        }
    }

    const handleAcceptIncomingCall = async () => {
        if (!incomingCall) return
        try {
            const acceptedCallType = incomingCall.callType || 'video'
            currentCallRef.current = {
                conversationId: incomingCall.conversationId,
                peerId: incomingCall.callerId,
                callType: acceptedCallType
            }
            setCallType(acceptedCallType)
            await ensureLocalMedia(acceptedCallType)
            setIsCameraOff(acceptedCallType === 'voice')
            setIsCallActive(true)
            setIsCallConnecting(true)
            sendVideoCallResponse(incomingCall.conversationId, incomingCall.callerId, true, acceptedCallType)
        } catch (error) {
            toast.error('Please allow camera and microphone access')
            sendVideoCallResponse(incomingCall.conversationId, incomingCall.callerId, false, incomingCall.callType || 'video')
            resetCallState()
        }
    }

    const handleRejectIncomingCall = () => {
        if (!incomingCall) return
        sendVideoCallResponse(incomingCall.conversationId, incomingCall.callerId, false, incomingCall.callType || 'video')
        setIncomingCall(null)
    }

    const handleEndCall = () => {
        const receiverId = currentCallRef.current.peerId || pendingOutgoingCall?.receiverId || incomingCall?.callerId || selectedConversation?.otherParticipant?._id
        const activeConversationId = currentCallRef.current.conversationId || pendingOutgoingCall?.conversationId || incomingCall?.conversationId || selectedConversation?._id
        endCall(receiverId, activeConversationId, true)
    }

    const toggleMic = () => {
        if (!localStreamRef.current) return
        const nextMuted = !isMicMuted
        localStreamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = !nextMuted
        })
        setIsMicMuted(nextMuted)
    }

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const getFileName = (message) => {
        if (message?.message && message.message !== 'Attachment') return message.message
        if (!message?.attachmentUrl) return 'Document'
        const raw = message.attachmentUrl.split('/').pop() || 'Document'
        return decodeURIComponent(raw)
    }

    const getFileTypeLabel = (message) => {
        const fileName = getFileName(message)
        const parts = fileName.split('.')
        if (parts.length < 2) return 'FILE'
        return parts.pop().toUpperCase()
    }

    const messagesAreaStyle = chatBackgroundImage
        ? {
            backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.72)), url(${chatBackgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
        }
        : undefined

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <PageHero
                title="Messages"
                subtitle="Real-time chat, file sharing, and voice/video calls in one workspace."
                icon={PaperAirplaneIcon}
            />

            <div className="h-[calc(100vh-14rem)] flex rounded-2xl overflow-hidden border border-white/80 glass-panel shadow-xl shadow-blue-100/30">
                <div className={`w-full md:w-80 border-r border-gray-200/80 bg-white/75 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-gray-200/80">
                    <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                            No conversations yet. Start a mentorship to chat!
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <button
                                key={conv._id}
                                onClick={() => selectConversation(conv)}
                                className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition-colors ${selectedConversation?._id === conv._id ? 'bg-primary-50' : ''}`}
                            >
                                <div
                                    className="w-12 h-12 bg-primary-100 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 cursor-pointer"
                                    onClick={(e) => openParticipantProfile(conv.otherParticipant, e)}
                                    title="View profile"
                                >
                                    {conv.otherParticipant?.profilePhoto ? (
                                        <img
                                            src={getMediaUrl(conv.otherParticipant.profilePhoto)}
                                            alt={conv.otherParticipant?.name || 'User'}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-primary-700 font-semibold">
                                            {conv.otherParticipant?.name?.charAt(0)?.toUpperCase() || 'U'}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-medium text-gray-900 truncate">{conv.otherParticipant?.name}</h3>
                                        {conv.lastMessageAt && (
                                            <span className="text-xs text-gray-500">{formatTime(conv.lastMessageAt)}</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 truncate">
                                        {conv.lastMessage?.message || 'No messages yet'}
                                    </p>
                                    {conv.unreadCount > 0 && (
                                        <span className="bg-primary-600 text-white text-xs py-0.5 px-2 rounded-full">
                                            {conv.unreadCount}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

                <div className={`flex-1 flex flex-col bg-white/60 ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
                {selectedConversation ? (
                    <>
                        <div className="p-4 border-b border-gray-200/80 flex items-center justify-between bg-white/70">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => setSelectedConversation(null)}
                                    className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <ArrowLeftIcon className="w-5 h-5" />
                                </button>
                                <div
                                    className="w-10 h-10 bg-primary-100 rounded-full overflow-hidden flex items-center justify-center cursor-pointer"
                                    onClick={(e) => openParticipantProfile(selectedConversation.otherParticipant, e)}
                                    title="View profile"
                                >
                                    {selectedConversation.otherParticipant?.profilePhoto ? (
                                        <img
                                            src={getMediaUrl(selectedConversation.otherParticipant.profilePhoto)}
                                            alt={selectedConversation.otherParticipant?.name || 'User'}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-primary-700 font-semibold">
                                            {selectedConversation.otherParticipant?.name?.charAt(0)?.toUpperCase() || 'U'}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <h3
                                        className="font-medium text-gray-900 cursor-pointer hover:underline"
                                        onClick={(e) => openParticipantProfile(selectedConversation.otherParticipant, e)}
                                        title="View profile"
                                    >
                                        {selectedConversation.otherParticipant?.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 capitalize">{selectedConversation.otherParticipant?.role}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 relative">
                                <input
                                    ref={backgroundFileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleBackgroundFileSelected}
                                />
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation()
                                        setIsChatMenuOpen((prev) => !prev)
                                    }}
                                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                                    title="Chat options"
                                >
                                    <EllipsisVerticalIcon className="w-5 h-5" />
                                </button>
                                {isChatMenuOpen && (
                                    <div
                                        className="absolute right-0 top-11 z-40 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        <button
                                            type="button"
                                            onClick={openBackgroundPicker}
                                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                        >
                                            Set background image
                                        </button>
                                        <button
                                            type="button"
                                            onClick={removeChatBackground}
                                            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                        >
                                            Remove background
                                        </button>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleStartCall('video')}
                                    disabled={isCallActive}
                                    className="p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                    title="Start video call"
                                >
                                    <VideoCameraIcon className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleStartCall('voice')}
                                    disabled={isCallActive}
                                    className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                    title="Start voice call"
                                >
                                    <PhoneIcon className="w-5 h-5" />
                                </button>
                            </div>
                            {isCallActive && (
                                <>
                                    <button
                                        type="button"
                                        onClick={toggleCallMode}
                                        className="ml-2 px-3 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300"
                                        title={callType === 'video' ? 'Switch to voice call' : 'Switch to video call'}
                                    >
                                        {callType === 'video' ? 'Voice Mode' : 'Video Mode'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={toggleScreenShare}
                                        disabled={callType !== 'video'}
                                        className="ml-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1"
                                        title="Share screen"
                                    >
                                        <ComputerDesktopIcon className="w-4 h-4" />
                                        <span>{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleEndCall}
                                        className="ml-2 px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-1"
                                        title="End call"
                                    >
                                        <PhoneXMarkIcon className="w-4 h-4" />
                                        <span>End Call</span>
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={messagesAreaStyle}>
                            {messages.map((message) => (
                                <div
                                    key={message._id}
                                    className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        onContextMenu={(event) => handleMessageContextMenu(event, message)}
                                        title={isOwnMessage(message) ? 'Right click for options' : ''}
                                        className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${isOwnMessage(message) ? 'chat-message-sent rounded-br-none' : 'chat-message-received rounded-bl-none'}`}
                                    >
                                        {message.messageType === 'image' && message.attachmentUrl ? (
                                            <img
                                                src={getMediaUrl(message.attachmentUrl)}
                                                alt={message.message || 'Image'}
                                                className="rounded-lg max-h-64"
                                            />
                                        ) : message.messageType === 'file' && message.attachmentUrl ? (
                                            <a
                                                href={getMediaUrl(message.attachmentUrl)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block no-underline"
                                            >
                                                <div className={`rounded-xl border px-3 py-2 ${isOwnMessage(message) ? 'border-primary-300 bg-primary-500/20' : 'border-gray-200 bg-white'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOwnMessage(message) ? 'bg-primary-100' : 'bg-gray-100'}`}>
                                                            <DocumentTextIcon className="w-6 h-6 text-gray-600" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium truncate">
                                                                {getFileName(message)}
                                                            </p>
                                                            <p className={`text-xs ${isOwnMessage(message) ? 'text-primary-100' : 'text-gray-500'}`}>
                                                                {getFileTypeLabel(message)} file
                                                            </p>
                                                        </div>
                                                        <ArrowDownTrayIcon className={`w-5 h-5 ${isOwnMessage(message) ? 'text-primary-100' : 'text-gray-500'}`} />
                                                    </div>
                                                </div>
                                            </a>
                                        ) : message.attachmentUrl ? (
                                            <a
                                                href={getMediaUrl(message.attachmentUrl)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm underline"
                                            >
                                                {message.message || 'Download attachment'}
                                            </a>
                                        ) : (
                                            <p className="text-sm">{message.message}</p>
                                        )}
                                        <p className={`text-xs mt-1 ${isOwnMessage(message) ? 'text-primary-200' : 'text-gray-400'}`}>
                                            {formatTime(message.createdAt)}{message.editedAt ? ' (edited)' : ''}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-none">
                                        <span className="text-sm text-gray-500">Typing...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200/80 bg-white/75">
                            {editingMessageId && (
                                <div className="mb-2 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                    <span>Editing message</span>
                                    <button type="button" onClick={cancelEditing} className="font-medium hover:underline">
                                        Cancel
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center space-x-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.jpeg,.jpg,.png"
                                    onChange={handleFileSelected}
                                />
                                <button
                                    type="button"
                                    onClick={handleFilePick}
                                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                                >
                                    <PaperClipIcon className="w-5 h-5" />
                                </button>
                                <input
                                    ref={messageInputRef}
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={handleTyping}
                                    placeholder={editingMessageId ? 'Edit your message...' : 'Type a message...'}
                                    className="input flex-1"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || sending}
                                    className="btn btn-primary p-2"
                                >
                                    {editingMessageId ? 'Save' : <PaperAirplaneIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-gray-500">Select a conversation to start messaging</p>
                        </div>
                    </div>
                )}
                </div>
            </div>

            {contextMenu && (
                <div
                    className="fixed z-50 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button
                        type="button"
                        onClick={() => beginEditingMessage(contextMenu.messageId)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                        <PencilSquareIcon className="h-4 w-4" />
                        <span>Edit</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDeleteMessage(contextMenu.messageId)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                        <TrashIcon className="h-4 w-4" />
                        <span>Delete</span>
                    </button>
                </div>
            )}

            {incomingCall && !isCallActive && (
                <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                            Incoming {incomingCall.callType === 'voice' ? 'voice' : 'video'} call
                        </h4>
                        <p className="text-sm text-gray-600 mb-5">
                            Accept to allow {incomingCall.callType === 'voice' ? 'microphone and speaker' : 'camera, microphone, and speaker'} in real time.
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleAcceptIncomingCall}
                                className="flex-1 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
                            >
                                Accept
                            </button>
                            <button
                                type="button"
                                onClick={handleRejectIncomingCall}
                                className="flex-1 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isCallActive && (
                <div className="fixed inset-0 z-50 bg-black flex flex-col">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
                        <div className="relative rounded-xl overflow-hidden bg-gray-900">
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />
                            {!remoteStream && (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">
                                    {isCallConnecting ? 'Connecting call...' : (callType === 'voice' ? 'Voice call connected' : 'Waiting for remote video...')}
                                </div>
                            )}
                        </div>
                        <div className="relative rounded-xl overflow-hidden bg-gray-900">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                            />
                            {!localStream && (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">
                                    {callType === 'voice' ? 'Microphone active' : 'Waiting for local camera...'}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-4 flex items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={toggleMic}
                            className={`px-4 py-2 rounded-lg ${isMicMuted ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-800'}`}
                        >
                            {isMicMuted ? 'Unmute mic' : 'Mute mic'}
                        </button>
                        <button
                            type="button"
                            onClick={toggleCallMode}
                            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800"
                        >
                            {callType === 'video' ? 'Switch to Voice' : 'Switch to Video'}
                        </button>
                        <button
                            type="button"
                            onClick={toggleScreenShare}
                            disabled={callType !== 'video'}
                            className={`px-4 py-2 rounded-lg ${callType !== 'video' ? 'bg-gray-300 text-gray-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                        >
                            {isScreenSharing ? 'Stop Share' : 'Share Screen'}
                        </button>
                        <button
                            type="button"
                            onClick={handleEndCall}
                            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
                            title="End call"
                        >
                            <PhoneXMarkIcon className="w-6 h-6" />
                            <span>End Call</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
