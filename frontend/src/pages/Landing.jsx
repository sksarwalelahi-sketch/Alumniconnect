import { Link } from 'react-router-dom'
import {
    AcademicCapIcon,
    UserGroupIcon,
    ChatBubbleLeftRightIcon,
    ArrowRightIcon,
    CheckCircleIcon
} from '@heroicons/react/20/solid'

const features = [
    {
        icon: AcademicCapIcon,
        title: 'AI-Powered Matching',
        description: 'Our intelligent algorithm matches students with the perfect mentors based on skills, interests, and career goals.'
    },
    {
        icon: UserGroupIcon,
        title: 'Mentorship & Referrals',
        description: 'Connect with successful alumni for career guidance, mentorship, and job referrals.'
    },
    {
        icon: ChatBubbleLeftRightIcon,
        title: 'Real-time Chat',
        description: 'Communicate seamlessly with your mentors through our secure in-app messaging system.'
    }
]

const benefits = [
    'Access to verified alumni network',
    'Personalized mentorship recommendations',
    'Job referral opportunities',
    'Career guidance and industry insights',
    'Network expansion',
    'Skill development resources'
]

export default function Landing() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-primary-50 via-blue-50/40 to-white relative overflow-hidden">
            <div className="pointer-events-none absolute -top-24 -right-16 w-96 h-96 rounded-full bg-gradient-to-br from-blue-300/35 to-cyan-300/25 blur-3xl" />

            <header className="container mx-auto px-4 py-6">
                <nav className="glass-panel rounded-2xl px-4 py-3 flex items-center justify-between shadow-md shadow-blue-100/30">
                    <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-md shadow-blue-400/25">
                            <AcademicCapIcon className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gray-900">CareerBridge</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Link to="/login" className="text-gray-700 hover:text-primary-600 font-medium">Login</Link>
                        <Link to="/register" className="btn btn-primary">Get Started</Link>
                    </div>
                </nav>
            </header>

            <section className="container mx-auto px-4 py-20 lg:py-32">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
                        Connect with <span className="text-primary-600">Alumni Mentors</span> for Career Success
                    </h1>
                    <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                        Our platform connects students with verified alumni for mentorship, referrals, and career guidance.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link to="/register" className="btn btn-primary text-lg px-8 py-3">
                            Join Now - It's Free
                            <ArrowRightIcon className="w-5 h-5 ml-2 inline" />
                        </Link>
                        <Link to="/login" className="btn btn-secondary text-lg px-8 py-3">Sign In</Link>
                    </div>
                </div>
            </section>

            <section className="container mx-auto px-4 py-20">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Why Choose CareerBridge?</h2>
                    <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
                        Our platform provides everything you need to build meaningful connections and accelerate your career growth.
                    </p>
                    <div className="grid md:grid-cols-3 gap-8">
                        {features.map((feature) => (
                            <div key={feature.title} className="card-elevated">
                                <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-cyan-100 rounded-xl flex items-center justify-center mb-4">
                                    <feature.icon className="w-6 h-6 text-primary-700" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                                <p className="text-gray-600">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-gradient-to-r from-slate-50 to-blue-50/60 py-20 border-y border-white/80">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div>
                                <h2 className="text-3xl font-bold text-gray-900 mb-6">Unlock Your Career Potential</h2>
                                <p className="text-gray-600 mb-8">
                                    Join thousands of students who have successfully connected with alumni mentors and accelerated their careers.
                                </p>
                                <ul className="space-y-3">
                                    {benefits.map((benefit) => (
                                        <li key={benefit} className="flex items-center text-gray-700">
                                            <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3" />
                                            {benefit}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-gradient-to-br from-primary-700 to-cyan-600 rounded-2xl p-8 text-white shadow-2xl shadow-blue-400/25">
                                <div className="text-5xl font-bold mb-2">10K+</div>
                                <div className="text-primary-100 mb-6">Active Students</div>
                                <div className="text-5xl font-bold mb-2">5K+</div>
                                <div className="text-primary-100 mb-6">Verified Alumni</div>
                                <div className="text-5xl font-bold mb-2">15K+</div>
                                <div className="text-primary-100">Successful Connections</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="container mx-auto px-4 py-20">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Start Your Journey?</h2>
                    <p className="text-gray-600 mb-8">
                        Join our community today and connect with alumni who can help you achieve your career goals.
                    </p>
                    <Link to="/register" className="btn btn-primary text-lg px-8 py-3">
                        Create Free Account
                        <ArrowRightIcon className="w-5 h-5 ml-2 inline" />
                    </Link>
                </div>
            </section>

            <footer className="bg-gray-900 text-white py-12">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center justify-between">
                        <div className="flex items-center space-x-2 mb-4 md:mb-0">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-cyan-500 rounded-lg flex items-center justify-center">
                                <AcademicCapIcon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-lg font-bold">CareerBridge</span>
                        </div>
                        <p className="text-gray-400 text-sm">(c) 2026 CareerBridge. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
