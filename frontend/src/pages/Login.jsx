import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { AcademicCapIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/20/solid'

export default function Login() {
    const navigate = useNavigate()
    const { login, loading, clearError } = useAuthStore()
    const [formData, setFormData] = useState({ email: '', password: '' })
    const [showPassword, setShowPassword] = useState(false)

    const handleChange = (e) => {
        clearError()
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const result = await login(formData.email, formData.password)
        if (result.success) {
            toast.success('Welcome back!')
            const role = useAuthStore.getState().user?.role
            navigate(role === 'admin' ? '/admin' : '/dashboard')
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
                    <h1 className="text-4xl font-bold mb-4">Welcome Back!</h1>
                    <p className="text-blue-100 text-lg">
                        Sign in to continue your journey with alumni mentors and accelerate your career.
                    </p>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md card-elevated">
                    <div className="lg:hidden mb-8 text-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <AcademicCapIcon className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Welcome Back!</h1>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to your account</h2>
                    <p className="text-gray-600 mb-8">
                        Don't have an account? <Link to="/register" className="text-primary-600 hover:underline">Sign up</Link>
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
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

                        <button type="submit" className="btn btn-primary w-full py-3" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-600">
                            Demo credentials:<br />
                            Student: student@demo.com / demo123<br />
                            Alumni: alumni@demo.com / demo123<br />
                            Admin: admin@demo.com / demo123
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
