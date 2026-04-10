import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { AcademicCapIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/20/solid'

export default function Register() {
    const navigate = useNavigate()
    const { register, loading, clearError } = useAuthStore()
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student'
    })
    const [showPassword, setShowPassword] = useState(false)

    const handleChange = (e) => {
        clearError()
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        if (formData.password.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }

        const result = await register({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: formData.role
        })

        if (result.success) {
            toast.success('Account created successfully!')
            navigate('/profile', { state: { startEditing: true, fromSignup: true } })
        } else {
            toast.error(result.message)
        }
    }

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50/70 to-cyan-50/60">
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0f2d62] via-[#17458f] to-[#0e77b7] items-center justify-center p-12 relative overflow-hidden">
                <div className="pointer-events-none absolute -top-24 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-cyan-200/20 blur-3xl" />
                <div className="max-w-md text-white relative">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-8">
                        <AcademicCapIcon className="w-10 h-10" />
                    </div>
                    <h1 className="text-4xl font-bold mb-4">Join Our Community!</h1>
                    <p className="text-blue-100 text-lg">
                        Connect with alumni mentors, build your professional network, and accelerate your career journey.
                    </p>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md card-elevated">
                    <div className="lg:hidden mb-8 text-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <AcademicCapIcon className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h2>
                    <p className="text-gray-600 mb-8">
                        Already have an account? <Link to="/login" className="text-primary-600 hover:underline">Sign in</Link>
                    </p>

                    <div className="flex space-x-4 mb-6">
                        <button
                            type="button"
                            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${formData.role === 'student'
                                ? 'bg-primary-600 text-white shadow-md shadow-blue-400/25'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            onClick={() => setFormData({ ...formData, role: 'student' })}
                        >
                            I'm a Student
                        </button>
                        <button
                            type="button"
                            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${formData.role === 'alumni'
                                ? 'bg-primary-600 text-white shadow-md shadow-blue-400/25'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            onClick={() => setFormData({ ...formData, role: 'alumni' })}
                        >
                            I'm an Alumni
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="input"
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="input"
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="input pr-10"
                                    placeholder="********"
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="input"
                                placeholder="********"
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary w-full py-3" disabled={loading}>
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>

                    <p className="mt-6 text-xs text-gray-500 text-center">
                        By creating an account, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </div>
            </div>
        </div>
    )
}
