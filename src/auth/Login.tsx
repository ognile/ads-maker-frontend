import { useState } from 'react'
import { useAuth } from './AuthContext'
import { Loader2, Mail, ArrowRight, CheckCircle } from 'lucide-react'

export function Login() {
  const { login, verifyOtp } = useAuth()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const result = await login(email)

    setIsLoading(false)

    if (result.success) {
      setMessage(result.message)
      setStep('code')
    } else {
      setError(result.message)
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const result = await verifyOtp(email, code)

    setIsLoading(false)

    if (!result.success) {
      setError(result.message)
    }
    // If success, AuthContext will update and App will show the main content
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold tracking-tight">AI Ad Maker</h1>
          <p className="text-sm text-[#737373] mt-1">Sign in to continue</p>
        </div>

        {step === 'email' ? (
          /* Email Step */
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-[#737373] mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A3A3]" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  className="w-full h-10 pl-10 pr-3 text-sm border border-[#E5E5E5] focus:outline-none focus:border-black"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full h-10 bg-black text-white text-sm font-medium hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Code Verification Step */
          <form onSubmit={handleVerifyCode} className="space-y-4">
            {message && (
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 text-green-800 text-sm">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <div>
              <label htmlFor="code" className="block text-xs font-medium text-[#737373] mb-1.5">
                Enter the 6-digit code sent to {email}
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                autoFocus
                className="w-full h-10 px-3 text-sm text-center tracking-[0.5em] font-mono border border-[#E5E5E5] focus:outline-none focus:border-black"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="w-full h-10 bg-black text-white text-sm font-medium hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Sign in'
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('email')
                setCode('')
                setError('')
                setMessage('')
              }}
              className="w-full h-10 text-sm text-[#737373] hover:text-black"
            >
              Use a different email
            </button>
          </form>
        )}

        {/* Footer */}
        <p className="text-xs text-[#A3A3A3] text-center mt-8">
          Only authorized emails can access this application.
        </p>
      </div>
    </div>
  )
}
