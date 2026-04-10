import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import { getMediaUrl } from '../utils/media'
import toast from 'react-hot-toast'
import PageHero from '../components/PageHero'
import {
    UserGroupIcon,
    CheckIcon,
    XMarkIcon,
    ChatBubbleLeftRightIcon,
    CalendarIcon,
    StarIcon
} from '@heroicons/react/20/solid'

export default function MentorshipRequests() {
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('pending')
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
    const [feedbackRequest, setFeedbackRequest] = useState(null)
    const [feedbackRating, setFeedbackRating] = useState(5)
    const [feedbackComment, setFeedbackComment] = useState('')
    const [feedbackLoading, setFeedbackLoading] = useState(false)
    const [scheduleForms, setScheduleForms] = useState({})
    const [scheduleLoadingByRequest, setScheduleLoadingByRequest] = useState({})
    const { user, loading: authLoading } = useAuthStore()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    const tabs = user?.role === 'alumni'
        ? ['pending', 'approved', 'completed']
        : ['pending', 'approved', 'completed']

    useEffect(() => {
        const tabParam = searchParams.get('tab')
        if (tabParam && tabs.includes(tabParam) && tabParam !== activeTab) {
            setActiveTab(tabParam)
        }
    }, [searchParams, user?.role, activeTab])

    useEffect(() => {
        if (authLoading) return
        fetchRequests()
    }, [activeTab, user, authLoading])

    const fetchRequests = async () => {
        try {
            const endpoint = user?.role === 'alumni' && activeTab === 'pending'
                ? '/mentorship/pending'
                : `/mentorship/requests?status=${activeTab}`
            const response = await api.get(endpoint)
            setRequests(response.data.data.requests || response.data.data || [])
        } catch (error) {
            toast.error('Failed to fetch requests')
        } finally {
            setLoading(false)
        }
    }

    const respondToRequest = async (id, status) => {
        try {
            await api.put(`/mentorship/${id}/respond`, { status })
            toast.success(`Request ${status}`)
            fetchRequests()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to respond')
        }
    }

    const getStatusBadge = (status) => {
        const badges = {
            pending: 'badge-warning',
            approved: 'badge-success',
            rejected: 'badge-danger',
            completed: 'badge-info',
            cancelled: 'badge-gray'
        }
        return badges[status] || 'badge-gray'
    }

    const startChat = async (request) => {
        try {
            const otherUserId = user?.role === 'student'
                ? (request.alumni?._id || request.alumni)
                : (request.student?._id || request.student)
            if (!otherUserId) {
                toast.error('Unable to start chat')
                return
            }

            const response = await api.post('/chat/conversation', { userId: otherUserId })
            const conversation = response.data.data
            navigate(`/chat/${conversation._id}`)
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to start chat')
        }
    }

    const openCounterpartProfile = (request) => {
        const role = user?.role === 'student' ? 'alumni' : 'student'
        const profileId = user?.role === 'student'
            ? request.alumniProfile?._id
            : request.studentProfile?._id

        if (!profileId) {
            toast.error('Profile not available')
            return
        }

        navigate(`/profile/${profileId}?role=${role}`)
    }

    const openFeedbackModal = (request) => {
        setFeedbackRequest(request)
        setFeedbackRating(5)
        setFeedbackComment('')
        setFeedbackModalOpen(true)
    }

    const submitFeedback = async (e) => {
        e.preventDefault()
        if (!feedbackRequest?._id) return
        if (!feedbackComment.trim()) {
            toast.error('Please write feedback')
            return
        }

        setFeedbackLoading(true)
        try {
            await api.put(`/mentorship/${feedbackRequest._id}/complete`, {
                rating: feedbackRating,
                comment: feedbackComment.trim()
            })
            toast.success('Feedback submitted successfully')
            setFeedbackModalOpen(false)
            setFeedbackRequest(null)
            setFeedbackComment('')
            fetchRequests()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit feedback')
        } finally {
            setFeedbackLoading(false)
        }
    }

    const toggleScheduleForm = (requestId) => {
        setScheduleForms((prev) => {
            if (prev[requestId]) {
                const next = { ...prev }
                delete next[requestId]
                return next
            }

            return {
                ...prev,
                [requestId]: {
                    date: '',
                    startTime: '',
                    endTime: '',
                    topic: '',
                    notes: ''
                }
            }
        })
    }

    const updateScheduleForm = (requestId, field, value) => {
        setScheduleForms((prev) => ({
            ...prev,
            [requestId]: {
                ...(prev[requestId] || {}),
                [field]: value
            }
        }))
    }

    const submitSessionSchedule = async (requestId, e) => {
        e.preventDefault()
        const form = scheduleForms[requestId]
        if (!form?.date || !form?.startTime || !form?.endTime) {
            toast.error('Date, start time, and end time are required')
            return
        }

        setScheduleLoadingByRequest((prev) => ({ ...prev, [requestId]: true }))
        try {
            await api.post(`/mentorship/${requestId}/session`, form)
            toast.success('Session scheduled successfully')
            setScheduleForms((prev) => {
                const next = { ...prev }
                delete next[requestId]
                return next
            })
            fetchRequests()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to schedule session')
        } finally {
            setScheduleLoadingByRequest((prev) => ({ ...prev, [requestId]: false }))
        }
    }

    return (
        <div className="space-y-6">
            <PageHero
                title="Mentorship Requests"
                subtitle="Track request progress, schedule sessions, and chat with your mentorship connections."
                icon={UserGroupIcon}
            />

            <div className="glass-panel rounded-xl px-4 border-b border-gray-200">
                <nav className="flex space-x-8">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab)
                                setSearchParams({ tab })
                            }}
                            className={`py-3 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab}
                            {tab === 'pending' && (
                                <span className="ml-2 bg-yellow-100 text-yellow-800 py-0.5 px-2 rounded-full text-xs">
                                    {requests.filter(r => r.status === 'pending').length}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : requests.length === 0 ? (
                <div className="card text-center py-12">
                    <UserGroupIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No {activeTab} requests.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((request) => (
                        <div key={request._id} className="card-elevated">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                <div className="flex items-start space-x-4">
                                    <div
                                        className="w-12 h-12 bg-primary-100 rounded-full overflow-hidden flex items-center justify-center cursor-pointer"
                                        onClick={() => openCounterpartProfile(request)}
                                        title="View profile"
                                    >
                                        {(user?.role === 'student'
                                            ? request.alumniProfile?.profilePhoto
                                            : request.studentProfile?.profilePhoto) ? (
                                            <img
                                                src={getMediaUrl(user?.role === 'student'
                                                    ? request.alumniProfile?.profilePhoto
                                                    : request.studentProfile?.profilePhoto)}
                                                alt={user?.role === 'student'
                                                    ? request.alumniProfile?.name || 'User'
                                                    : request.studentProfile?.name || 'User'}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-primary-700 font-semibold">
                                                {user?.role === 'student'
                                                    ? request.alumniProfile?.name?.charAt(0)
                                                    : request.studentProfile?.name?.charAt(0)
                                                }
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <h3
                                            className="font-semibold text-gray-900 cursor-pointer hover:underline"
                                            onClick={() => openCounterpartProfile(request)}
                                            title="View profile"
                                        >
                                            {user?.role === 'student'
                                                ? request.alumniProfile?.name
                                                : request.studentProfile?.name
                                            }
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {user?.role === 'student'
                                                ? `${request.alumniProfile?.designation} at ${request.alumniProfile?.company}`
                                                : `${request.studentProfile?.college} | ${request.studentProfile?.branch}`
                                            }
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Requested on {new Date(request.createdAt).toLocaleString()}
                                        </p>
                                        {request.message && (
                                            <p className="text-sm text-gray-700 mt-2 italic">"{request.message}"</p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 md:mt-0 flex items-center space-x-4">
                                    <span className={`badge ${getStatusBadge(request.status)} capitalize`}>
                                        {request.status}
                                    </span>

                                    {request.status === 'approved' && (
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => startChat(request)}
                                                className="btn btn-primary text-sm"
                                            >
                                                <ChatBubbleLeftRightIcon className="w-4 h-4 mr-1" />
                                                Chat
                                            </button>
                                            <button
                                                onClick={() => toggleScheduleForm(request._id)}
                                                className="btn btn-secondary text-sm"
                                            >
                                                <CalendarIcon className="w-4 h-4 mr-1" />
                                                {scheduleForms[request._id] ? 'Close' : 'Schedule Session'}
                                            </button>
                                        </div>
                                    )}

                                    {user?.role === 'student' && ['approved', 'completed'].includes(request.status) && !request.studentFeedback?.rating && (
                                        <button
                                            onClick={() => openFeedbackModal(request)}
                                            className="btn btn-secondary text-sm"
                                        >
                                            Give Feedback
                                        </button>
                                    )}

                                    {user?.role === 'alumni' && request.status === 'pending' && (
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => respondToRequest(request._id, 'approved')}
                                                className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                                            >
                                                <CheckIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => respondToRequest(request._id, 'rejected')}
                                                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                            >
                                                <XMarkIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {request.status === 'approved' && scheduleForms[request._id] && (
                                <form
                                    onSubmit={(e) => submitSessionSchedule(request._id, e)}
                                    className="mt-4 p-4 border rounded-lg bg-gray-50 space-y-3"
                                >
                                    <h4 className="text-sm font-semibold text-gray-800">Schedule a Session</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <input
                                            type="date"
                                            className="input"
                                            value={scheduleForms[request._id].date}
                                            onChange={(e) => updateScheduleForm(request._id, 'date', e.target.value)}
                                            required
                                        />
                                        <input
                                            type="time"
                                            className="input"
                                            value={scheduleForms[request._id].startTime}
                                            onChange={(e) => updateScheduleForm(request._id, 'startTime', e.target.value)}
                                            required
                                        />
                                        <input
                                            type="time"
                                            className="input"
                                            value={scheduleForms[request._id].endTime}
                                            onChange={(e) => updateScheduleForm(request._id, 'endTime', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Topic (optional)"
                                        value={scheduleForms[request._id].topic}
                                        onChange={(e) => updateScheduleForm(request._id, 'topic', e.target.value)}
                                        maxLength={200}
                                    />
                                    <textarea
                                        className="input"
                                        placeholder="Notes (optional)"
                                        rows="3"
                                        value={scheduleForms[request._id].notes}
                                        onChange={(e) => updateScheduleForm(request._id, 'notes', e.target.value)}
                                        maxLength={500}
                                    />
                                    <button
                                        type="submit"
                                        className="btn btn-primary text-sm"
                                        disabled={!!scheduleLoadingByRequest[request._id]}
                                    >
                                        {scheduleLoadingByRequest[request._id] ? 'Scheduling...' : 'Confirm Session'}
                                    </button>
                                </form>
                            )}

                            {request.sessionSchedule?.length > 0 && (
                                <div className="mt-4 pt-4 border-t">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Upcoming Sessions</h4>
                                    <div className="space-y-2">
                                        {request.sessionSchedule.filter(s => s.status === 'scheduled').slice(0, 2).map((session, i) => (
                                            <div key={session._id || i} className="flex items-start text-sm text-gray-600">
                                                <CalendarIcon className="w-4 h-4 mr-2 mt-0.5 text-gray-400" />
                                                <div>
                                                    <p>
                                                        {new Date(session.date).toLocaleDateString()} | {session.startTime} - {session.endTime}
                                                        {session.topic && <span className="ml-2 text-gray-500">- {session.topic}</span>}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        Scheduled at {session.createdAt ? new Date(session.createdAt).toLocaleString() : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {feedbackModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 animate-slide-up">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Give Feedback</h2>
                        <form onSubmit={submitFeedback} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                                <div className="flex items-center space-x-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setFeedbackRating(star)}
                                            className="p-1"
                                        >
                                            <StarIcon
                                                className={`w-7 h-7 ${star <= feedbackRating ? 'text-yellow-500' : 'text-gray-300'}`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Your Feedback</label>
                                <textarea
                                    value={feedbackComment}
                                    onChange={(e) => setFeedbackComment(e.target.value)}
                                    className="input"
                                    rows="4"
                                    maxLength={500}
                                    placeholder="Share your experience with this mentor..."
                                    required
                                />
                            </div>
                            <div className="flex space-x-4">
                                <button
                                    type="button"
                                    onClick={() => setFeedbackModalOpen(false)}
                                    className="btn btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={feedbackLoading}
                                    className="btn btn-primary flex-1"
                                >
                                    {feedbackLoading ? 'Submitting...' : 'Submit Feedback'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
