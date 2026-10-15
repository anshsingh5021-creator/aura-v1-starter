import { useEffect, useRef, useState } from 'react'
import { Check, FileUp, ShieldCheck, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

export default function VerificationScreen({ user }) {
  const fileInputRef = useRef(null)

  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [status, setStatus] = useState('not_started')
  const [error, setError] = useState('')

  // ---------------------------------
  // CHECK EXISTING VERIFICATION
  // ---------------------------------

  useEffect(() => {
    async function loadVerificationStatus() {
      if (!user?.id) {
        setChecking(false)
        return
      }

      const { data, error: statusError } = await supabase
        .from('verification_submissions')
        .select('status')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (statusError) {
        console.error(
          'Could not load verification status:',
          statusError
        )
      } else if (data?.status) {
        setStatus(data.status)
      }

      setChecking(false)
    }

    loadVerificationStatus()
  }, [user])

  // ---------------------------------
  // SELECT FILE
  // ---------------------------------

  function handleFileChange(event) {
    const file = event.target.files?.[0]

    if (!file) return

    setError('')

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
  setSelectedFile(null)

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
  }

  setError('Your ID image must be smaller than 5 MB.')
  return
}

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    const nextPreview = URL.createObjectURL(file)

    setSelectedFile(file)
    setPreviewUrl(nextPreview)
  }

  // ---------------------------------
  // SUBMIT ID
  // ---------------------------------

  async function submitVerification() {
    if (!selectedFile || !user?.id) return

    setLoading(true)
    setError('')

    let uploadedPath = null

    try {
      // 1. Find BIT Durg
      const { data: college, error: collegeError } =
        await supabase
          .from('colleges')
          .select('id, name')
          .eq(
            'name',
            'Bhilai Institute of Technology, Durg'
          )
          .eq('is_active', true)
          .maybeSingle()

      if (collegeError) {
        throw collegeError
      }

      if (!college) {
        throw new Error(
          'Your campus is not currently available.'
        )
      }

      // 2. Prevent duplicate pending submissions
      const { data: existing, error: existingError } =
        await supabase
          .from('verification_submissions')
          .select('id, status')
          .eq('user_id', user.id)
          .order('submitted_at', {
            ascending: false
          })
          .limit(1)
          .maybeSingle()

      if (existingError) {
        throw existingError
      }

      if (existing?.status === 'pending') {
        setStatus('pending')
        return
      }

      // 3. Create a unique storage path
      const fileExtension =
        selectedFile.name.split('.').pop()?.toLowerCase() ||
        'jpg'

      const fileName =
        `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`

      uploadedPath =
        `${user.id}/${fileName}`

      // 4. Upload to the PRIVATE bucket
      const { error: uploadError } =
        await supabase.storage
          .from('verification-ids')
          .upload(uploadedPath, selectedFile, {
            cacheControl: '0',
            upsert: false,
            contentType: selectedFile.type
          })

      if (uploadError) {
        throw uploadError
      }

      // 5. Create verification submission
      const { error: submissionError } =
        await supabase
          .from('verification_submissions')
          .insert({
            user_id: user.id,
            college_id: college.id,
            status: 'pending',
            id_storage_path: uploadedPath
          })

      if (submissionError) {
        // Don't leave the ID sitting in storage if
        // the verification record couldn't be created.
        await supabase.storage
          .from('verification-ids')
          .remove([uploadedPath])

        throw submissionError
      }

      // 6. For now, the admin review is pending.
      setStatus('pending')
      setSelectedFile(null)

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl('')
      }
    } catch (err) {
      console.error(
        'Verification submission failed:',
        err
      )

      setError(
        err?.message ||
          'We could not submit your verification. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  // ---------------------------------
  // CLEANUP PREVIEW URL
  // ---------------------------------

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  // ---------------------------------
  // LOADING
  // ---------------------------------

  if (checking) {
    return (
      <div className="auth-loading">
        <div className="wordmark">
          aura<span>.</span>
        </div>
      </div>
    )
  }

  // ---------------------------------
  // PENDING
  // ---------------------------------

  if (status === 'pending') {
    return (
      <div className="auth-screen">
        <div className="auth-logo">
          aura<span>.</span>
        </div>

        <div className="auth-card verification-card">
          <div className="verification-icon">
            <ShieldCheck size={28} />
          </div>

          <div className="eyebrow">
            VERIFICATION PENDING
          </div>

          <h1>
            We&apos;re checking your campus ID.
          </h1>

          <p className="auth-subtitle">
            Your verification has been submitted for
            review.
          </p>

          <div className="verification-status-box">
            <Check size={17} />
            <div>
              <strong>
                ID submitted
              </strong>

              <span>
                You&apos;ll enter Aura once your campus
                membership is approved.
              </span>
            </div>
          </div>

          <div className="verification-delete-note">
            <Trash2 size={16} />

            <span>
              Your ID is used only for verification.
              It will be deleted after the verification
              process.
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------
  // MAIN VERIFICATION SCREEN
  // ---------------------------------

  return (
    <div className="auth-screen">
      <div className="auth-logo">
        aura<span>.</span>
      </div>

      <div className="auth-card verification-card">

        <div className="eyebrow">
          VERIFY YOUR CAMPUS
        </div>

        <h1>
          Prove you belong here.
        </h1>

        <p className="auth-subtitle">
          Upload your Bhilai Institute of Technology
          student ID once so we can keep Aura campus-only.
        </p>

        {!selectedFile && (
          <button
            type="button"
            className="id-upload-zone"
            onClick={() =>
              fileInputRef.current?.click()
            }
          >
            <div className="upload-icon">
              <FileUp size={24} />
            </div>

            <strong>
              Upload student ID
            </strong>

            <span>
              JPG, PNG or WEBP · Max 5 MB
            </span>
          </button>
        )}

        {selectedFile && (
          <div className="id-preview-area">

            <img
              src={previewUrl}
              alt="Student ID preview"
              className="id-preview"
            />

            <div className="selected-file-info">
              <strong>
                {selectedFile.name}
              </strong>

              <span>
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>

            <button
              type="button"
              className="change-id-button"
              onClick={() =>
                fileInputRef.current?.click()
              }
            >
              Choose another photo
            </button>

          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={handleFileChange}
        />

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <button
          type="button"
          className="auth-submit"
          disabled={!selectedFile || loading}
          onClick={submitVerification}
        >
          {loading
            ? 'Submitting verification...'
            : 'Submit for verification'}
        </button>

        <div className="verification-promise verification-promise-large">

          <strong>
            🔒 One-time verification
          </strong>

          <span>
            Your ID is never shown on your Aura profile,
            never used for ranking, and is deleted after
            verification.
          </span>

        </div>

      </div>
    </div>
  )
}