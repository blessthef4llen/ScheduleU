import Link from 'next/link'

export default function HomePage() {
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>Welcome to ScheduleU</h1>
      <Link href="/login" style={{ color: 'blue', textDecoration: 'underline' }}>Go to Login</Link>
    </div>
  )
}