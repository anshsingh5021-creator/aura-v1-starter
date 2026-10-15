import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthForm({ onAuthenticated }) {
  const [mode, setMode] = useState('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [emailConfirmation, setEmailConfirmation] = useState(false)
  const [confirmedEmail, setConfirmedEmail] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    setLoading(true)
    setError('')

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } =
          await supabase.auth.signUp({
            email: email.trim(),
            password
          })

        if (signUpError) {
          throw signUpError
        }

        // Supabase requires email confirmation before a session exists.
        if (!data.session) {
          setConfirmedEmail(email.trim())
          setEmailConfirmation(true)
          return
        }

        onAuthenticated(data.user)
        return
      }

      // SIGN IN
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        })

      if (signInError) {
        throw signInError
      }

      onAuthenticated(data.user)
    } catch (err) {
      setError(
        err?.message || 'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function resendEmail() {
    if (!confirmedEmail) return

    setLoading(true)
    setError('')

    try {
      const { error: resendError } =
        await supabase.auth.resend({
          type: 'signup',
          email: confirmedEmail
        })

      if (resendError) {
        throw resendError
      }

      setError('')
    } catch (err) {
      setError(
        err?.message || 'Could not resend the email.'
      )
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // EMAIL CONFIRMATION SCREEN
  // ==========================================

  if (emailConfirmation) {
    return (
      <div className="auth-screen">
        <div className="auth-logo">
          aura<span>.</span>
        </div>

        <div className="auth-card confirmation-card">

          <div className="confirmation-icon">
            ✉
          </div>

          <div className="eyebrow">
            ONE MORE STEP
          </div>

          <h1>
            Confirm your email.
          </h1>

          <p className="auth-subtitle">
            We sent a confirmation link to:
          </p>

          <div className="confirmation-email">
            {confirmedEmail}
          </div>

          <p className="confirmation-copy">
            Open the email and tap{' '}
            <strong>
              “Confirm email address”
            </strong>{' '}
            to finish creating your Aura account.
          </p>

          <div className="confirmation-note">
            <strong>Didn't get it?</strong>
            <span>
              Check your spam folder or resend the email below.
            </span>
          </div>

          <button
            type="button"
            className="auth-submit"
            onClick={resendEmail}
            disabled={loading}
          >
            {loading
              ? 'Sending...'
              : 'Resend confirmation email'}
          </button>

          <button
            type="button"
            className="auth-switch"
            onClick={() => {
              setEmailConfirmation(false)
              setError('')
              setPassword('')
            }}
          >
            Use a different email
          </button>

          {error && (
            <div className="auth-error confirmation-error">
              {error}
            </div>
          )}

        </div>

        <div className="verification-promise">
          <strong>
            🔒 One-time campus verification
          </strong>

          <span>
            Your student ID is used only to verify your campus
            membership and is deleted after verification.
          </span>
        </div>
      </div>
    )
  }

  // ==========================================
  // SIGNUP / LOGIN
  // ==========================================

  return (
    <div className="auth-screen">

      <div className="auth-logo">
        aura<span>.</span>
      </div>

      <div className="auth-card">

        <div className="eyebrow">
          {mode === 'signup'
            ? 'JOIN YOUR CAMPUS'
            : 'WELCOME BACK'}
        </div>

        <h1>
          {mode === 'signup'
            ? 'Create your Aura.'
            : 'Enter your Aura.'}
        </h1>

        <p className="auth-subtitle">
          {mode === 'signup'
            ? 'Verified students. One campus. One ranking.'
            : 'Your campus is waiting.'}
        </p>

        <form onSubmit={handleSubmit}>

          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="At least 6 characters"
              autoComplete={
                mode === 'signup'
                  ? 'new-password'
                  : 'current-password'
              }
              minLength={6}
              required
            />
          </label>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Creating your Aura...'
              : mode === 'signup'
                ? 'Continue'
                : 'Sign in'}
          </button>

        </form>

        <button
          className="auth-switch"
          type="button"
          onClick={() => {
            setMode(
              mode === 'signup'
                ? 'signin'
                : 'signup'
            )

            setError('')
          }}
        >
          {mode === 'signup'
            ? 'Already have an account? Sign in'
            : 'New to Aura? Create an account'}
        </button>

      </div>

      {mode === 'signup' && (
        <div className="verification-promise">

          <strong>
            🔒 One-time campus verification
          </strong>

          <span>
            Your student ID is used only to verify your campus
            membership. It is deleted after verification.
          </span>

        </div>
      )}

    </div>
  )
}