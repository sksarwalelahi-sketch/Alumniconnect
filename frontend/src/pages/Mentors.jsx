import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { getMediaUrl } from '../utils/media'
import toast from 'react-hot-toast'
import PageHero from '../components/PageHero'
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    StarIcon,
    BuildingOfficeIcon,
    BriefcaseIcon
} from '@heroicons/react/20/solid' 

export default function Mentors() {
    const [mentors, setMentors] = useState([])
    const [loading, setLoading] = useState(true)
    const { user, loading: authLoading } = useAuthStore()
    const [filters, setFilters] = useState({
        domain: '',
        minExperience: '',
        availableForReferral: false
    })
    const [showFilters, setShowFilters] = useState(false)

    useEffect(() => {
        if (authLoading) return
        // Only students should call the protected search endpoint
        if (!user || user?.role !== 'student') {
            setMentors([])
            setLoading(false)
            return
        }
        fetchMentors()
    }, [filters, user, authLoading])

    const fetchMentors = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (filters.domain) params.append('domain', filters.domain)
            if (filters.minExperience) params.append('minExperience', filters.minExperience)
            if (filters.availableForReferral) params.append('availableForReferral', 'true')

            params.append('limit', '50')
            const response = await api.get(`/match/mentors?${params.toString()}`)
            setMentors(response.data.data.matches || [])
        } catch (error) {
            toast.error('Failed to fetch mentors')
        } finally {
            setLoading(false)
        }
    }

    const getMatchScoreClass = (score) => {
        if (score >= 80) return 'match-score-excellent'
        if (score >= 60) return 'match-score-good'
        if (score >= 40) return 'match-score-average'
        return 'match-score-low'
    }

    const domains = [
        'Software Development',
        'Data Science',
        'Machine Learning',
        'Web Development',
        'Mobile Development',
        'DevOps',
        'Cloud Computing',
        'Cybersecurity',
        'Product Management',
        'UI/UX Design'
    ]

    return (
        <div className="space-y-6">
            <PageHero
                title="Find Mentors"
                subtitle="Explore verified alumni by skills, domain, and experience to find your best fit."
                icon={MagnifyingGlassIcon}
                action={(
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="btn btn-secondary"
                    >
                        <FunnelIcon className="w-5 h-5 mr-2" />
                        Filters
                    </button>
                )}
            />

            {/* Filters */}
            {showFilters && (
                <div className="card-elevated animate-slide-up">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Domain</label>
                            <select
                                value={filters.domain}
                                onChange={(e) => setFilters({ ...filters, domain: e.target.value })}
                                className="input"
                            >
                                <option value="">All Domains</option>
                                {domains.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Min Experience</label>
                            <select
                                value={filters.minExperience}
                                onChange={(e) => setFilters({ ...filters, minExperience: e.target.value })}
                                className="input"
                            >
                                <option value="">Any</option>
                                <option value="2">2+ years</option>
                                <option value="5">5+ years</option>
                                <option value="10">10+ years</option>
                            </select>
                        </div>
                        <div className="flex items-center">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.availableForReferral}
                                    onChange={(e) => setFilters({ ...filters, availableForReferral: e.target.checked })}
                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm text-gray-700">Available for Referrals</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* Mentors Grid */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : mentors.length === 0 ? (
                <div className="card text-center py-12">
                    <p className="text-gray-500">No mentors found matching your criteria.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mentors.map((mentor) => (
                        <div key={mentor._id} className="card-elevated">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-3">
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
                                        <h3 className="font-semibold text-gray-900">{mentor.name}</h3>
                                        <div className="flex items-center text-sm text-gray-500">
                                            <BriefcaseIcon className="w-4 h-4 mr-1" />
                                            {mentor.experienceYears} years
                                        </div>
                                    </div>
                                </div>
                                {mentor.matchScore && (
                                    <div className={`px-2 py-1 rounded-lg text-sm font-bold ${getMatchScoreClass(mentor.matchScore)}`}>
                                        {mentor.matchScore}%
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-center text-sm text-gray-600">
                                    <BuildingOfficeIcon className="w-4 h-4 mr-2 text-gray-400" />
                                    {mentor.designation} at {mentor.company}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {mentor.domains?.slice(0, 3).map(domain => (
                                        <span key={domain} className="badge badge-gray text-xs">{domain}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-1 mb-4">
                                {mentor.skills?.slice(0, 4).map(skill => (
                                    <span key={skill} className="badge badge-info text-xs">{skill}</span>
                                ))}
                            </div>

                            <div className="flex space-x-2">
                                <Link to={`/mentors/${mentor._id}`} className="btn btn-primary flex-1 text-sm">
                                    View Profile
                                </Link>
                                {mentor.isAvailableForReferrals && (
                                    <Link to={`/mentors/${mentor._id}`} className="btn btn-success flex-1 text-sm">
                                        Request Referral
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
