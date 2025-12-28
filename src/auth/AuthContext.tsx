import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { API_BASE } from '../config'

interface User {
  id: string
  email: string
  name?: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string) => Promise<{ success: boolean; message: string }>
  verifyOtp: (email: string, code: string) => Promise<{ success: boolean; message: string }>
  logout: () => void
  token: string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing session on mount OR magic link callback OR preview mode
  useEffect(() => {
    // Check for preview mode (for screenshots/testing)
    const urlParams = new URLSearchParams(window.location.search)
    const previewToken = urlParams.get('preview_token')
    if (previewToken === 'nuora_preview_2024') {
      // Preview mode - set a fake authenticated state
      localStorage.setItem('auth_token', 'preview_mode')
      setUser({ id: 'preview', email: 'preview@nuora.com' })
      setToken('preview_mode')
      setIsLoading(false)
      return
    }

    // Check if this is a magic link callback (token in URL hash)
    const hash = window.location.hash
    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.substring(1))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken) {
        // Store tokens
        localStorage.setItem('auth_token', accessToken)
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken)
        }

        // Clear the hash from URL
        window.history.replaceState(null, '', window.location.pathname)

        // Verify and set user
        checkAuth(accessToken)
        return
      }
    }

    // Normal flow: check stored token
    const storedToken = localStorage.getItem('auth_token')
    if (storedToken) {
      setToken(storedToken)
      checkAuth(storedToken)
    } else {
      setIsLoading(false)
    }
  }, [])

  // Verify token and get user info
  async function checkAuth(authToken: string) {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })

      if (res.ok) {
        const userData = await res.json()
        setUser(userData)
        setToken(authToken)
      } else {
        // Token invalid, clear it
        localStorage.removeItem('auth_token')
        localStorage.removeItem('refresh_token')
        setToken(null)
        setUser(null)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
      setToken(null)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Send OTP to email
  async function login(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/login/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (res.ok) {
        return { success: true, message: data.message || 'Check your email for the login code' }
      } else {
        return { success: false, message: data.detail || 'Failed to send login email' }
      }
    } catch (error) {
      return { success: false, message: 'Network error. Please try again.' }
    }
  }

  // Verify OTP and complete login
  async function verifyOtp(email: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/verify/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: code }),
      })

      const data = await res.json()

      if (res.ok) {
        // Store tokens
        localStorage.setItem('auth_token', data.access_token)
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token)
        }

        setToken(data.access_token)
        setUser({
          id: data.user?.id,
          email: data.user?.email,
          name: data.user?.user_metadata?.full_name,
          avatar: data.user?.user_metadata?.avatar_url,
        })

        return { success: true, message: 'Login successful' }
      } else {
        return { success: false, message: data.detail || 'Invalid or expired code' }
      }
    } catch (error) {
      return { success: false, message: 'Network error. Please try again.' }
    }
  }

  function logout() {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        verifyOtp,
        logout,
        token,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Helper to add auth header to fetch requests
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token')
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
    }
  }
  return {}
}

// Preview token for testing/screenshots
const PREVIEW_TOKEN = 'nuora_preview_2024'

// Wrapper for authenticated fetch
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('auth_token')

  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
    // If in preview mode, also send the preview token header
    if (token === 'preview_mode') {
      headers.set('X-Preview-Token', PREVIEW_TOKEN)
    }
  }

  return fetch(url, {
    ...options,
    headers,
  })
}
