import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import VerificationScreen from './components/VerificationScreen.jsx'
import AuthForm from './components/AuthForm.jsx'
import ProfileSetup from './components/ProfileSetup.jsx'
import {
  Flame,
  Trophy,
  UserRound,
  Camera,
  ArrowUp,
  Zap
} from 'lucide-react'

import { supabase } from './lib/supabase'
import './styles.css'

function semesterLabel(semester) {
  if (semester === 1) return '1st'
  if (semester === 2) return '2nd'
  if (semester === 3) return '3rd'
  return `${semester}th`
}

function ProfileCard({ profile, selected, onClick }) {
  return (
    <button
      className={`battle-card ${selected ? 'selected' : ''}`}
      onClick={onClick}
      type="button"
    >
      <img
        src={profile.photo}
        alt={`${profile.name} profile`}
      />

      <div className="battle-gradient" />

      <div className="battle-info">
        <h2>{profile.name}</h2>

        <p>
          {profile.branch} · {profile.degree} ·{' '}
          {semesterLabel(profile.semester)} sem
        </p>
      </div>
    </button>
  )
}

function App() {
  // ---------------------------------
  // AUTH STATE
  // ---------------------------------

  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // ---------------------------------
  // VERIFICATION STATE
  // ---------------------------------

  const [verificationStatus, setVerificationStatus] = useState(null)
  const [verificationLoading, setVerificationLoading] = useState(false)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [verifiedCollegeId, setVerifiedCollegeId] = useState(null)

  // ---------------------------------
  // APP STATE
  // ---------------------------------

  const [tab, setTab] = useState('vote')

  const [battleProfiles, setBattleProfiles] = useState([])
  const [battleLoading, setBattleLoading] = useState(false)
  const [rankingProfiles, setRankingProfiles] = useState([])
  const [rankingLoading, setRankingLoading] = useState(false)
  const [userStats, setUserStats] = useState(null)

  const aura = Number(
    userStats?.aura_rating ??
    profile?.aura_rating ??
    100
  )

  const [battleIndex, setBattleIndex] = useState(0)
  const [selectedWinner, setSelectedWinner] = useState(null)
  const [voteSubmitting, setVoteSubmitting] = useState(false)
  const [notice, setNotice] = useState('')

  const [myProfile, setMyProfile] = useState({
    name: 'Ansh',
    branch: 'CSE',
    degree: 'B.Tech',
    semester: 3,
    photo:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=900&q=85'
  })

  const fileInputRef = useRef(null)

  // ---------------------------------
  // AUTH CHECK
  // ---------------------------------

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const { data, error } =
        await supabase.auth.getSession()

      if (!mounted) return

      if (error) {
        console.error(
          'Failed to load session:',
          error
        )
      }

      setSession(data?.session ?? null)
      setAuthLoading(false)
    }

    loadSession()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession)
        setAuthLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // ---------------------------------
  // VERIFICATION CHECK
  // ---------------------------------

  useEffect(() => {
    let mounted = true

    async function loadVerificationStatus() {
      if (!session?.user?.id) {
        setVerificationStatus(null)
        setVerificationLoading(false)
        return
      }

      setVerificationLoading(true)

      const { data, error } = await supabase
        .from('verification_submissions')
        .select('status')
        .eq('user_id', session.user.id)
        .order('submitted_at', {
          ascending: false
        })
        .limit(1)
        .maybeSingle()

      if (!mounted) return

      if (error) {
        console.error(
          'Failed to load verification status:',
          error
        )

        setVerificationStatus(null)
      } else {
        setVerificationStatus(
          data?.status ?? 'not_started'
        )
      }

      setVerificationLoading(false)
    }

    loadVerificationStatus()

    return () => {
      mounted = false
    }
  }, [session])

  // ---------------------------------
  // PROFILE STATE
  // ---------------------------------

  useEffect(() => {
    let mounted = true

    async function loadProfileState() {
      if (!session?.user?.id) {
        setProfile(null)
        setVerifiedCollegeId(null)
        return
      }

      setProfileLoading(true)

      try {
        // ---------------------------------
        // GET VERIFIED SUBMISSION
        // ---------------------------------

        const {
          data: verification,
          error: verificationError
        } = await supabase
          .from('verification_submissions')
          .select('college_id, status')
          .eq('user_id', session.user.id)
          .eq('status', 'verified')
          .order('verified_at', {
            ascending: false
          })
          .limit(1)
          .maybeSingle()

        if (verificationError) {
          throw verificationError
        }

        if (!mounted) return

        if (verification) {
          setVerifiedCollegeId(
            verification.college_id
          )
        }

        // ---------------------------------
        // GET EXISTING PROFILE
        // ---------------------------------

        const {
          data: existingProfile,
          error: profileError
        } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()

        if (profileError) {
          throw profileError
        }

        if (!mounted) return

        setProfile(existingProfile)
      } catch (error) {
        console.error(
          'Failed to load profile state:',
          error
        )
      } finally {
        if (mounted) {
          setProfileLoading(false)
        }
      }
    }

    loadProfileState()

    return () => {
      mounted = false
    }
  }, [session])

  // ---------------------------------
  // LOAD NEXT BATTLE
  // ---------------------------------

  useEffect(() => {
    let mounted = true

    async function loadNextBattlePair() {
      if (
        !session?.user?.id ||
        !profile?.college_id
      ) {
        return
      }

      setBattleLoading(true)

      try {
        const { data, error } =
          await supabase.rpc(
            'get_next_battle_pair'
          )

        if (error) {
          throw error
        }

        if (!mounted) return

        if (
          !data?.ok ||
          !data?.available
        ) {
          setBattleProfiles([])
          return
        }

        const pair = [
          data.profileA,
          data.profileB
        ]
          .filter(Boolean)
          .map((student) => {
            let photo = ''

            if (student.photo_path) {
              const {
                data: publicUrlData
              } = supabase.storage
                .from('profile-pictures')
                .getPublicUrl(
                  student.photo_path
                )

              photo =
                publicUrlData?.publicUrl || ''
            }

            return {
              id: student.id,
              name: student.name,
              branch: student.branch,
              degree: student.degree,
              semester: student.semester,
              photo,
              aura: Number(
                student.aura || 100
              ),
              battles_played: Number(
                student.battles_played || 0
              )
            }
          })

        setBattleProfiles(pair)
      } catch (error) {
        console.error(
          'Failed to load next battle:',
          error
        )

        setBattleProfiles([])
      } finally {
        if (mounted) {
          setBattleLoading(false)
        }
      }
    }

    loadNextBattlePair()

    return () => {
      mounted = false
    }
  }, [
    session?.user?.id,
    profile?.college_id,
    battleIndex
  ])

  // ---------------------------------
  // LOAD RANKINGS
  // ---------------------------------

  useEffect(() => {
    let mounted = true

    async function loadRankings() {
      if (
        !session?.user?.id ||
        !profile?.college_id
      ) {
        return
      }

      setRankingLoading(true)

      try {
        const {
          data,
          error
        } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            branch,
            semester,
            aura_rating,
            battles_played
          `)
          .eq(
            'college_id',
            profile.college_id
          )
          .order('aura_rating', {
            ascending: false
          })

        if (error) {
          throw error
        }

        if (!mounted) return

        setRankingProfiles(data || [])
      } catch (error) {
        console.error(
          'Failed to load rankings:',
          error
        )
      } finally {
        if (mounted) {
          setRankingLoading(false)
        }
      }
    }

    loadRankings()

    return () => {
      mounted = false
    }
  }, [
    session?.user?.id,
    profile?.college_id,
    battleIndex
  ])

  // ---------------------------------
  // LOAD REAL USER STATS
  // ---------------------------------

  useEffect(() => {
    let mounted = true

    async function loadUserStats() {
      if (!session?.user?.id) {
        return
      }

      try {
        const {
          data,
          error
        } = await supabase.rpc(
          'get_my_aura_stats'
        )

        if (error) {
          throw error
        }

        if (!data?.ok) {
          throw new Error(
            data?.error ||
            'Could not load Aura stats.'
          )
        }

        if (!mounted) return

        setUserStats({
          aura_rating: Number(
            data.aura_rating ?? 100
          ),
          battles_played: Number(
            data.battles_played ?? 0
          ),
          votes_received: Number(
            data.votes_received ?? 0
          ),
          wins: Number(
            data.wins ?? 0
          ),
          win_rate: Number(
            data.win_rate ?? 0
          ),
          votes_cast: Number(
            data.votes_cast ?? 0
          )
        })
      } catch (error) {
        console.error(
          'Failed to load user stats:',
          error
        )
      }
    }

    loadUserStats()

    return () => {
      mounted = false
    }
  }, [
    session?.user?.id,
    battleIndex
  ])

  // ---------------------------------
  // AUTH LOADING SCREEN
  // ---------------------------------

  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="wordmark">
          aura<span>.</span>
        </div>
      </div>
    )
  }

  // ---------------------------------
  // NOT LOGGED IN
  // ---------------------------------

  if (!session) {
    return (
      <AuthForm
        onAuthenticated={() => {}}
      />
    )
  }

  // ---------------------------------
  // VERIFICATION LOADING
  // ---------------------------------

  if (verificationLoading) {
    return (
      <div className="auth-loading">
        <div className="wordmark">
          aura<span>.</span>
        </div>
      </div>
    )
  }

  // ---------------------------------
  // VERIFICATION REQUIRED
  // ---------------------------------

  if (
    verificationStatus !==
    'verified'
  ) {
    return (
      <VerificationScreen
        user={session.user}
      />
    )
  }

  // ---------------------------------
  // PROFILE LOADING
  // ---------------------------------

  if (profileLoading) {
    return (
      <div className="auth-loading">
        <div className="wordmark">
          aura<span>.</span>
        </div>
      </div>
    )
  }

  // ---------------------------------
  // PROFILE SETUP
  // ---------------------------------

  if (!profile) {
    return (
      <ProfileSetup
        user={session.user}
        collegeId={verifiedCollegeId}
        onComplete={(createdProfile) => {
          setProfile(createdProfile)
        }}
      />
    )
  }

  // ---------------------------------
  // BATTLE DATA
  // ---------------------------------

  const battleA =
    battleProfiles[0] || null

  const battleB =
    battleProfiles[1] || null

  // ---------------------------------
  // BATTLE VOTE
  // ---------------------------------

  async function chooseWinner(profileId) {
    if (
      selectedWinner ||
      voteSubmitting ||
      !battleA ||
      !battleB
    ) {
      return
    }

    setVoteSubmitting(true)
    setNotice('')

    try {
      const {
        data,
        error
      } = await supabase.rpc(
        'cast_battle_vote',
        {
          p_profile_a_id: battleA.id,
          p_profile_b_id: battleB.id,
          p_winner_id: profileId
        }
      )

      if (error) {
        throw error
      }

      if (!data?.ok) {
        setNotice(
          data?.error ||
          'Could not record your vote.'
        )
        return
      }

      setSelectedWinner(profileId)
      setNotice(
        'Vote recorded anonymously'
      )

      setBattleProfiles(
        (currentProfiles) =>
          currentProfiles.map(
            (student) => {
              if (
                student.id ===
                battleA.id
              ) {
                return {
                  ...student,
                  aura: Number(
                    data.profileARating
                  )
                }
              }

              if (
                student.id ===
                battleB.id
              ) {
                return {
                  ...student,
                  aura: Number(
                    data.profileBRating
                  )
                }
              }

              return student
            }
          )
      )

      setTimeout(() => {
        setSelectedWinner(null)
        setNotice('')
        setBattleIndex(
          (value) => value + 1
        )
      }, 700)

    } catch (error) {
      console.error(
        'Vote submission failed:',
        error
      )

      setNotice(
        error?.message ||
        'Your vote could not be recorded. Please try again.'
      )
    } finally {
      setVoteSubmitting(false)
    }
  }

  // ---------------------------------
  // PROFILE PHOTO
  // ---------------------------------

  function changePhoto(event) {
    const file =
      event.target.files?.[0]

    if (!file) return

    if (
      !file.type.startsWith('image/')
    ) {
      setNotice(
        'Please choose an image file'
      )

      setTimeout(
        () => setNotice(''),
        1400
      )

      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setMyProfile(
        (profile) => ({
          ...profile,
          photo: reader.result
        })
      )

      setNotice(
        'Profile photo updated'
      )

      setTimeout(
        () => setNotice(''),
        1400
      )
    }

    reader.readAsDataURL(file)
  }

  // ---------------------------------
  // APP
  // ---------------------------------

  return (
    <div className="app-shell">

      {/* TOP BAR */}

      <header className="topbar">
        <div className="wordmark">
          aura<span>.</span>
        </div>

        <div className="campus-pill">
          CAMPUS 01
        </div>
      </header>

      <main className="main">

        {/* =========================
            ME
        ========================== */}

        {tab === 'me' && (
          <section className="panel me-screen">

            <div className="eyebrow">
              YOUR AURA
            </div>

            <div className="my-aura-number">
              {aura.toFixed(1)}
            </div>

            <div className="campus-rank">
              <span>
                #{Math.max(
                  1,
                  rankingProfiles.findIndex(
                    (student) =>
                      student.id ===
                      session.user.id
                  ) + 1
                )}
              </span>

              <small>
                campus
              </small>
            </div>

            <div className="stat-grid">

              <div className="stat-card">
                <b>
                  #{Math.max(
                    1,
                    rankingProfiles.findIndex(
                      (student) =>
                        student.id ===
                        session.user.id
                    ) + 1
                  )}
                </b>

                <span>
                  Campus
                </span>
              </div>

              <div className="stat-card">
                <b>—</b>

                <span>
                  {profile.branch ||
                    'Branch'}
                </span>
              </div>

              <div className="stat-card">
                <b>—</b>

                <span>
                  {semesterLabel(
                    profile.semester
                  )}{' '}
                  Sem
                </span>
              </div>

            </div>

            <div className="section-title">
              PERFORMANCE
            </div>

            <div className="performance-list">

              <div className="performance-row">
                <span>
                  Comparisons won
                </span>

                <strong>
                  {Number(
                    userStats?.win_rate ??
                    0
                  )}%
                </strong>
              </div>

              <div className="performance-row">
                <span>
                  Votes received
                </span>

                <strong>
                  {Number(
                    userStats?.votes_received ??
                    0
                  )}
                </strong>
              </div>

              <div className="performance-row">
                <span>
                  Votes cast
                </span>

                <strong>
                  {Number(
                    userStats?.votes_cast ??
                    0
                  )}
                </strong>
              </div>

              <div className="performance-row">
                <span>
                  Current rank
                </span>

                <strong>
                  #{Math.max(
                    1,
                    rankingProfiles.findIndex(
                      (student) =>
                        student.id ===
                        session.user.id
                    ) + 1
                  )}
                </strong>
              </div>

            </div>

            <div className="next-rank-card">
              <ArrowUp size={18} />

              <div>

                <strong>
                  {(() => {
                    const myRank =
                      rankingProfiles.findIndex(
                        (student) =>
                          student.id ===
                          session.user.id
                      )

                    const nextStudent =
                      myRank > 0
                        ? rankingProfiles[
                            myRank - 1
                          ]
                        : null

                    const gap =
                      nextStudent
                        ? Math.max(
                            0,
                            Number(
                              nextStudent.aura_rating
                            ) - aura
                          )
                        : 0

                    return nextStudent
                      ? `${gap.toFixed(1)} Aura`
                      : 'Top rank'
                  })()}
                </strong>

                <span>
                  {(() => {
                    const myRank =
                      rankingProfiles.findIndex(
                        (student) =>
                          student.id ===
                          session.user.id
                      )

                    return myRank > 0
                      ? `to overtake #${myRank}`
                      : 'You are #1'
                  })()}
                </span>

              </div>
            </div>

          </section>
        )}

        {/* =========================
            VOTE
        ========================== */}

        {tab === 'vote' && (
          <section className="vote-screen">

            <div className="vote-heading">

              <div>

                <div className="eyebrow">
                  CAMPUS BATTLE
                </div>

                <h1>
                  Who has more Aura?
                </h1>

              </div>

              <div className="round-counter">

                <span>
                  {String(
                    battleIndex + 1
                  ).padStart(2, '0')}
                </span>

                <small>
                  battle
                </small>

              </div>

            </div>

            <div className="battle-area">

              {battleLoading ? (
                <div className="battle-empty">

                  <div className="eyebrow">
                    CAMPUS BATTLE
                  </div>

                  <h1>
                    Finding your campus...
                  </h1>

                  <p>
                    Looking for students
                    to battle.
                  </p>

                </div>
              ) : battleProfiles.length < 2 ? (
                <div className="battle-empty">

                  <div className="eyebrow">
                    CAMPUS BATTLE
                  </div>

                  <h1>
                    You're early.
                  </h1>

                  <p>
                    More verified students
                    need to join your campus
                    before a battle can begin.
                  </p>

                </div>
              ) : (
                <>

                  <ProfileCard
                    profile={battleA}
                    selected={
                      selectedWinner ===
                      battleA.id
                    }
                    onClick={() =>
                      chooseWinner(
                        battleA.id
                      )
                    }
                  />

                  <div className="versus">
                    <span>
                      VS
                    </span>
                  </div>

                  <ProfileCard
                    profile={battleB}
                    selected={
                      selectedWinner ===
                      battleB.id
                    }
                    onClick={() =>
                      chooseWinner(
                        battleB.id
                      )
                    }
                  />

                </>
              )}

            </div>

            <div className="vote-hint">
              <Zap size={15} />
              Tap the profile you think has more Aura
            </div>

            <p className="privacy-note">
              Votes are anonymous.
            </p>

            {notice && (
              <div className="toast">
                {notice}
              </div>
            )}

          </section>
        )}

        {/* =========================
            RANK
        ========================== */}

        {tab === 'rank' && (
          <section className="panel rank-screen">

            <div className="panel-heading">

              <div className="eyebrow">
                LIVE RANKINGS
              </div>

              <h2>
                Campus Aura
              </h2>

              <p>
                One leaderboard. Everyone competes.
              </p>

            </div>

            <div className="leaderboard-tabs">

              <button
                type="button"
                className="active"
              >
                Campus
              </button>

              <button type="button">
                Branch
              </button>

              <button type="button">
                Semester
              </button>

            </div>

            <div className="rank-list">

              {rankingLoading ? (
                <div className="battle-empty">

                  <div className="eyebrow">
                    LIVE RANKINGS
                  </div>

                  <h1>
                    Loading rankings...
                  </h1>

                </div>
              ) : rankingProfiles.length === 0 ? (
                <div className="battle-empty">

                  <div className="eyebrow">
                    LIVE RANKINGS
                  </div>

                  <h1>
                    No rankings yet.
                  </h1>

                  <p>
                    More verified students
                    need to join your campus.
                  </p>

                </div>
              ) : (
                rankingProfiles.map(
                  (student, index) => (
                    <div
                      className={`rank-row ${
                        student.id ===
                        session.user.id
                          ? 'you'
                          : ''
                      }`}
                      key={student.id}
                    >

                      <span className="rank-pos">
                        #{index + 1}
                      </span>

                      <span className="rank-name">
                        {student.full_name}
                      </span>

                      <span className="rank-score">
                        {Number(
                          student.aura_rating ??
                          100
                        ).toFixed(1)}
                      </span>

                    </div>
                  )
                )
              )}

            </div>

          </section>
        )}

        {/* =========================
            PROFILE
        ========================== */}

        {tab === 'profile' && (
          <section className="panel profile-screen">

            <div className="eyebrow">
              YOUR PROFILE
            </div>

            <div className="profile-photo-wrapper">

              <img
                className="profile-photo"
                src={(() => {
                  if (
                    !profile?.photo_path
                  ) {
                    return myProfile.photo
                  }

                  const {
                    data: publicUrlData
                  } =
                    supabase.storage
                      .from(
                        'profile-pictures'
                      )
                      .getPublicUrl(
                        profile.photo_path
                      )

                  return (
                    publicUrlData?.publicUrl ||
                    myProfile.photo
                  )
                })()}
                alt="Your profile"
              />

              <button
                type="button"
                className="photo-edit-button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                aria-label="Change profile photo"
              >
                <Camera size={18} />
              </button>

            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={changePhoto}
            />

            <h1 className="profile-name">
              {profile.full_name ||
                myProfile.name}
            </h1>

            <p className="profile-meta">
              {profile.branch ||
                myProfile.branch}{' '}
              ·{' '}
              {profile.degree ||
                myProfile.degree}{' '}
              ·{' '}
              {semesterLabel(
                profile.semester ||
                myProfile.semester
              )}{' '}
              sem
            </p>

            <button
              type="button"
              className="change-photo-button"
              onClick={() =>
                fileInputRef.current?.click()
              }
            >
              Change profile photo
            </button>

            <div className="profile-details">

              <div>
                <span>
                  Branch
                </span>

                <strong>
                  {profile.branch ||
                    myProfile.branch}
                </strong>
              </div>

              <div>
                <span>
                  Degree
                </span>

                <strong>
                  {profile.degree ||
                    myProfile.degree}
                </strong>
              </div>

              <div>
                <span>
                  Semester
                </span>

                <strong>
                  {semesterLabel(
                    myProfile.semester
                  )}
                </strong>
              </div>

            </div>

            <div className="profile-note">
              This is the profile students will see
              during Aura battles.
            </div>

          </section>
        )}

      </main>

      {/* =========================
          BOTTOM NAVIGATION
      ========================== */}

      <nav className="bottom-nav">

        <button
          type="button"
          className={
            tab === 'me'
              ? 'active'
              : ''
          }
          onClick={() =>
            setTab('me')
          }
        >
          <UserRound size={21} />
          <span>
            Me
          </span>
        </button>

        <button
          type="button"
          className={
            tab === 'vote'
              ? 'active'
              : ''
          }
          onClick={() =>
            setTab('vote')
          }
        >
          <Flame size={22} />
          <span>
            Vote
          </span>
        </button>

        <button
          type="button"
          className={
            tab === 'rank'
              ? 'active'
              : ''
          }
          onClick={() =>
            setTab('rank')
          }
        >
          <Trophy size={21} />
          <span>
            Rank
          </span>
        </button>

        <button
          type="button"
          className={
            tab === 'profile'
              ? 'active'
              : ''
          }
          onClick={() =>
            setTab('profile')
          }
        >
          <UserRound size={21} />
          <span>
            Profile
          </span>
        </button>

      </nav>

    </div>
  )
}

createRoot(
  document.getElementById('root')
).render(<App />)