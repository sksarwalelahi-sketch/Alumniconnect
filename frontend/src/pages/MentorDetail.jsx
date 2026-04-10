import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import { getMediaUrl } from '../utils/media'
import toast from 'react-hot-toast'
import PageHero from '../components/PageHero'
import {
    BuildingOfficeIcon,
    BriefcaseIcon,
    StarIcon,
    ChatBubbleLeftRightIcon,
    ArrowLeftIcon,
    CheckBadgeIcon
} from '@heroicons/react/20/solid' 

export default function MentorDetail() {
    const { id } = useParams()
    const [mentor, setMentor] = useState(null)
    const [matchScore, setMatchScore] = useState(null)
    const [loading, setLoading] = useState(true)
    const [sendingRequest, setSendingRequest] = useState(false)
    const [requestModal, setRequestModal] = useState(false)
    const [requestData, setRequestData] = useState({ message: '', goals: '' })
    const [referralModal, setReferralModal] = useState(false)
    const [referralData, setReferralData] = useState({
        targetCompany: '',
        targetRole: '',
        message: '',
        resumeUrl: '',
        linkedInUrl: ''
    })
    const { user, loading: authLoading } = useAuthStore()

    useEffect(() => {
        if (authLoading) return
        fetchMentorData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, user, authLoading])

    const fetchMentorData = async () => {
        setLoading(true)
        try {
            const mentorRes = await api.get(`/alumni/${id}`)
            let scoreData = null
            if (user?.role === 'student') {
                try {
                    const scoreRes = await api.get(`/match/score/${id}`)
                    scoreData = scoreRes.data.data
                } catch (err) {
                    // ignore score errors (e.g., 403) and continue
                    scoreData = null
                }
            }
            setMentor(mentorRes.data.data)
            setMatchScore(scoreData)
        } catch (error) {
            toast.error('Failed to load mentor details')
        } finally {
            setLoading(false)
        }
    }

    const sendMentorshipRequest = async (e) => {
        e.preventDefault()
        setSendingRequest(true)
        try {
            await api.post('/mentorship/request', {
                alumniId: id,
                message: requestData.message,
                goals: requestData.goals.split(',').map(g => g.trim())
            })
            toast.success('Mentorship request sent successfully!')
            setRequestModal(false)
            setRequestData({ message: '', goals: '' })
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send request')
        } finally {
            setSendingRequest(false)
        }
    }

    const sendReferralRequest = async (e) => {
        e.preventDefault()
        setSendingRequest(true)
        try {
            await api.post('/referral/request', {
                alumniId: id,
                targetCompany: referralData.targetCompany,
                targetRole: referralData.targetRole,
                message: referralData.message,
                resumeUrl: referralData.resumeUrl || undefined,
                linkedInUrl: referralData.linkedInUrl || undefined
            })
            toast.success('Referral request sent successfully!')
            setReferralModal(false)
            setReferralData({
                targetCompany: '',
                targetRole: '',
                message: '',
                resumeUrl: '',
                linkedInUrl: ''
            })
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send referral request')
        } finally {
            setSendingRequest(false)
        }
    }

    const getMatchScoreClass = (score) => {
        if (score >= 80) return 'text-green-600 bg-green-50'
        if (score >= 60) return 'text-blue-600 bg-blue-50'
        if (score >= 40) return 'text-yellow-600 bg-yellow-50'
        return 'text-red-600 bg-red-50'
    }

    const renderStars = (rating) => (
        <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                    key={star}
                    className={`w-4 h-4 ${star <= Math.round(rating || 0) ? 'text-yellow-500' : 'text-gray-300'}`}
                />
            ))}
        </div>
    )

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    if (!mentor) {
        return (
            <div className="card text-center py-12">
                <p className="text-gray-500">Mentor not found.</p>
                <Link to="/mentors" className="btn btn-primary mt-4">Back to Mentors</Link>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <PageHero
                title={mentor?.name || 'Mentor Profile'}
                subtitle={mentor ? `${mentor.designation || 'Professional'} at ${mentor.company || 'Company'}` : 'Mentor details'}
                icon={BriefcaseIcon}
                action={(
                    <Link to="/mentors" className="btn btn-secondary inline-flex items-center">
                        <ArrowLeftIcon className="w-5 h-5 mr-2" />
                        Back to Mentors
                    </Link>
                )}
            />

            <div className="card-elevated">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start space-x-6">
                        <div className="w-24 h-24 bg-primary-100 rounded-full overflow-hidden flex items-center justify-center">
                            {mentor.profilePhoto ? (
                                <img
                                    src={getMediaUrl(mentor.profilePhoto)}
                                    alt={mentor.name || 'Mentor'}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-3xl font-bold text-primary-700">
                                    {mentor.name?.charAt(0)?.toUpperCase()}
                                </span>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h1 className="text-2xl font-bold text-gray-900">{mentor.name}</h1>
                                {mentor.isVerified && (
                                    <CheckBadgeIcon className="w-6 h-6 text-primary-600" />
                                )}
                            </div>
                            <div className="flex items-center text-gray-600 mt-1">
                                <BriefcaseIcon className="w-5 h-5 mr-1" />
                                {mentor.designation}
                            </div>
                            <div className="flex items-center text-gray-600">
                                <BuildingOfficeIcon className="w-5 h-5 mr-1" />
                                {mentor.company}
                            </div>
                            <div className="flex items-center text-gray-600 mt-1">
                                <span className="text-sm">{mentor.experienceYears} years of experience</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                {renderStars(mentor?.rating?.average || 0)}
                                <span className="text-sm text-gray-600">
                                    {(mentor?.rating?.average || 0).toFixed(1)} ({mentor?.rating?.count || 0} reviews)
                                </span>
                            </div>
                        </div>
                    </div>

                    {matchScore && (
                        <div className={`mt-4 md:mt-0 px-4 py-2 rounded-xl ${getMatchScoreClass(matchScore.matchScore)}`}>
                            <div className="text-2xl font-bold">{matchScore.matchScore}%</div>
                            <div className="text-xs">Match Score</div>
                        </div>
                    )}
                </div>

                {/* Match Reasons */}
                {matchScore?.matchReasons?.length > 0 && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-medium text-gray-900 mb-2">Why this match?</h3>
                        <ul className="space-y-1">
                            {matchScore.matchReasons.map((reason, i) => (
                                <li key={i} className="flex items-center text-sm text-gray-600">
                                    <StarIcon className="w-4 h-4 mr-2 text-green-500" />
                                    {reason}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Bio */}
                {mentor.bio && (
                    <div className="mt-6">
                        <h3 className="font-medium text-gray-900 mb-2">About</h3>
                        <p className="text-gray-700">{mentor.bio}</p>
                    </div>
                )}

                {/* Media Posts */}
                {mentor.mediaPosts?.length > 0 && (
                    <div className="mt-6">
                        <h3 className="font-medium text-gray-900 mb-2">Media</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {mentor.mediaPosts.map((post, idx) => (
                                <div key={`${post._id || post.createdAt}-${idx}`} className="rounded-lg overflow-hidden border">
                                    {post.mediaType === 'image' ? (
                                        <img src={getMediaUrl(post.url)} alt={post.caption || 'Media'} className="w-full h-40 object-cover" />
                                    ) : (
                                        <a href={getMediaUrl(post.url)} target="_blank" rel="noreferrer" className="block p-4 text-sm text-primary-700">View media</a>
                                    )}
                                    {post.caption && (
                                        <div className="p-2 text-sm text-gray-700">{post.caption}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Skills */}
                {mentor.skills?.length > 0 && (
                    <div className="mt-6">
                        <h3 className="font-medium text-gray-900 mb-2">Skills</h3>
                        <div className="flex flex-wrap gap-2">
                            {mentor.skills.map(skill => (
                                <span key={skill} className="badge badge-info">{skill}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Domains */}
                {mentor.domains?.length > 0 && (
                    <div className="mt-6">
                        <h3 className="font-medium text-gray-900 mb-2">Domains</h3>
                        <div className="flex flex-wrap gap-2">
                            {mentor.domains.map(domain => (
                                <span key={domain} className="badge badge-gray">{domain}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Availability Badges */}
                <div className="mt-6 flex space-x-4">
                    {mentor.isAvailableForMentorship && (
                        <span className="badge badge-success">Available for Mentorship</span>
                    )}
                    {mentor.isAvailableForReferrals && (
                        <span className="badge badge-info">Available for Referrals</span>
                    )}
                </div>

                {/* Actions */}
                <div className="mt-8 flex space-x-4">
                    {user?.role === 'student' ? (
                        mentor.isAvailableForMentorship && matchScore?.connectionStatus !== 'approved' ? (
                            <button
                                onClick={() => setRequestModal(true)}
                                className="btn btn-primary flex-1"
                            >
                                <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2" />
                                Request Mentorship
                            </button>
                        ) : (
                            <button className="btn btn-secondary flex-1 opacity-70 cursor-not-allowed" disabled>
                                {mentor.isAvailableForMentorship ? 'Request Not Available' : 'Mentor Not Accepting Requests'}
                            </button>
                        )
                    ) : (
                        <div className="flex-1" />
                    )}
                    {user?.role === 'student' && mentor.isAvailableForReferrals && (
                        <button
                            onClick={() => setReferralModal(true)}
                            className="btn btn-success flex-1"
                        >
                            Request Referral
                        </button>
                    )}
                    {mentor.linkedInUrl && (
                        <a
                            href={mentor.linkedInUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                        >
                            View LinkedIn
                        </a>
                    )}
                </div>

                {matchScore?.connectionStatus === 'approved' && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg">
                        <p className="text-green-700">You are connected with this mentor</p>
                    </div>
                )}

                {mentor.feedbacks?.length > 0 && (
                    <div className="mt-8">
                        <h3 className="font-medium text-gray-900 mb-3">Student Feedback</h3>
                        <div className="space-y-3">
                            {mentor.feedbacks.map((feedback, index) => (
                                <div key={`${feedback.givenAt || 'f'}-${index}`} className="p-4 rounded-lg bg-gray-50">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center">
                                                {feedback.student?.profilePhoto ? (
                                                    <img
                                                        src={getMediaUrl(feedback.student.profilePhoto)}
                                                        alt={feedback.student?.name || 'Student'}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-xs text-primary-700 font-semibold">
                                                        {feedback.student?.name?.charAt(0)?.toUpperCase() || 'S'}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm font-medium text-gray-900">{feedback.student?.name || 'Student'}</p>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            {feedback.givenAt ? new Date(feedback.givenAt).toLocaleDateString() : ''}
                                        </span>
                                    </div>
                                    <div className="mb-2">
                                        {renderStars(feedback.rating || 0)}
                                    </div>
                                    {feedback.comment && (
                                        <p className="text-sm text-gray-700">{feedback.comment}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {mentor.workExperience?.length > 0 && (
                    <div className="mt-6">
                        <h3 className="font-medium text-gray-900 mb-2">Work Experience</h3>
                        <div className="space-y-3">
                            {mentor.workExperience.map((exp, index) => (
                                <div key={index} className="p-3 rounded-lg border border-gray-200">
                                    <p className="font-medium text-gray-900">{exp.designation} {exp.company ? `at ${exp.company}` : ''}</p>
                                    <p className="text-sm text-gray-500">
                                        {exp.startYear || 'N/A'} - {exp.isCurrent ? 'Present' : (exp.endYear || 'N/A')}
                                    </p>
                                    {exp.description && (
                                        <p className="text-sm text-gray-700 mt-1">{exp.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Request Modal */}
            {requestModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 animate-slide-up">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Request Mentorship</h2>
                        <form onSubmit={sendMentorshipRequest} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                                <textarea
                                    value={requestData.message}
                                    onChange={(e) => setRequestData({ ...requestData, message: e.target.value })}
                                    className="input"
                                    rows="4"
                                    placeholder="Introduce yourself and explain why you'd like to be mentored..."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Goals (comma-separated)</label>
                                <input
                                    type="text"
                                    value={requestData.goals}
                                    onChange={(e) => setRequestData({ ...requestData, goals: e.target.value })}
                                    className="input"
                                    placeholder="e.g., Career guidance, Resume review, Interview prep"
                                />
                            </div>
                            <div className="flex space-x-4">
                                <button
                                    type="button"
                                    onClick={() => setRequestModal(false)}
                                    className="btn btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={sendingRequest}
                                    className="btn btn-primary flex-1"
                                >
                                    {sendingRequest ? 'Sending...' : 'Send Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {referralModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 animate-slide-up">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Request Referral</h2>
                        <form onSubmit={sendReferralRequest} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Target Company</label>
                                <input
                                    type="text"
                                    value={referralData.targetCompany}
                                    onChange={(e) => setReferralData({ ...referralData, targetCompany: e.target.value })}
                                    className="input"
                                    placeholder="e.g., Google"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Target Role</label>
                                <input
                                    type="text"
                                    value={referralData.targetRole}
                                    onChange={(e) => setReferralData({ ...referralData, targetRole: e.target.value })}
                                    className="input"
                                    placeholder="e.g., Software Engineer"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                                <textarea
                                    value={referralData.message}
                                    onChange={(e) => setReferralData({ ...referralData, message: e.target.value })}
                                    className="input"
                                    rows="4"
                                    placeholder="Share why you are a good fit..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Resume URL (optional)</label>
                                <input
                                    type="url"
                                    value={referralData.resumeUrl}
                                    onChange={(e) => setReferralData({ ...referralData, resumeUrl: e.target.value })}
                                    className="input"
                                    placeholder="https://..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn URL (optional)</label>
                                <input
                                    type="url"
                                    value={referralData.linkedInUrl}
                                    onChange={(e) => setReferralData({ ...referralData, linkedInUrl: e.target.value })}
                                    className="input"
                                    placeholder="https://linkedin.com/in/..."
                                />
                            </div>
                            <div className="flex space-x-4">
                                <button
                                    type="button"
                                    onClick={() => setReferralModal(false)}
                                    className="btn btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={sendingRequest}
                                    className="btn btn-success flex-1"
                                >
                                    {sendingRequest ? 'Sending...' : 'Send Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
