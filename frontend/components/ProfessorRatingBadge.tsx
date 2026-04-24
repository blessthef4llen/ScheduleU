'use client'

import { useEffect, useState } from 'react'

const backendBaseUrl = process.env.NEXT_PUBLIC_SCHEDULER_API_URL ?? 'http://localhost:8000'

type ProfessorRatingResponse = {
  query: string
  normalized_name: string | null
  found: boolean
  matched_name: string | null
  department: string | null
  school_name: string | null
  avg_rating: number | null
  avg_difficulty: number | null
  would_take_again_percent: number | null
  num_ratings: number | null
  profile_url: string | null
  legacy_id: number | null
  source: string
}

const responseCache = new Map<string, Promise<ProfessorRatingResponse | null>>()

function shouldSkipInstructor(instructor: string): boolean {
  const value = instructor.trim().toLowerCase()
  return !value || value === 'n/a' || value === 'tba' || value === 'staff' || value === 'arranged'
}

async function fetchProfessorRating(instructor: string): Promise<ProfessorRatingResponse | null> {
  const key = instructor.trim()
  if (!key || shouldSkipInstructor(key)) return null

  if (!responseCache.has(key)) {
    responseCache.set(
      key,
      fetch(`${backendBaseUrl}/professors/rating?name=${encodeURIComponent(key)}`)
        .then(async (response) => {
          if (!response.ok) return null
          return (await response.json()) as ProfessorRatingResponse
        })
        .catch(() => null)
    )
  }

  return responseCache.get(key) ?? null
}

export function ProfessorRatingBadge({ instructor }: { instructor: string }) {
  const [rating, setRating] = useState<ProfessorRatingResponse | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    if (shouldSkipInstructor(instructor)) {
      setRating(null)
      setLoaded(true)
      return
    }

    setLoaded(false)
    fetchProfessorRating(instructor).then((result) => {
      if (cancelled) return
      setRating(result)
      setLoaded(true)
    })

    return () => {
      cancelled = true
    }
  }, [instructor])

  if (!loaded || !rating?.found || rating.avg_rating === null) {
    return null
  }

  const label = `RMP ${rating.avg_rating.toFixed(1)}`
  const detail = [
    rating.num_ratings ? `${rating.num_ratings} ratings` : null,
    rating.avg_difficulty !== null ? `difficulty ${rating.avg_difficulty.toFixed(1)}` : null,
  ]
    .filter(Boolean)
    .join(' • ')

  const badge = (
    <span
      className="inline-flex items-center rounded-full border border-[#46BDC1]/30 bg-[#46BDC1]/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#0E7490]"
      title={detail || 'Rate My Professors'}
    >
      {label}
    </span>
  )

  if (!rating.profile_url) {
    return badge
  }

  return (
    <a
      href={rating.profile_url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex"
      title={detail || 'Open professor profile'}
    >
      {badge}
    </a>
  )
}
