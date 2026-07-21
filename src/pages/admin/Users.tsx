import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Shield, Ban } from 'lucide-react'
import { getAllUsers, updateUserRole, updateUserStatus } from '@/db/api'
import DashboardLayout, { adminSections } from '@/components/layout/DashboardLayout'
import { formatDate } from '@/lib/utils'

export default function AdminUsers() {
  const location = useLocation()
  const qc = useQueryClient()

  const { data: users = [], isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: () => getAllUsers() })

  const handleRoleChange = async (id: string, role: string) => {
    await updateUserRole(id, role); qc.invalidateQueries({ queryKey: ['admin-users'] })
  }

  const handleToggleStatus = async (id: string, current: boolean) => {
    await updateUserStatus(id, !current); qc.invalidateQueries({ queryKey: ['admin-users'] })
  }

  return (
    <DashboardLayout title="Admin Panel" sections={adminSections} active={location.pathname}>
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-text-primary">Users</h1>
          <span className="text-sm text-text-muted">{users.length} total</span>
        </div>
        {isLoading
          ? <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 bg-bg-card animate-pulse rounded-xl" />)}</div>
          : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                    <th className="text-left py-3 pr-4 font-medium">User</th>
                    <th className="text-left py-3 pr-4 font-medium hidden md:table-cell">Joined</th>
                    <th className="text-left py-3 pr-4 font-medium">Role</th>
                    <th className="text-left py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-bg-card/50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xs font-bold">{(u.full_name || u.username || 'U')[0].toUpperCase()}</div>}
                          <div>
                            <p className="font-medium text-text-primary">{u.full_name || u.username || '(no name)'}</p>
                            <p className="text-xs text-text-muted">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-text-muted hidden md:table-cell">{formatDate(u.created_at)}</td>
                      <td className="py-3 pr-4">
                        <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}
                          className="bg-bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-text-primary outline-none focus:border-brand">
                          <option value="user">User</option>
                          <option value="artist">Artist</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-3">
                        <button onClick={() => handleToggleStatus(u.id, u.is_active !== false)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${u.is_active !== false ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-danger/10 text-danger hover:bg-danger/20'}`}>
                          {u.is_active !== false ? <><Shield size={11} /> Active</> : <><Ban size={11} /> Banned</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
    </DashboardLayout>
  )
}
