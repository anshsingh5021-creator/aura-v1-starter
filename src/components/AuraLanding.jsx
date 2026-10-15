import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuraLanding({ onEmail }) {
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState('')

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setGoogleError('')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })

    if (error) {
      console.error('Google login failed:', error)

      setGoogleError(
        error.message || 'Google login failed. Please try again.'
      )

      setGoogleLoading(false)
    }
  }

  return (
    <div className="aura-landing">

      {/* BLURRED AURA BATTLE BACKGROUND */}
      <div className="aura-landing-background">
        <div className="aura-landing-bg-image" />
        <div className="aura-landing-dark" />
        <div className="aura-landing-blur" />
      </div>

      {/* LOGIN CONTENT */}
      <div className="aura-landing-content">

        <div className="aura-landing-logo">
          aura<span>.</span>
        </div>

        <p className="aura-landing-tagline">
          Vote anonymously. Discover your Aura.
        </p>

        <button
          type="button"
          className="google-login-button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
        >
          <span className="google-icon">
            G
          </span>

          <span>
            {googleLoading
              ? 'Connecting...'
              : 'Continue with Google'}
          </span>
        </button>

        {googleError && (
          <p className="google-login-error">
            {googleError}
          </p>
        )}

        <div className="email-divider">
          <span />
          <p>or</p>
          <span />
        </div>

        <button
          type="button"
          className="email-login-button"
          onClick={onEmail}
        >
          Use Email Instead
        </button>

      </div>

    </div>
  )
}