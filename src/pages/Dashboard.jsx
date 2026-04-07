import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Users, FileText, AlertCircle, Ticket, Gift, TrendingUp } from 'lucide-react'
import { format, isToday, isTomorrow, differenceInDays, parseISO } from 'date-fns'

export default function Dashboard() {
  const [stats, setStats] = useState({ customers: 0, invoices: 0, overdue: 0, tickets: 0 })
  const [todayWishes, setTodayWishes] = useState([])
  const [upcomingWishes, setUpcomingWishes] = useState([])
  const [recentTickets, setRecentTickets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  async function fetchDashboard() {
    setLoading(true)
    try {
      const [custRes, invRes, tickRes] = await Promise.all([
        supabase.from('customers').select('id, name, birthday, anniversary, status'),
        supabase.from('invoices').select('id, status'),
        supabase.from('tickets').select('id, title, status, priority, created_at, customers(name)').order('created_at', { ascending: false }).limit(5),
      ])

      const customers = custRes.data || []
      const invoices = invRes.data || []
      const tickets = tickRes.data || []

      const today = new Date()
      const todayMD = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

      const wishes = []
      const upcoming = []

      customers.forEach(c => {
        ;['birthday', 'anniversary'].forEach(type => {
          if (!c[type]) return
          const d = parseISO(c[type])
          const md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate())
          const diff = differenceInDays(thisYear, today)
          if (md === todayMD) wishes.push({ name: c.name, type })
          else if (diff > 0 && diff <= 7) upcoming.push({ name: c.name, type, days: diff, date: thisYear })
        })
      })

      setStats({
        customers: customers.length,
        invoices: invoices.filter(i => i.status === 'pending').length,
        overdue: invoices.filter(i => i.status === 'overdue').length,
        tickets: tickets.filter(t => t.status === 'open' || t.status === 'in-progress').length,
      })
      setTodayWishes(wishes)
      setUpcomingWishes(upcoming.sort((a, b) => a.days - b.days))
      setRecentTickets(tickets)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const statCards = [
    { label: 'Total Customers', value: stats.customers, icon: Users, color: 'cyan', cls: 'cyan' },
    { label: 'Pending Invoices', value: stats.invoices, icon: FileText, color: '#22c55e', cls: 'green' },
    { label: 'Overdue Payments', value: stats.overdue, icon: AlertCircle, color: '#f59e0b', cls: 'amber' },
    { label: 'Open Tickets', value: stats.tickets, icon: Ticket, color: '#ef4444', cls: 'red' },
  ]

  const priorityColor = p => p === 'high' ? 'badge-red' : p === 'medium' ? 'badge-yellow' : 'badge-gray'
  const statusColor = s => s === 'open' ? 'badge-blue' : s === 'in-progress' ? 'badge-yellow' : s === 'resolved' ? 'badge-green' : 'badge-gray'

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontFamily: 'Sora', color: '#f1f5f9', fontWeight: 700 }}>
          Dashboard
        </h1>
        <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
          {format(new Date(), 'EEEE, d MMMM yyyy')}
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {statCards.map(({ label, value, icon: Icon, color, cls }) => (
          <div key={label} className={`card stat-card ${cls}`}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{label}</div>
                <div style={{ fontSize: '2.2rem', fontFamily: 'Sora', fontWeight: 700, color: '#f1f5f9', lineHeight: 1 }}>
                  {loading ? '—' : value}
                </div>
              </div>
              <div style={{ background: `${color}20`, borderRadius: 10, padding: 10 }}>
                <Icon size={22} color={color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Today's Wishes */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Gift size={18} color="#f472b6" />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontFamily: 'Sora', color: '#f1f5f9' }}>Today's Wishes</h3>
            {todayWishes.length > 0 && (
              <span className="badge badge-red">{todayWishes.length}</span>
            )}
          </div>
          {todayWishes.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>No birthdays or anniversaries today 🎉</p>
          ) : (
            todayWishes.map((w, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 0.75rem', borderRadius: 8,
                background: 'rgba(244,114,182,0.08)', marginBottom: '0.5rem',
                border: '1px solid rgba(244,114,182,0.15)',
              }}>
                <span style={{ fontSize: '1.2rem' }}>{w.type === 'birthday' ? '🎂' : '💍'}</span>
                <div>
                  <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.9rem' }}>{w.name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    {w.type === 'birthday' ? 'Birthday Today' : 'Wedding Anniversary Today'}
                  </div>
                </div>
              </div>
            ))
          )}

          {upcomingWishes.length > 0 && (
            <>
              <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Upcoming (next 7 days)
              </div>
              {upcomingWishes.map((w, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.5rem 0.75rem', borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)', marginBottom: '0.375rem',
                }}>
                  <span>{w.type === 'birthday' ? '🎂' : '💍'}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>{w.name}</span>
                    <span style={{ color: '#64748b', fontSize: '0.78rem', marginLeft: '0.5rem' }}>
                      {w.type === 'birthday' ? 'Birthday' : 'Anniversary'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#06b6d4' }}>
                    {w.days === 1 ? 'Tomorrow' : `In ${w.days} days`}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Recent Tickets */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Ticket size={18} color="#06b6d4" />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontFamily: 'Sora', color: '#f1f5f9' }}>Recent Tickets</h3>
          </div>
          {recentTickets.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>No recent tickets</p>
          ) : (
            recentTickets.map(t => (
              <div key={t.id} style={{
                padding: '0.625rem 0.75rem', borderRadius: 8,
                background: 'rgba(255,255,255,0.03)', marginBottom: '0.5rem',
                border: '1px solid #334155',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, color: '#e2e8f0', fontSize: '0.875rem' }}>{t.title}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                      {t.customers?.name} · {format(parseISO(t.created_at), 'dd MMM')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                    <span className={`badge ${priorityColor(t.priority)}`}>{t.priority}</span>
                    <span className={`badge ${statusColor(t.status)}`}>{t.status}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
