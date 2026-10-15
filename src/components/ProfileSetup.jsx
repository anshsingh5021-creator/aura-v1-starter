import { useRef, useState } from 'react'
import { Camera, ImagePlus } from 'lucide-react'
import { supabase } from '../lib/supabase'

const MAX_FILE_SIZE = 5 * 1024 * 1024

export default function ProfileSetup({
  user,
  collegeId,
  onComplete
}) {
  const fileInputRef = useRef(null)

  const [fullName, setFullName] = useState('')
  const [branch, setBranch] = useState('')
  const [degree, setDegree] = useState('')
  const [semester, setSemester] = useState('')

  const [photoFile, setPhotoFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handlePhotoChange(event) {
    const file = event.target.files?.[0]

    if (!file) return

    setError('')

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Profile picture must be smaller than 5 MB.')
      return
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    const nextPreview = URL.createObjectURL(file)

    setPhotoFile(file)
    setPreviewUrl(nextPreview)
  }

  async function saveProfile(event) {
    event.preventDefault()

    if (!user?.id) {
      setError('Your session has expired. Please sign in again.')
      return
    }

    if (!collegeId) {
      setError('Your college verification is missing.')
      return
    }

    if (!fullName.trim()) {
      setError('Enter your name.')
      return
    }

    if (!branch) {
      setError('Select your branch.')
      return
    }

    if (!degree) {
      setError('Select your degree.')
      return
    }

    if (!semester) {
      setError('Select your semester.')
      return
    }

    if (!photoFile) {
      setError('Add your Aura picture.')
      return
    }

    setLoading(true)
    setError('')

    let photoPath = null

    try {
      // -----------------------------
      // UPLOAD PROFILE PICTURE
      // -----------------------------

      const extension =
        photoFile.name.split('.').pop()?.toLowerCase() || 'jpg'

      const fileName = `${crypto.randomUUID()}.${extension}`

      photoPath = `${user.id}/${fileName}`

      const {
        error: uploadError
      } = await supabase.storage
        .from('profile-pictures')
        .upload(photoPath, photoFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: photoFile.type
        })

      if (uploadError) {
        throw uploadError
      }

      // -----------------------------
      // CREATE PROFILE
      // -----------------------------

      const {
        data: profile,
        error: profileError
      } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          college_id: collegeId,
          full_name: fullName.trim(),
          branch,
          degree,
          semester: Number(semester),
          photo_path: photoPath
        })
        .select()
        .single()

      if (profileError) {
        // Remove uploaded photo if DB insert fails
        await supabase.storage
          .from('profile-pictures')
          .remove([photoPath])

        throw profileError
      }

      onComplete(profile)
    } catch (err) {
      console.error('Profile creation failed:', err)

      setError(
        err?.message ||
        'Could not create your Aura profile.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen profile-setup-screen">

      <div className="auth-logo">
        aura<span>.</span>
      </div>

      <div className="auth-card profile-setup-card">

        <div className="eyebrow">
          ONE LAST STEP
        </div>

        <h1>
          Create your Aura.
        </h1>

        <p className="auth-subtitle">
          This is what other students will see during
          Aura battles.
        </p>

        {/* PROFILE PHOTO */}

        <div className="setup-photo-wrap">

          <button
            type="button"
            className="setup-photo-button"
            onClick={() =>
              fileInputRef.current?.click()
            }
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Profile preview"
                className="setup-photo-preview"
              />
            ) : (
              <>
                <ImagePlus size={28} />
                <span>Add photo</span>
              </>
            )}

            <span className="setup-camera">
              <Camera size={15} />
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={handlePhotoChange}
          />

          <small>
            This picture will appear on your Aura profile.
          </small>

        </div>

        <form onSubmit={saveProfile}>

          {/* NAME */}

          <label>
            Name

            <input
              type="text"
              value={fullName}
              onChange={(event) =>
                setFullName(event.target.value)
              }
              placeholder="Your name"
              maxLength={60}
              required
            />
          </label>

          {/* BRANCH */}

          {/* BRANCH */}

<label>
  Branch

  <select
    value={branch}
    onChange={(event) =>
      setBranch(event.target.value)
    }
    required
  >
    <option value="">
      Select branch
    </option>

    <option value="CSE">
      CSE
    </option>

    <option value="CSE AI">
      CSE AI
    </option>

    <option value="CSE DS">
      CSE DS
    </option>

    <option value="CST">
      CST
    </option>

    <option value="IT">
      IT
    </option>

    <option value="ECS">
      ECS
    </option>

    <option value="EEE">
      EEE
    </option>

    <option value="Mechanical">
      Mechanical
    </option>

    <option value="Electrical">
      Electrical
    </option>

    <option value="Civil">
      Civil
    </option>
  </select>
</label>

          {/* DEGREE */}

          <label>
            Degree

            <select
              value={degree}
              onChange={(event) =>
                setDegree(event.target.value)
              }
              required
            >
              <option value="">
                Select degree
              </option>

              <option value="B.Tech">
                B.Tech
              </option>

              <option value="M.Tech">
                M.Tech
              </option>

              <option value="BCA">
                BCA
              </option>

              <option value="MCA">
                MCA
              </option>

              <option value="BBA">
                BBA
              </option>

              <option value="MBA">
                MBA
              </option>

              <option value="Other">
                Other
              </option>
            </select>
          </label>

          {/* SEMESTER */}

          <label>
            Semester

            <select
              value={semester}
              onChange={(event) =>
                setSemester(event.target.value)
              }
              required
            >
              <option value="">
                Select semester
              </option>

              {[1, 2, 3, 4, 5, 6, 7, 8].map(
                (sem) => (
                  <option
                    key={sem}
                    value={sem}
                  >
                    {sem}
                  </option>
                )
              )}
            </select>
          </label>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? 'Creating your Aura...'
              : 'Enter Aura'}
          </button>

        </form>

        <div className="verification-promise">
          <strong>
            🔒 Verified student profile
          </strong>

          <span>
            Your student ID is never shown on your
            profile or used during Aura battles.
          </span>
        </div>

      </div>
    </div>
  )
}