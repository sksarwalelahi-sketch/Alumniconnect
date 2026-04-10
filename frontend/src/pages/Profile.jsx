import { useState, useEffect } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import toast from 'react-hot-toast'
import PageHero from '../components/PageHero'
import {
    UserCircleIcon,
    BuildingOfficeIcon,
    BriefcaseIcon,
    AcademicCapIcon,
    LinkIcon
} from '@heroicons/react/20/solid' 

const branches = [
    'Computer Science',
    'Information Technology',
    'Electronics',
    'Electrical',
    'Mechanical',
    'Civil',
    'Chemical',
    'Biotechnology',
    'Other'
]

const careerInterests = [
    'Software Development',
    'Data Science',
    'Machine Learning',
    'Web Development',
    'Mobile Development',
    'DevOps',
    'Cloud Computing',
    'Cybersecurity',
    'Product Management',
    'UI/UX Design',
    'Data Analysis',
    'Consulting',
    'Core Engineering',
    'Research',
    'Entrepreneurship',
    'Higher Studies'
]

const domains = careerInterests

export default function Profile() {
    const location = useLocation()
    const { id: profileIdParam } = useParams()
    const [searchParams] = useSearchParams()
    const { user, profile, updateProfile, uploadProfilePhoto } = useAuthStore()
    const [loading, setLoading] = useState(false)
    const [photoUploading, setPhotoUploading] = useState(false)
    const [activeTab, setActiveTab] = useState('basic')
    const [externalProfile, setExternalProfile] = useState(null)
    const [externalProfileRole, setExternalProfileRole] = useState('')
    const [externalLoading, setExternalLoading] = useState(false)
    const [externalError, setExternalError] = useState('')
    const [formData, setFormData] = useState({
        name: profile?.name || '',
        profilePhoto: profile?.profilePhoto || '',
        college: profile?.college || '',
        branch: profile?.branch || '',
        graduationYear: profile?.graduationYear || '',
        skills: profile?.skills || [],
        careerInterests: profile?.careerInterests || [],
        linkedInUrl: profile?.linkedInUrl || '',
        bio: profile?.bio || '',
        company: profile?.company || '',
        designation: profile?.designation || '',
        experienceYears: profile?.experienceYears || '',
        workExperience: profile?.workExperience || [],
        domains: profile?.domains || [],
        isAvailableForMentorship: profile?.isAvailableForMentorship ?? true,
        isAvailableForReferrals: profile?.isAvailableForReferrals ?? true
    })

    const [newSkill, setNewSkill] = useState('')
    const [isEditing, setIsEditing] = useState(false)
    const isExternalProfileView = Boolean(profileIdParam)
    const displayProfile = isExternalProfileView ? externalProfile : profile
    const displayRole = isExternalProfileView ? externalProfileRole : user?.role
    const canEdit = !isExternalProfileView

    useEffect(() => {
        if (location.state?.startEditing && !isExternalProfileView) {
            setIsEditing(true)
            setActiveTab('basic')
        }
    }, [location.state, isExternalProfileView])

    useEffect(() => {
        const loadExternalProfile = async () => {
            if (!isExternalProfileView || !profileIdParam) return

            setExternalLoading(true)
            setExternalError('')
            setExternalProfile(null)

            const roleHint = searchParams.get('role')

            try {
                if (roleHint === 'student') {
                    const response = await api.get(`/students/public/${profileIdParam}`)
                    setExternalProfile(response.data.data)
                    setExternalProfileRole('student')
                } else if (roleHint === 'alumni') {
                    const response = await api.get(`/alumni/${profileIdParam}`)
                    setExternalProfile(response.data.data)
                    setExternalProfileRole('alumni')
                } else {
                    try {
                        const alumniResponse = await api.get(`/alumni/${profileIdParam}`)
                        setExternalProfile(alumniResponse.data.data)
                        setExternalProfileRole('alumni')
                    } catch {
                        const studentResponse = await api.get(`/students/public/${profileIdParam}`)
                        setExternalProfile(studentResponse.data.data)
                        setExternalProfileRole('student')
                    }
                }
            } catch (error) {
                setExternalError(error.response?.data?.message || 'Failed to load profile')
            } finally {
                setExternalLoading(false)
            }
        }

        loadExternalProfile()
    }, [isExternalProfileView, profileIdParam, searchParams])

    useEffect(() => {
        setFormData((prev) => ({
            ...prev,
            name: profile?.name || '',
            profilePhoto: profile?.profilePhoto || '',
            college: profile?.college || '',
            branch: profile?.branch || '',
            graduationYear: profile?.graduationYear || '',
            skills: profile?.skills || [],
            careerInterests: profile?.careerInterests || [],
            linkedInUrl: profile?.linkedInUrl || '',
            bio: profile?.bio || '',
            company: profile?.company || '',
            designation: profile?.designation || '',
            experienceYears: profile?.experienceYears || '',
            workExperience: profile?.workExperience || [],
            domains: profile?.domains || [],
            isAvailableForMentorship: profile?.isAvailableForMentorship ?? true,
            isAvailableForReferrals: profile?.isAvailableForReferrals ?? true
        }))
    }, [profile])

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

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
        setFormData({ ...formData, [e.target.name]: value })
    }

    const handlePhotoChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file')
            return
        }

        setPhotoUploading(true)
        const result = await uploadProfilePhoto(file)
        if (result.success) {
            setFormData((prev) => ({ ...prev, profilePhoto: result.data.profilePhoto || '' }))
            toast.success('Profile photo uploaded')
        } else {
            toast.error(result.message)
        }
        setPhotoUploading(false)
    }

    const addSkill = () => {
        if (newSkill && !formData.skills.includes(newSkill)) {
            setFormData({ ...formData, skills: [...formData.skills, newSkill] })
            setNewSkill('')
        }
    }

    const removeSkill = (skill) => {
        setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) })
    }

    const toggleInterest = (interest) => {
        if (formData.careerInterests?.includes(interest)) {
            setFormData({ ...formData, careerInterests: formData.careerInterests.filter(i => i !== interest) })
        } else {
            setFormData({ ...formData, careerInterests: [...formData.careerInterests, interest] })
        }
    }

    const addWorkExperience = () => {
        setFormData({
            ...formData,
            workExperience: [
                ...(formData.workExperience || []),
                {
                    company: '',
                    designation: '',
                    startYear: '',
                    endYear: '',
                    isCurrent: false,
                    description: ''
                }
            ]
        })
    }

    const updateWorkExperience = (index, field, value) => {
        const next = [...(formData.workExperience || [])]
        const updated = { ...next[index], [field]: value }
        if (field === 'isCurrent' && value) {
            updated.endYear = ''
        }
        next[index] = updated
        setFormData({ ...formData, workExperience: next })
    }

    const removeWorkExperience = (index) => {
        setFormData({
            ...formData,
            workExperience: (formData.workExperience || []).filter((_, i) => i !== index)
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        const payload = { ...formData }
        if (user?.role === 'alumni') {
            payload.workExperience = (formData.workExperience || [])
                .filter(exp => exp.company || exp.designation || exp.startYear || exp.endYear || exp.description)
                .map(exp => ({
                    company: exp.company || '',
                    designation: exp.designation || '',
                    startYear: exp.startYear ? Number(exp.startYear) : undefined,
                    endYear: exp.isCurrent ? undefined : (exp.endYear ? Number(exp.endYear) : undefined),
                    isCurrent: !!exp.isCurrent,
                    description: exp.description || ''
                }))
        }

        const result = await updateProfile(payload)
        if (result.success) {
            toast.success('Profile updated successfully')
            setIsEditing(false)
        } else {
            toast.error(result.message)
        }
        setLoading(false)
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <PageHero
                title={isExternalProfileView ? (displayProfile?.name || 'Profile') : 'Profile'}
                subtitle={isExternalProfileView
                    ? `${displayRole === 'alumni' ? 'Alumni' : 'Student'} profile details`
                    : 'Manage your profile, skills, interests, and availability.'}
                icon={UserCircleIcon}
            />

            <div className="card-elevated">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
                    {canEdit && (
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="btn btn-secondary"
                        >
                            {isEditing ? 'Cancel' : 'Edit Profile'}
                        </button>
                    )}
                </div>

                {canEdit && (
                    <div className="border-b border-gray-200 mb-6">
                        <nav className="flex space-x-8">
                            {['basic', 'skills', 'interests', 'availability'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab
                                        ? 'border-primary-600 text-primary-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </nav>
                    </div>
                )}

                {isExternalProfileView && externalLoading ? (
                    <div className="flex items-center justify-center py-10">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                    </div>
                ) : isExternalProfileView && externalError ? (
                    <p className="text-sm text-red-600">{externalError}</p>
                ) : canEdit && isEditing ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Info */}
                        {activeTab === 'basic' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
                                    <div className="flex items-center space-x-4">
                                        <div className="w-16 h-16 bg-primary-100 rounded-full overflow-hidden flex items-center justify-center">
                                            {formData.profilePhoto ? (
                                                <img
                                                    src={getPhotoUrl(formData.profilePhoto)}
                                                    alt="Profile"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-lg font-bold text-primary-700">
                                                    {formData?.name?.charAt(0)?.toUpperCase() || 'U'}
                                                </span>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoChange}
                                            className="input"
                                            disabled={photoUploading}
                                        />
                                    </div>
                                    {photoUploading && <p className="text-sm text-gray-500 mt-2">Uploading photo...</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="input"
                                        required
                                    />
                                </div>

                                {user?.role === 'student' ? (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">College</label>
                                            <input
                                                type="text"
                                                name="college"
                                                value={formData.college}
                                                onChange={handleChange}
                                                className="input"
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                                                <select
                                                    name="branch"
                                                    value={formData.branch}
                                                    onChange={handleChange}
                                                    className="input"
                                                    required
                                                >
                                                    <option value="">Select branch</option>
                                                    {branches.map(b => <option key={b} value={b}>{b}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Graduation Year</label>
                                                <input
                                                    type="number"
                                                    name="graduationYear"
                                                    value={formData.graduationYear}
                                                    onChange={handleChange}
                                                    className="input"
                                                    min="2000"
                                                    max="2030"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                                            <input
                                                type="text"
                                                name="company"
                                                value={formData.company}
                                                onChange={handleChange}
                                                className="input"
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                                                <input
                                                    type="text"
                                                    name="designation"
                                                    value={formData.designation}
                                                    onChange={handleChange}
                                                    className="input"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
                                                <input
                                                    type="number"
                                                    name="experienceYears"
                                                    value={formData.experienceYears}
                                                    onChange={handleChange}
                                                    className="input"
                                                    min="0"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="block text-sm font-medium text-gray-700">Work Experience</label>
                                                <button
                                                    type="button"
                                                    onClick={addWorkExperience}
                                                    className="btn btn-secondary text-sm"
                                                >
                                                    Add Experience
                                                </button>
                                            </div>

                                            {(formData.workExperience || []).length === 0 && (
                                                <p className="text-sm text-gray-500">No experience entries added yet.</p>
                                            )}

                                            {(formData.workExperience || []).map((exp, index) => (
                                                <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <input
                                                            type="text"
                                                            value={exp.company || ''}
                                                            onChange={(e) => updateWorkExperience(index, 'company', e.target.value)}
                                                            className="input"
                                                            placeholder="Company"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={exp.designation || ''}
                                                            onChange={(e) => updateWorkExperience(index, 'designation', e.target.value)}
                                                            className="input"
                                                            placeholder="Role / Designation"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <input
                                                            type="number"
                                                            value={exp.startYear || ''}
                                                            onChange={(e) => updateWorkExperience(index, 'startYear', e.target.value)}
                                                            className="input"
                                                            placeholder="Start year"
                                                            min="1950"
                                                            max="2100"
                                                        />
                                                        <input
                                                            type="number"
                                                            value={exp.endYear || ''}
                                                            onChange={(e) => updateWorkExperience(index, 'endYear', e.target.value)}
                                                            className="input"
                                                            placeholder="End year"
                                                            min="1950"
                                                            max="2100"
                                                            disabled={exp.isCurrent}
                                                        />
                                                    </div>
                                                    <label className="flex items-center space-x-2 text-sm text-gray-700">
                                                        <input
                                                            type="checkbox"
                                                            checked={exp.isCurrent || false}
                                                            onChange={(e) => updateWorkExperience(index, 'isCurrent', e.target.checked)}
                                                        />
                                                        <span>I currently work here</span>
                                                    </label>
                                                    <textarea
                                                        value={exp.description || ''}
                                                        onChange={(e) => updateWorkExperience(index, 'description', e.target.value)}
                                                        className="input"
                                                        rows="3"
                                                        placeholder="Describe your responsibilities and achievements"
                                                    />
                                                    <div className="flex justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeWorkExperience(index)}
                                                            className="btn btn-secondary text-sm"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn URL</label>
                                    <input
                                        type="url"
                                        name="linkedInUrl"
                                        value={formData.linkedInUrl}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="https://linkedin.com/in/yourprofile"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                                    <textarea
                                        name="bio"
                                        value={formData.bio}
                                        onChange={handleChange}
                                        className="input"
                                        rows="3"
                                        placeholder="Tell us about yourself..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* Skills */}
                        {activeTab === 'skills' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                                <div className="flex space-x-2 mb-4">
                                    <input
                                        type="text"
                                        value={newSkill}
                                        onChange={(e) => setNewSkill(e.target.value)}
                                        className="input flex-1"
                                        placeholder="Add a skill"
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                                    />
                                    <button type="button" onClick={addSkill} className="btn btn-primary">Add</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.skills.map(skill => (
                                        <span key={skill} className="badge badge-info">
                                            {skill}
                                            <button
                                                type="button"
                                                onClick={() => removeSkill(skill)}
                                                className="ml-2 text-primary-800 hover:text-primary-900"
                                            >
                                                x
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Interests */}
                        {activeTab === 'interests' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {user?.role === 'student' ? 'Career Interests' : 'Domains of Expertise'}
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {(user?.role === 'student' ? careerInterests : domains).map(interest => (
                                        <button
                                            key={interest}
                                            type="button"
                                            onClick={() => toggleInterest(interest)}
                                            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${formData.careerInterests?.includes(interest) || formData.domains?.includes(interest)
                                                    ? 'bg-primary-50 border-primary-600 text-primary-700'
                                                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                                }`}
                                        >
                                            {interest}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Availability (Alumni Only) */}
                        {activeTab === 'availability' && user?.role === 'alumni' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <h3 className="font-medium text-gray-900">Available for Mentorship</h3>
                                        <p className="text-sm text-gray-500">Accept new mentees for guidance</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="isAvailableForMentorship"
                                            checked={formData.isAvailableForMentorship}
                                            onChange={handleChange}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <h3 className="font-medium text-gray-900">Available for Referrals</h3>
                                        <p className="text-sm text-gray-500">Help students with job referrals</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="isAvailableForReferrals"
                                            checked={formData.isAvailableForReferrals}
                                            onChange={handleChange}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end space-x-4 pt-4 border-t">
                            <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary">Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center space-x-6">
                            <div className="w-20 h-20 bg-primary-100 rounded-full overflow-hidden flex items-center justify-center">
                                {displayProfile?.profilePhoto ? (
                                    <img
                                        src={getPhotoUrl(displayProfile.profilePhoto)}
                                        alt={displayProfile?.name || 'Profile'}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-2xl font-bold text-primary-700">
                                        {displayProfile?.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </span>
                                )}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{displayProfile?.name}</h2>
                                <p className="text-gray-600 capitalize">{displayRole}</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {displayRole === 'student' ? (
                                <>
                                    <div className="flex items-center space-x-3">
                                        <BuildingOfficeIcon className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <p className="text-sm text-gray-500">College</p>
                                            <p className="font-medium">{displayProfile?.college}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <AcademicCapIcon className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <p className="text-sm text-gray-500">Branch & Year</p>
                                            <p className="font-medium">{displayProfile?.branch} | {displayProfile?.graduationYear}</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center space-x-3">
                                        <BuildingOfficeIcon className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <p className="text-sm text-gray-500">Company</p>
                                            <p className="font-medium">{displayProfile?.company}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <BriefcaseIcon className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <p className="text-sm text-gray-500">Designation</p>
                                            <p className="font-medium">{displayProfile?.designation} | {displayProfile?.experienceYears} years</p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {displayProfile?.linkedInUrl && (
                                <div className="flex items-center space-x-3">
                                    <LinkIcon className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-500">LinkedIn</p>
                                        <a href={displayProfile.linkedInUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-600 hover:underline">
                                            View Profile
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>

                        {displayProfile?.bio && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-2">About</h3>
                                <p className="text-gray-700">{displayProfile.bio}</p>
                            </div>
                        )}

                        {(displayProfile?.skills?.length > 0 || displayProfile?.careerInterests?.length > 0 || displayProfile?.domains?.length > 0) && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Skills & Interests</h3>
                                <div className="flex flex-wrap gap-2">
                                    {displayProfile?.skills?.map(s => (
                                        <span key={s} className="badge badge-gray">{s}</span>
                                    ))}
                                    {displayProfile?.careerInterests?.map(i => (
                                        <span key={i} className="badge badge-info">{i}</span>
                                    ))}
                                    {displayProfile?.domains?.map(d => (
                                        <span key={d} className="badge badge-success">{d}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {displayRole === 'alumni' && displayProfile?.rating && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Mentor Rating</h3>
                                <p className="text-gray-800 font-medium">
                                    {Number(displayProfile.rating.average || 0).toFixed(1)} / 5
                                    <span className="text-gray-500 font-normal"> ({displayProfile.rating.count || 0} ratings)</span>
                                </p>
                            </div>
                        )}

                        {displayRole === 'alumni' && displayProfile?.feedbacks?.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Student Feedback</h3>
                                <div className="space-y-3">
                                    {displayProfile.feedbacks.map((feedback, idx) => (
                                        <div key={`${feedback.givenAt || idx}-${idx}`} className="p-3 rounded-lg border border-gray-200">
                                            <div className="flex items-center justify-between">
                                                <p className="font-medium text-gray-900">{feedback.student?.name || 'Student'}</p>
                                                <span className="text-sm text-yellow-600 font-semibold">{feedback.rating || 0}/5</span>
                                            </div>
                                            {feedback.comment && (
                                                <p className="text-sm text-gray-700 mt-1">{feedback.comment}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {displayRole === 'alumni' && displayProfile?.mediaPosts?.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Posts</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {displayProfile.mediaPosts.map((post, idx) => (
                                        <div key={`${post.url || idx}-${idx}`} className="rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                                            {post.mediaType === 'video' ? (
                                                <video
                                                    src={getPhotoUrl(post.url)}
                                                    controls
                                                    className="w-full h-48 object-cover bg-black"
                                                />
                                            ) : (
                                                <img
                                                    src={getPhotoUrl(post.url)}
                                                    alt={post.caption || 'Post'}
                                                    className="w-full h-48 object-cover"
                                                />
                                            )}
                                            {post.caption && (
                                                <p className="text-sm text-gray-700 p-3">{post.caption}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {displayRole === 'alumni' && displayProfile?.workExperience?.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Work Experience</h3>
                                <div className="space-y-3">
                                    {displayProfile.workExperience.map((exp, index) => (
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
                )}
            </div>
        </div>
    )
}


