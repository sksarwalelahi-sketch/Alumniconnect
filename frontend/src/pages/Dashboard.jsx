import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import { getMediaUrl } from '../utils/media'
import PageHero from '../components/PageHero'
import {
    UserGroupIcon,
    AcademicCapIcon,
    ChatBubbleLeftRightIcon,
    DocumentTextIcon,
    ArrowRightIcon,
    SparklesIcon
} from '@heroicons/react/20/solid' 

export default function Dashboard() {
    const navigate = useNavigate()
    const { user, profile } = useAuthStore()
    const [stats, setStats] = useState(null)
    const [matchedMentors, setMatchedMentors] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [user, profile])

    const fetchDashboardData = async () => {
        try {
            const [statsRes, mentorsRes] = await Promise.all([
                api.get('/mentorship/stats'),
                user?.role === 'student' && profile ? api.get('/match/mentors?limit=3') : Promise.resolve(null)
            ])
            setStats(statsRes.data.data)
            if (user?.role === 'student') {
                setMatchedMentors(mentorsRes?.data?.data?.matches || [])
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    if (user?.role === 'admin') {
        return <Navigate to="/admin" replace />
    }

    return (
        <div className="space-y-6">
            <PageHero
                title={`Welcome back, ${profile?.name?.split(' ')[0] || user?.email?.split('@')[0]}!`}
                subtitle={user?.role === 'student'
                    ? 'Discover mentors, request guidance, and move your career forward this week.'
                    : 'Review requests, mentor students, and grow your impact in the community.'}
                icon={SparklesIcon}
                action={user?.role === 'student' ? (
                    <Link to="/mentors" className="btn btn-primary inline-flex items-center">
                        <span>Find Mentors</span>
                        <ArrowRightIcon className="w-5 h-5 ml-2" />
                    </Link>
                ) : (
                    <Link to="/mentorship-requests" className="btn btn-primary inline-flex items-center">
                        <span>View Requests</span>
                        <ArrowRightIcon className="w-5 h-5 ml-2" />
                    </Link>
                )}
            />

            <div className="card bg-gradient-to-r from-primary-700 to-cyan-600 text-white">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-xl font-bold mb-2">
                            Your Weekly Momentum
                        </h2>
                        <p className="text-blue-100">
                            {user?.role === 'student'
                                ? 'Ready to connect with your perfect mentor today?'
                                : 'Ready to help the next generation of professionals?'}
                        </p>
                    </div>
                    <div className="mt-4 md:mt-0">
                        {user?.role === 'student' ? (
                            <Link to="/mentors" className="btn btn-primary inline-flex items-center">
                                <span>Find Mentors</span>
                                <ArrowRightIcon className="w-5 h-5 ml-2" />
                            </Link>
                        ) : (
                            <Link to="/mentorship-requests" className="btn btn-primary inline-flex items-center">
                                <span>View Requests</span>
                                <ArrowRightIcon className="w-5 h-5 ml-2" />
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={AcademicCapIcon}
                    label="Active Mentorships"
                    value={stats?.byStatus?.find(s => s._id === 'approved')?.count || 0}
                    color="blue"
                    onClick={() => navigate('/mentorship-requests?tab=approved')}
                />
                <StatCard
                    icon={DocumentTextIcon}
                    label="Pending Requests"
                    value={stats?.byStatus?.find(s => s._id === 'pending')?.count || 0}
                    color="yellow"
                    onClick={() => navigate('/mentorship-requests?tab=pending')}
                />
                <StatCard
                    icon={ChatBubbleLeftRightIcon}
                    label="Messages"
                    value={0}
                    color="green"
                    onClick={() => navigate('/chat')}
                />
                <StatCard
                    icon={UserGroupIcon}
                    label="Total Sessions"
                    value={stats?.totalSessions || 0}
                    color="purple"
                    onClick={() => navigate('/mentorship-requests?tab=completed')}
                />
            </div>

            {/* Matched Mentors (Student Only) */}
            {user?.role === 'student' && matchedMentors.length > 0 && (
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                            <SparklesIcon className="w-5 h-5 text-yellow-500 mr-2" />
                            <h2 className="text-lg font-semibold text-gray-900">Top Recommended Mentors</h2>
                        </div>
                        <Link to="/mentors" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                            View All
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {matchedMentors.map((mentor) => (
                            <div key={mentor._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-primary-100 rounded-full overflow-hidden flex items-center justify-center">
                                        {mentor.profilePhoto ? (
                                            <img
                                                src={getMediaUrl(mentor.profilePhoto)}
                                                alt={mentor.name || 'Mentor'}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-primary-700 font-semibold">
                                                {mentor.name?.charAt(0)?.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900">{mentor.name}</h3>
                                        <p className="text-sm text-gray-500">{mentor.designation} at {mentor.company}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-green-600">{mentor.matchScore}%</div>
                                        <div className="text-xs text-gray-500">Match Score</div>
                                    </div>
                                    <Link to={`/mentors/${mentor._id}`} className="btn btn-primary text-sm">
                                        Connect
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            {user?.role === 'student' ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <QuickActionCard
                        title="Find Mentors"
                        description="Browse and connect with verified alumni mentors"
                        icon={UserGroupIcon}
                        to="/mentors"
                        color="primary"
                    />
                    <QuickActionCard
                        title="My Requests"
                        description="Track your mentorship and referral requests"
                        icon={DocumentTextIcon}
                        to="/mentorship-requests"
                        color="green"
                    />
                    <QuickActionCard
                        title="Messages"
                        description="Chat with your mentors and connections"
                        icon={ChatBubbleLeftRightIcon}
                        to="/chat"
                        color="blue"
                    />
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <QuickActionCard
                        title="Mentorship Requests"
                        description="Review and respond to incoming mentorship requests"
                        icon={UserGroupIcon}
                        to="/mentorship-requests"
                        color="primary"
                    />
                    <QuickActionCard
                        title="Referrals"
                        description="Manage referral requests from students"
                        icon={DocumentTextIcon}
                        to="/referrals"
                        color="green"
                    />
                    <QuickActionCard
                        title="Messages"
                        description="Chat with your mentees and connections"
                        icon={ChatBubbleLeftRightIcon}
                        to="/chat"
                        color="blue"
                    />
                </div>
            )}
        </div>
    )
}

function StatCard({ icon: Icon, label, value, color, onClick }) {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        yellow: 'bg-yellow-100 text-yellow-600',
        green: 'bg-green-100 text-green-600',
        purple: 'bg-purple-100 text-purple-600'
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className="card-elevated w-full text-left cursor-pointer"
        >
            <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <div className="text-2xl font-bold text-gray-900">{value}</div>
                    <div className="text-sm text-gray-500">{label}</div>
                </div>
            </div>
        </button>
    )
}

function QuickActionCard({ title, description, icon: Icon, to, color }) {
    const colorClasses = {
        primary: 'bg-primary-50 text-primary-600 group-hover:bg-primary-100',
        green: 'bg-green-50 text-green-600 group-hover:bg-green-100',
        blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
    }

    return (
        <Link to={to} className="card-elevated group transition-all">
            <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{description}</p>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
            </div>
        </Link>
    )
}
