import { create } from 'zustand'
import api from '../services/api'

export const useAuthStore = create((set, get) => ({
    user: null,
    profile: null,
    token: localStorage.getItem('token') || null,
    loading: true,
    error: null,

    // Initialize auth state
    checkAuth: async () => {
        const token = localStorage.getItem('token')

        if (!token) {
            set({ user: null, profile: null, loading: false })
            return
        }

        try {
            const response = await api.get('/auth/me')
            set({
                user: response.data.data.user,
                profile: response.data.data.profile,
                loading: false
            })
        } catch (error) {
            localStorage.removeItem('token')
            set({ user: null, profile: null, loading: false })
        }
    },

    // Login
    login: async (email, password) => {
        set({ loading: true, error: null })
        try {
            const response = await api.post('/auth/login', { email, password })
            const { user, profile, token } = response.data.data

            localStorage.setItem('token', token)
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`

            set({ user, profile, token, loading: false })
            return { success: true }
        } catch (error) {
            const message = error.response?.data?.message || 'Login failed'
            set({ error: message, loading: false })
            return { success: false, message }
        }
    },

    // Register
    register: async (userData) => {
        set({ loading: true, error: null })
        try {
            const response = await api.post('/auth/register', userData)
            const { user, token } = response.data.data

            localStorage.setItem('token', token)
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`

            set({ user, token, loading: false })
            return { success: true }
        } catch (error) {
            const message = error.response?.data?.message || 'Registration failed'
            set({ error: message, loading: false })
            return { success: false, message }
        }
    },

    // Logout
    logout: () => {
        localStorage.removeItem('token')
        delete api.defaults.headers.common['Authorization']
        set({ user: null, profile: null, token: null })
    },

    // Update profile
    updateProfile: async (profileData) => {
        set({ loading: true, error: null })
        try {
            const endpoint = get().user?.role === 'student' ? '/students/profile' : '/alumni/profile'
            const response = await api.put(endpoint, profileData)
            set({ profile: response.data.data, loading: false })
            return { success: true }
        } catch (error) {
            const message = error.response?.data?.message || 'Profile update failed'
            set({ error: message, loading: false })
            return { success: false, message }
        }
    },

    // Upload profile photo
    uploadProfilePhoto: async (file) => {
        set({ loading: true, error: null })
        try {
            const endpoint = get().user?.role === 'student' ? '/students/profile-photo' : '/alumni/profile-photo'
            const payload = new FormData()
            payload.append('photo', file)
            const response = await api.put(endpoint, payload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            set({ profile: response.data.data, loading: false })
            return { success: true, data: response.data.data }
        } catch (error) {
            const message = error.response?.data?.message || 'Photo upload failed'
            set({ error: message, loading: false })
            return { success: false, message }
        }
    },

    // Clear error
    clearError: () => set({ error: null }),

    // Set token manually (for socket connection)
    getToken: () => get().token
}))
