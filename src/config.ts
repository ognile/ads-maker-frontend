export const API_BASE = import.meta.env.VITE_API_URL || '/api'

// Derive WebSocket URL from API_BASE
const apiUrl = import.meta.env.VITE_API_URL || window.location.origin + '/api'
export const WS_BASE = apiUrl.replace(/^http/, 'ws')
