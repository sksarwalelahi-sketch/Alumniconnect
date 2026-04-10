import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { connectSocket, disconnectSocket, subscribeToNotifications } from '../services/socket'
import toast from 'react-hot-toast'
import api from '../services/api'
import {
    HomeIcon,
    UsersIcon,
    UserCircleIcon,
    MagnifyingGlassIcon,
    ChatBubbleLeftRightIcon,
    UserGroupIcon,
    DocumentTextIcon,
    ArrowRightOnRectangleIcon,
    BellIcon,
    BellAlertIcon,
    Bars3Icon,
    XMarkIcon,
    AcademicCapIcon,
    PlusCircleIcon
} from '@heroicons/react/20/solid'

const studentNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
    { name: 'Find Mentors', path: '/mentors', icon: MagnifyingGlassIcon },
    { name: 'My Mentorships', path: '/mentorship-requests', icon: AcademicCapIcon },
    { name: 'Referrals', path: '/referrals', icon: DocumentTextIcon },
    { name: 'Messages', path: '/chat', icon: ChatBubbleLeftRightIcon },
    { name: 'Profile', path: '/profile', icon: UserCircleIcon }
]

const alumniNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
    { name: 'Requests', path: '/mentorship-requests', icon: UserGroupIcon },
    { name: 'Referrals', path: '/referrals', icon: DocumentTextIcon },
    { name: 'Messages', path: '/chat', icon: ChatBubbleLeftRightIcon },
    { name: 'Profile', path: '/profile', icon: UserCircleIcon }
]

const adminNavItems = [
    { name: 'Overview', path: '/admin', icon: HomeIcon },
    { name: 'Users', path: '/admin/users', icon: UsersIcon },
    { name: 'Students', path: '/admin/students', icon: AcademicCapIcon },
    { name: 'Alumni', path: '/admin/alumni', icon: UserGroupIcon },
    { name: 'Mentorships', path: '/admin/mentorships', icon: UserGroupIcon },
    { name: 'Referrals', path: '/admin/referrals', icon: DocumentTextIcon },
    { name: 'Verifications', path: '/admin/verifications', icon: BellIcon }
]

export default function Layout() {
    const { user, profile, logout } = useAuthStore()
    const navigate = useNavigate()

    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [notificationsOpen, setNotificationsOpen] = useState(false)
    const [uploadOpen, setUploadOpen] = useState(false)
    const [mediaFile, setMediaFile] = useState(null)
    const [mediaCaption, setMediaCaption] = useState('')
    const [uploading, setUploading] = useState(false)
    const notificationsRef = useRef(null)

    const navItems = user?.role === 'student'
        ? studentNavItems
        : user?.role === 'alumni'
            ? alumniNavItems
            : adminNavItems

    const getPhotoUrl = (photoPath) => {
        if (!photoPath) return ''
        if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) return photoPath
        const apiUrl = import.meta.env.VITE_API_URL || ''
        if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
            const origin = apiUrl.replace(/\/api\/?$/, '')
            return `${origin}${photoPath}`
        }
        return photoPath
    }

    useEffect(() => {
        const socket = connectSocket()
        if (socket) {
            subscribeToNotifications()

            socket.on('notification', (notification) => {
                setNotifications(prev => [notification, ...prev])
                setUnreadCount(prev => prev + 1)
                toast.success(notification.message || 'New notification')
            })

            socket.on('message_notification', (data) => {
                const notification = {
                    type: 'message',
                    message: data?.message?.message || 'New message received',
                    conversationId: data?.conversationId,
                    createdAt: new Date().toISOString()
                }
                setNotifications(prev => [notification, ...prev])
                setUnreadCount(prev => prev + 1)
                toast('New message received')
            })
        }

        return () => {
            disconnectSocket()
        }
    }, [])

    useEffect(() => {
        const onOutsideClick = (event) => {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setNotificationsOpen(false)
            }
        }

        document.addEventListener('mousedown', onOutsideClick)
        return () => document.removeEventListener('mousedown', onOutsideClick)
    }, [])

    const handleNotificationBellClick = () => {
        const nextOpen = !notificationsOpen
        setNotificationsOpen(nextOpen)
        if (nextOpen) setUnreadCount(0)
    }

    const handleNotificationClick = (notification) => {
        setNotificationsOpen(false)
        const type = notification?.type

        if (type === 'message') {
            if (notification?.conversationId) {
                navigate(`/chat/${notification.conversationId}`)
            } else {
                navigate('/chat')
            }
            return
        }

        if (type === 'mentorship') {
            navigate('/mentorship-requests')
            return
        }

        if (type === 'referral') {
            navigate('/referrals')
            return
        }

        navigate(user?.role === 'admin' ? '/admin' : '/dashboard')
    }

    const handleLogout = () => {
        disconnectSocket()
        logout()
        navigate('/login')
        toast.success('Logged out successfully')
    }

    const handleMediaSubmit = async (e) => {
        e.preventDefault()
        if (!mediaFile) return toast.error('Please choose a file')
        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('media', mediaFile)
            formData.append('caption', mediaCaption)

            await api.post('/alumni/media', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })

            toast.success('Media posted successfully')
            setUploadOpen(false)
            setMediaFile(null)
            setMediaCaption('')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to post media')
        } finally {
            setUploading(false)
        }
    }

    const getNotificationIcon = (type) => {
        if (type === 'message') return ChatBubbleLeftRightIcon
        if (type === 'mentorship') return AcademicCapIcon
        if (type === 'referral') return DocumentTextIcon
        return BellAlertIcon
    }

    return (
        <div className="min-h-screen">
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/45 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside
                className={`
                    fixed top-0 left-0 z-50 h-full w-64 text-white
                    bg-gradient-to-b from-[#0d244e] via-[#13346f] to-[#184389]
                    transform transition-transform duration-300 ease-in-out
                    lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between h-16 px-4 border-b border-white/15">
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-xl bg-white/15 ring-1 ring-white/30 flex items-center justify-center">
                                <AcademicCapIcon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-lg font-bold tracking-wide text-white">CareerBridge</span>
                        </div>
                        <button
                            className="lg:hidden p-2 rounded-md hover:bg-white/10"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.path}
                                className={({ isActive }) => `
                                    flex items-center px-3 py-2.5 text-sm font-medium rounded-xl
                                    transition-all duration-200
                                    ${isActive
                                        ? 'bg-white/15 text-white shadow-lg shadow-black/10'
                                        : 'text-blue-100 hover:text-white hover:bg-white/10'}
                                `}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <span className={`mr-3 inline-flex items-center justify-center w-7 h-7 rounded-lg ${'bg-white/10'}`}>
                                    <item.icon className="w-4 h-4" />
                                </span>
                                {item.name}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="p-4 border-t border-white/15 bg-black/10">
                        <div className="flex items-center mb-3">
                            <div className="w-10 h-10 bg-white/15 ring-1 ring-white/25 rounded-full overflow-hidden flex items-center justify-center">
                                {profile?.profilePhoto ? (
                                    <img
                                        src={getPhotoUrl(profile.profilePhoto)}
                                        alt={profile?.name || 'Profile'}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-white font-medium">
                                        {profile?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {profile?.name || 'User'}
                                </p>
                                <p className="text-xs text-blue-100/90 truncate capitalize">
                                    {user?.role}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center px-3 py-2 text-sm text-white/95 bg-white/10 hover:bg-white/20 rounded-xl"
                        >
                            <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
                            Logout
                        </button>
                    </div>
                </div>
            </aside>

            <div className="lg:pl-64">
                <header className="sticky top-0 z-30 glass-panel border-b border-white/80">
                    <div className="flex items-center justify-between h-16 px-4">
                        <button
                            className="lg:hidden p-2 rounded-md hover:bg-gray-100/80"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Bars3Icon className="w-6 h-6" />
                        </button>

                        <div className="flex items-center space-x-4" ref={notificationsRef}>
                            <button
                                onClick={handleNotificationBellClick}
                                className="relative p-2 rounded-xl hover:bg-blue-50"
                            >
                                <BellIcon className="w-6 h-6 text-blue-700" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {user?.role === 'alumni' && (
                                <>
                                    <button
                                        onClick={() => setUploadOpen(true)}
                                        className="p-2 rounded-xl hover:bg-blue-50"
                                        title="Post media"
                                    >
                                        <PlusCircleIcon className="h-6 w-6 text-blue-700" />
                                    </button>
                                </>
                            )}

                            {notificationsOpen && (
                                <div className="absolute right-4 top-14 w-80 glass-panel rounded-xl shadow-xl z-40 border border-white/80">
                                    <div className="px-4 py-3 border-b border-gray-100/80">
                                        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                                            <BellAlertIcon className="w-4 h-4 mr-2 text-blue-700" />
                                            Notifications
                                        </h3>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <p className="px-4 py-6 text-sm text-gray-500 text-center">No notifications yet</p>
                                        ) : (
                                            notifications.slice(0, 20).map((notification, index) => {
                                                const NotificationIcon = getNotificationIcon(notification?.type)
                                                return (
                                                <button
                                                    key={`${notification.createdAt || 'n'}-${index}`}
                                                    onClick={() => handleNotificationClick(notification)}
                                                    className="w-full text-left px-4 py-3 hover:bg-blue-50/70 border-b border-gray-100/80"
                                                >
                                                    <p className="text-sm text-gray-800 flex items-start">
                                                        <span className="icon-chip w-6 h-6 mr-2 mt-0.5 flex-shrink-0">
                                                            <NotificationIcon className="w-4 h-4" />
                                                        </span>
                                                        <span>{notification.message || 'New notification'}</span>
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1 capitalize">{notification.type || 'general'}</p>
                                                </button>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {uploadOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-blue-200/40 border border-white">
                            <h3 className="text-lg font-medium mb-3">Post Media</h3>
                            <form onSubmit={handleMediaSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">File</label>
                                    <input
                                        type="file"
                                        accept="image/*,video/*"
                                        onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Caption (optional)</label>
                                    <input
                                        type="text"
                                        value={mediaCaption}
                                        onChange={(e) => setMediaCaption(e.target.value)}
                                        className="input w-full"
                                        placeholder="Add a short caption"
                                    />
                                </div>
                                <div className="flex justify-end space-x-3">
                                    <button type="button" onClick={() => { setUploadOpen(false); setMediaFile(null); setMediaCaption('') }} className="btn btn-secondary">Cancel</button>
                                    <button type="submit" disabled={uploading} className="btn btn-primary">{uploading ? 'Posting...' : 'Post'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <main className="p-4 lg:p-6 relative">
                    <div className="pointer-events-none absolute inset-x-0 -top-8 h-24 bg-gradient-to-b from-blue-100/35 to-transparent" />
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
