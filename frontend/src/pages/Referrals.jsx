import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import { getMediaUrl } from '../utils/media'
import toast from 'react-hot-toast'
import PageHero from '../components/PageHero'
import {
    DocumentTextIcon,
    BuildingOfficeIcon,
    CheckIcon,
    XMarkIcon,
    ArrowPathIcon
} from '@heroicons/react/20/solid' 

export default function Referrals() {
    const [referrals, setReferrals] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('active')
    const { user } = useAuthStore()

    useEffect(() => {
        fetchReferrals()
    }, [activeTab])

    const fetchReferrals = async () => {
        try {
            const statusParam = activeTab === 'active'
                ? 'requested,under_review,referred'
                : 'rejected,withdrawn'
            const response = await api.get(`/referral/requests?status=${statusParam}`)
            setReferrals(response.data.data.requests || [])
        } catch (error) {
            toast.error('Failed to fetch referrals')
        } finally {
            setLoading(false)
        }
    }

    const updateStatus = async (id, status, data = {}) => {
        try {
            await api.put(`/referral/${id}`, { status, ...data })
            toast.success(`Referral ${status}`)
            fetchReferrals()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update')
        }
    }

    const withdrawRequest = async (id) => {
        try {
            await api.put(`/referral/${id}/withdraw`, { reason: 'User withdrew' })
            toast.success('Request withdrawn')
            fetchReferrals()
        } catch (error) {
            toast.error('Failed to withdraw request')
        }
    }

    const getStatusBadge = (status) => {
        const badges = {
            requested: 'badge-warning',
            under_review: 'badge-info',
            referred: 'badge-success',
            rejected: 'badge-danger',
            withdrawn: 'badge-gray'
        }
        return badges[status] || 'badge-gray'
    }

    const tabs = ['active', 'completed']

    return (
        <div className="space-y-6">
            <PageHero
                title="Referral Requests"
                subtitle="Manage referral pipelines from requested to referred with a clear timeline."
                icon={DocumentTextIcon}
            />

            <div className="glass-panel rounded-xl px-4 border-b border-gray-200">
                <nav className="flex space-x-8">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-3 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : referrals.length === 0 ? (
                <div className="card text-center py-12">
                    <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No {activeTab} referral requests.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {referrals.map((referral) => (
                        <div key={referral._id} className="card-elevated">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                <div className="flex items-start space-x-4">
                                    <div className="w-12 h-12 bg-green-100 rounded-full overflow-hidden flex items-center justify-center">
                                        {(user?.role === 'student'
                                            ? referral.alumniProfile?.profilePhoto
                                            : referral.studentProfile?.profilePhoto) ? (
                                            <img
                                                src={getMediaUrl(user?.role === 'student'
                                                    ? referral.alumniProfile?.profilePhoto
                                                    : referral.studentProfile?.profilePhoto)}
                                                alt={user?.role === 'student'
                                                    ? referral.alumniProfile?.name || 'User'
                                                    : referral.studentProfile?.name || 'User'}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-green-700 font-semibold">
                                                {user?.role === 'student'
                                                    ? referral.alumniProfile?.name?.charAt(0)
                                                    : referral.studentProfile?.name?.charAt(0)
                                                }
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">
                                            {user?.role === 'student'
                                                ? referral.alumniProfile?.name
                                                : referral.studentProfile?.name
                                            }
                                        </h3>
                                        <div className="flex items-center text-sm text-gray-500">
                                            <BuildingOfficeIcon className="w-4 h-4 mr-1" />
                                            {referral.targetCompany} | {referral.targetRole}
                                        </div>
                                        {referral.referralStatus?.referralLink && (
                                            <a
                                                href={referral.referralStatus.referralLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-primary-600 hover:underline mt-1 inline-block"
                                            >
                                                View Referral Link ->
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 md:mt-0 flex items-center space-x-4">
                                    <span className={`badge ${getStatusBadge(referral.status)} capitalize`}>
                                        {referral.status.replace('_', ' ')}
                                    </span>

                                    {user?.role === 'alumni' && referral.status === 'requested' && (
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => updateStatus(referral._id, 'under_review')}
                                                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                                                title="Start Review"
                                            >
                                                <ArrowPathIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => updateStatus(referral._id, 'referred')}
                                                className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                                                title="Submit Referral"
                                            >
                                                <CheckIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => updateStatus(referral._id, 'rejected', { reason: 'Not a good fit' })}
                                                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                                title="Reject"
                                            >
                                                <XMarkIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}

                                    {user?.role === 'student' && ['requested', 'under_review'].includes(referral.status) && (
                                        <button
                                            onClick={() => withdrawRequest(referral._id)}
                                            className="btn btn-secondary text-sm"
                                        >
                                            Withdraw
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t">
                                <div className="flex items-center text-sm text-gray-500">
                                    <span>Timeline:</span>
                                    {referral.timeline?.slice(-3).map((t, i) => (
                                        <span key={i} className="ml-2 badge badge-gray text-xs">
                                            {t.status.replace('_', ' ')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
