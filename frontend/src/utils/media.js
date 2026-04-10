export function getMediaUrl(path) {
    if (!path) return ''
    if (path.startsWith('http://') || path.startsWith('https://')) return path

    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const apiUrl = import.meta.env.VITE_API_URL || ''

    if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
        const origin = apiUrl.replace(/\/api\/?$/, '')
        return `${origin}${normalizedPath}`
    }

    return normalizedPath
}
