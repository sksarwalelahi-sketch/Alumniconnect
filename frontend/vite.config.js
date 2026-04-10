import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@heroicons/react/20/solid': fileURLToPath(new URL('./node_modules/@heroicons/react/20/solid/index.js', import.meta.url)),
            "@heroicons/react/24/outline": "@heroicons/react/20/solid"
        }
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true
            },
            '/uploads': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true
            },
            '/socket.io': {
                target: 'http://127.0.0.1:5000',
                ws: true
            }
        }
    }
})
