import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types/types'

interface Props { roles: UserRole[] }

export default function RequireRole({ roles }: Props) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  if (!profile || !roles.includes(profile.role)) return <Navigate to="/" replace />
  return <Outlet />
}
