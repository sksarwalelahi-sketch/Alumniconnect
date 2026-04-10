import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { getMediaUrl } from '../utils/media'
import toast from 'react-hot-toast'
import PageHero from '../components/PageHero'
import {
    UsersIcon,
    AcademicCapIcon,
    UserGroupIcon,
    DocumentTextIcon,
    CheckBadgeIcon
} from '@heroicons/react/20/solid'

export default function AdminDashboard() {
    const location = useLocation()
    const navigate = useNavigate()
    const [stats, setStats] = useState(null)
    const [recentUsers, setRecentUsers] = useState([])
    const [allUsers, setAllUsers] = useState([])
    const [studentProfiles, setStudentProfiles] = useState([])
    const [alumniProfiles, setAlumniProfiles] = useState([])
    const [mentorships, setMentorships] = useState([])
    const [referrals, setReferrals] = useState([])
    const [pendingVerifications, setPendingVerifications] = useState([])
    const [loading, setLoading] = useState(true)

    const tabPathMap = {
        overview: '/admin',
        users: '/admin/users',
        students: '/admin/students',
        alumni: '/admin/alumni',
        mentorships: '/admin/mentorships',
        referrals: '/admin/referrals',
        verifications: '/admin/verifications'
    }

    const pathTabMap = {
        '/admin': 'overview',
        '/admin/users': 'users',
        '/admin/students': 'students',
        '/admin/alumni': 'alumni',
        '/admin/mentorships': 'mentorships',
        '/admin/referrals': 'referrals',
        '/admin/verifications': 'verifications'
    }

    const activeTab = pathTabMap[location.pathname] || 'overview'

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            const [dashboardRes, verificationsRes, usersRes, studentsRes, alumniRes, mentorshipsRes, referralsRes] = await Promise.all([
                api.get('/admin/dashboard'),
                api.get('/admin/pending-verifications'),
                api.get('/admin/users?limit=100'),
                api.get('/admin/students?limit=100'),
                api.get('/admin/alumni?limit=100'),
                api.get('/admin/mentorships?limit=100'),
                api.get('/admin/referrals?limit=100')
            ])

            setStats(dashboardRes.data.data)
            setRecentUsers(dashboardRes.data.data.recentUsers || [])
            setPendingVerifications(verificationsRes.data.data || [])
            setAllUsers(usersRes.data.data.users || [])
            setStudentProfiles(studentsRes.data.data.profiles || [])
            setAlumniProfiles(alumniRes.data.data.profiles || [])
            setMentorships(mentorshipsRes.data.data.requests || [])
            setReferrals(referralsRes.data.data.requests || [])
        } catch (error) {
            toast.error('Failed to load admin dashboard')
        } finally {
            setLoading(false)
        }
    }

    const verifyAlumni = async (id, verified) => {
        try {
            await api.put(`/admin/alumni/${id}/verify`, { verified })
            toast.success(verified ? 'Alumni verified' : 'Verification removed')
            fetchDashboardData()
        } catch (error) {
            toast.error('Failed to update verification')
        }
    }

    const toggleUserStatus = async (id, isActive) => {
        try {
            await api.put(`/admin/users/${id}/status`, { isActive: !isActive })
            toast.success('User status updated')
            fetchDashboardData()
        } catch (error) {
            toast.error('Failed to update status')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    const tabs = ['overview', 'users', 'students', 'alumni', 'mentorships', 'referrals', 'verifications']

    return (
        <div className="space-y-6">
            <PageHero
                title="Admin Dashboard"
                subtitle="Monitor platform health, users, verifications, mentorships, and referrals from one view."
                icon={UsersIcon}
            />

            <div className="glass-panel rounded-xl px-4 border-b border-gray-200">
                <nav className="flex space-x-8 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => navigate(tabPathMap[tab])}
                            className={`py-3 px-1 border-b-2 font-medium text-sm capitalize whitespace-nowrap ${activeTab === tab
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'overview' && stats && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            icon={UsersIcon}
                            label="Total Users"
                            value={stats.overview.totalUsers}
                            color="blue"
                            onClick={() => navigate('/admin/users')}
                        />
                        <StatCard
                            icon={AcademicCapIcon}
                            label="Students"
                            value={stats.overview.totalStudents}
                            color="green"
                            onClick={() => navigate('/admin/students')}
                        />
                        <StatCard
                            icon={UserGroupIcon}
                            label="Verified Alumni"
                            value={stats.overview.verifiedAlumni}
                            color="purple"
                            onClick={() => navigate('/admin/alumni')}
                        />
                        <StatCard
                            icon={DocumentTextIcon}
                            label="Pending Verification"
                            value={stats.overview.pendingAlumni}
                            color="yellow"
                            onClick={() => navigate('/admin/verifications')}
                        />
                    </div>

                    <div className="grid lg:grid-cols-2 gap-6">
                        <div className="card-elevated">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Mentorship Status</h2>
                            <div className="space-y-3">
                                {stats.mentorshipStats.map(stat => (
                                    <div key={stat._id} className="flex items-center justify-between">
                                        <span className="capitalize text-gray-700">{stat._id}</span>
                                        <span className="font-medium">{stat.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="card-elevated">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Referral Status</h2>
                            <div className="space-y-3">
                                {stats.referralStats.map(stat => (
                                    <div key={stat._id} className="flex items-center justify-between">
                                        <span className="capitalize text-gray-700">{(stat._id || '').replace('_', ' ')}</span>
                                        <span className="font-medium">{stat.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="card-elevated">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Users</h2>
                        <UsersTable users={recentUsers} onToggle={toggleUserStatus} />
                    </div>
                </>
            )}

            {activeTab === 'users' && (
                <div className="card-elevated">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">All Users</h2>
                    <UsersTable users={allUsers} onToggle={toggleUserStatus} />
                </div>
            )}

            {activeTab === 'students' && (
                <div className="card-elevated">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">All Student Profiles</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-sm text-gray-500 border-b">
                                    <th className="pb-3">Name</th>
                                    <th className="pb-3">Email</th>
                                    <th className="pb-3">College</th>
                                    <th className="pb-3">Branch</th>
                                    <th className="pb-3">Graduation</th>
                                    <th className="pb-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {studentProfiles.map((profile) => (
                                    <tr
                                        key={profile._id}
                                        className="border-b hover:bg-gray-50 cursor-pointer"
                                        onClick={() => navigate(`/profile/${profile._id}?role=student`)}
                                    >
                                        <td className="py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center">
                                                    {profile.profilePhoto ? (
                                                        <img
                                                            src={getMediaUrl(profile.profilePhoto)}
                                                            alt={profile.name || 'Student'}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-primary-700 font-semibold">
                                                            {profile.name?.charAt(0)?.toUpperCase() || 'S'}
                                                        </span>
                                                    )}
                                                </div>
                                                <span>{profile.name || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="py-3">{profile.user?.email || 'N/A'}</td>
                                        <td className="py-3">{profile.college || 'N/A'}</td>
                                        <td className="py-3">{profile.branch || 'N/A'}</td>
                                        <td className="py-3">{profile.graduationYear || 'N/A'}</td>
                                        <td className="py-3">
                                            <span className={`badge ${profile.user?.isActive ? 'badge-success' : 'badge-danger'}`}>
                                                {profile.user?.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'alumni' && (
                <div className="card-elevated">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">All Alumni Profiles</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-sm text-gray-500 border-b">
                                    <th className="pb-3">Name</th>
                                    <th className="pb-3">Email</th>
                                    <th className="pb-3">Company</th>
                                    <th className="pb-3">Designation</th>
                                    <th className="pb-3">Verified</th>
                                    <th className="pb-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {alumniProfiles.map((profile) => (
                                    <tr
                                        key={profile._id}
                                        className="border-b hover:bg-gray-50 cursor-pointer"
                                        onClick={() => navigate(`/profile/${profile._id}?role=alumni`)}
                                    >
                                        <td className="py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center">
                                                    {profile.profilePhoto ? (
                                                        <img
                                                            src={getMediaUrl(profile.profilePhoto)}
                                                            alt={profile.name || 'Alumni'}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-primary-700 font-semibold">
                                                            {profile.name?.charAt(0)?.toUpperCase() || 'A'}
                                                        </span>
                                                    )}
                                                </div>
                                                <span>{profile.name || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="py-3">{profile.user?.email || 'N/A'}</td>
                                        <td className="py-3">{profile.company || 'N/A'}</td>
                                        <td className="py-3">{profile.designation || 'N/A'}</td>
                                        <td className="py-3">
                                            <span className={`badge ${profile.isVerified ? 'badge-success' : 'badge-warning'}`}>
                                                {profile.isVerified ? 'Verified' : 'Pending'}
                                            </span>
                                        </td>
                                        <td className="py-3">
                                            <span className={`badge ${profile.user?.isActive ? 'badge-success' : 'badge-danger'}`}>
                                                {profile.user?.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'verifications' && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Pending Alumni Verifications</h2>
                    {pendingVerifications.length === 0 ? (
                        <div className="card-elevated text-center py-12">
                            <CheckBadgeIcon className="w-12 h-12 mx-auto text-green-500 mb-4" />
                            <p className="text-gray-500">No pending verifications.</p>
                        </div>
                    ) : (
                        pendingVerifications.map(profile => (
                            <div key={profile._id} className="card-elevated">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                                            <span className="text-primary-700 font-semibold">
                                                {profile.name?.charAt(0)?.toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/profile/${profile._id}?role=alumni`)}
                                                className="font-medium text-gray-900 hover:underline"
                                            >
                                                {profile.name}
                                            </button>
                                            <p className="text-sm text-gray-500">{profile.company} | {profile.designation}</p>
                                            <p className="text-xs text-gray-400">Applied: {new Date(profile.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => verifyAlumni(profile._id, true)}
                                            className="btn btn-success text-sm"
                                        >
                                            <CheckBadgeIcon className="w-4 h-4 mr-1" />
                                            Verify
                                        </button>
                                        <button
                                            onClick={() => verifyAlumni(profile._id, false)}
                                            className="btn btn-danger text-sm"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'mentorships' && (
                <div className="card-elevated">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">All Mentorship Requests</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-sm text-gray-500 border-b">
                                    <th className="pb-3">Student</th>
                                    <th className="pb-3">Alumni</th>
                                    <th className="pb-3">Status</th>
                                    <th className="pb-3">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mentorships.map((item) => (
                                    <tr key={item._id} className="border-b">
                                        <td className="py-3">{item.studentProfile?.name || item.student?.email || 'N/A'}</td>
                                        <td className="py-3">{item.alumniProfile?.name || item.alumni?.email || 'N/A'}</td>
                                        <td className="py-3">
                                            <span className="badge badge-info capitalize">{item.status}</span>
                                        </td>
                                        <td className="py-3">{new Date(item.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'referrals' && (
                <div className="card-elevated">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">All Referral Requests</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-sm text-gray-500 border-b">
                                    <th className="pb-3">Student</th>
                                    <th className="pb-3">Alumni</th>
                                    <th className="pb-3">Company</th>
                                    <th className="pb-3">Status</th>
                                    <th className="pb-3">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {referrals.map((item) => (
                                    <tr key={item._id} className="border-b">
                                        <td className="py-3">{item.studentProfile?.name || item.student?.email || 'N/A'}</td>
                                        <td className="py-3">{item.alumniProfile?.name || item.alumni?.email || 'N/A'}</td>
                                        <td className="py-3">{item.targetCompany || 'N/A'}</td>
                                        <td className="py-3">
                                            <span className="badge badge-info capitalize">{item.status}</span>
                                        </td>
                                        <td className="py-3">{new Date(item.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

function StatCard({ icon: Icon, label, value, color, onClick }) {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        purple: 'bg-purple-100 text-purple-600',
        yellow: 'bg-yellow-100 text-yellow-600'
    }

    const isInteractive = typeof onClick === 'function'

    return (
        <button
            type="button"
            onClick={onClick}
            className={`card-elevated w-full text-left ${isInteractive ? 'cursor-pointer' : ''}`}
            disabled={!isInteractive}
        >
            <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <div className="text-2xl font-bold text-gray-900">{value || 0}</div>
                    <div className="text-sm text-gray-500">{label}</div>
                </div>
            </div>
        </button>
    )
}

function UsersTable({ users, onToggle }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="text-left text-sm text-gray-500 border-b">
                        <th className="pb-3">Email</th>
                        <th className="pb-3">Role</th>
                        <th className="pb-3">Joined</th>
                        <th className="pb-3">Last Login</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user._id} className="border-b">
                            <td className="py-3">{user.email}</td>
                            <td className="py-3 capitalize">{user.role}</td>
                            <td className="py-3">{new Date(user.createdAt).toLocaleDateString()}</td>
                            <td className="py-3">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
                            <td className="py-3">
                                <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                                    {user.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td className="py-3">
                                <button
                                    onClick={() => onToggle(user._id, user.isActive)}
                                    className="text-sm text-primary-600 hover:underline"
                                >
                                    {user.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
