import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Users, FileText, AlertCircle, Ticket, Gift, IndianRupee } from 'lucide-react'
import { format, differenceInDays, parseISO } from 'date-fns'
import { isDueCustomer } from '../lib/duePayments'

export default function Dashboard() {
  const [stats, setStats] = useState({ customers: 0, invoices: 0, overdue: 0, tickets: 0, dueCustomers: 0, dueAmount: 0 })
  const [todayWishes, setTodayWishes] = useState([])
  const [upcomingWishes, setUpcomingWishes] = useState([])
  const [recentTickets, setRecentTickets] = useState([])
  const [dueCustomers, setDueCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  async function fetchDashboard() {
    setLoading(true)

    try {
      const [custRes, invRes, tickRes] = await Promise.all([
        supabase.from('customers').select('id, name, plan_amount, plan_due_date, birthday, anniversary, status'),
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

      customers.forEach(customer => {
        ;['birthday', 'anniversary'].forEach(type => {
          if (!customer[type]) return

          const date = parseISO(customer[type])
          const md = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          const thisYear = new Date(today.getFullYear(), date.getMonth(), date.getDate())
          const diff = differenceInDays(thisYear, today)

          if (md === todayMD) wishes.push({ name: customer.name, type })
          else if (diff > 0 && diff <= 7) upcoming.push({ name: customer.name, type, days: diff, date: thisYear })
        })
      })

      const dueList = customers
        .filter(customer => isDueCustomer(customer))
        .sort((a, b) => a.plan_due_date.localeCompare(b.plan_due_date))

      setStats({
        customers: customers.length,
        invoices: invoices.filter(invoice => invoice.status === 'pending').length,
        overdue: invoices.filter(invoice => invoice.status === 'overdue').length,
        tickets: tickets.filter(ticket => ticket.status === 'open' || ticket.status === 'in-progress').length,
        dueCustomers: dueList.length,
        dueAmount: dueList.reduce((sum, customer) => sum + Number(customer.plan_amount || 0), 0),
      })
      setTodayWishes(wishes)
      setUpcomingWishes(upcoming.sort((a, b) => a.days - b.days))
      setRecentTickets(tickets)
      setDueCustomers(dueList.slice(0, 6))
    } catch (error) {
      console.error(error)
    }

    setLoading(false)
  }

  const statCards = useMemo(() => ([
    { label: 'Total Customers', value: stats.customers, icon: Users, color: '#06b6d4', cls: 'cyan' },
    { label: 'Pending Invoices', value: stats.invoices, icon: FileText, color: '#22c55e', cls: 'green' },
    { label: 'Overdue Payments', value: stats.overdue, icon: AlertCircle, color: '#f59e0b', cls: 'amber' },
    { label: 'Open Tickets', value: stats.tickets, icon: Ticket, color: '#ef4444', cls: 'red' },
  ]), [stats.customers, stats.invoices, stats.overdue, stats.tickets])

  const priorityColor = priority => priority === 'high' ? 'badge-red' : priority === 'medium' ? 'badge-yellow' : 'badge-gray'
  const statusColor = status => status === 'open' ? 'badge-blue' : status === 'in-progress' ? 'badge-yellow' : status === 'resolved' ? 'badge-green' : 'badge-gray'

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontFamily: 'Sora', color: '#f1f5f9', fontWeight: 700 }}>
          Dashboard
        </h1>
        <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
          {format(new Date(), 'EEEE, d MMMM yyyy')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
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

      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(15,23,42,0.95))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Due Details Dashboard</div>
            <div style={{ fontFamily: 'Sora', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.35rem' }}>{loading ? '—' : `${stats.dueCustomers} due customers`}</div>
            <div style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
              {loading ? 'Loading due summary...' : `₹${stats.dueAmount} currently pending across active plans.`}
            </div>
          </div>
          <Link to="/due-payments" className="btn-primary" style={{ textDecoration: 'none' }}>
            <IndianRupee size={16} /> Open Due Payments
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} color="#f59e0b" />
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontFamily: 'Sora', color: '#f1f5f9' }}>Due Details</h3>
              {stats.dueCustomers > 0 && <span className="badge badge-red">{stats.dueCustomers}</span>}
            </div>
            <Link to="/due-payments" style={{ color: '#22d3ee', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 700 }}>
              Manage all
            </Link>
          </div>

          {dueCustomers.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>No due customers today.</p>
          ) : (
            dueCustomers.map(customer => (
              <div
                key={customer.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '0.75rem 0.9rem',
                  borderRadius: 10,
                  background: 'rgba(248,113,113,0.06)',
                  border: '1px solid rgba(248,113,113,0.12)',
                  marginBottom: '0.55rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#f8fafc' }}>{customer.name}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                    Due {format(parseISO(customer.plan_due_date), 'dd MMM yyyy')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Sora', fontWeight: 700, color: '#fbbf24' }}>₹{customer.plan_amount || 0}</div>
                  <div style={{ color: '#64748b', fontSize: '0.78rem' }}>{customer.plan || '—'}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Gift size={18} color="#f472b6" />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontFamily: 'Sora', color: '#f1f5f9' }}>Today's Wishes</h3>
            {todayWishes.length > 0 && <span className="badge badge-red">{todayWishes.length}</span>}
          </div>

          {todayWishes.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>No birthdays or anniversaries today.</p>
          ) : (
            todayWishes.map((wish, index) => (
              <div
                key={`${wish.name}-${wish.type}-${index}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 8,
                  background: 'rgba(244,114,182,0.08)',
                  marginBottom: '0.5rem',
                  border: '1px solid rgba(244,114,182,0.15)',
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{wish.type === 'birthday' ? '🎂' : '💍'}</span>
                <div>
                  <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.9rem' }}>{wish.name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    {wish.type === 'birthday' ? 'Birthday Today' : 'Wedding Anniversary Today'}
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
              {upcomingWishes.map((wish, index) => (
                <div
                  key={`${wish.name}-${wish.type}-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.03)',
                    marginBottom: '0.375rem',
                  }}
                >
                  <span>{wish.type === 'birthday' ? '🎂' : '💍'}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>{wish.name}</span>
                    <span style={{ color: '#64748b', fontSize: '0.78rem', marginLeft: '0.5rem' }}>
                      {wish.type === 'birthday' ? 'Birthday' : 'Anniversary'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#06b6d4' }}>
                    {wish.days === 1 ? 'Tomorrow' : `In ${wish.days} days`}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Ticket size={18} color="#06b6d4" />
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontFamily: 'Sora', color: '#f1f5f9' }}>Recent Tickets</h3>
        </div>
        {recentTickets.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>No recent tickets</p>
        ) : (
          recentTickets.map(ticket => (
            <div
              key={ticket.id}
              style={{
                padding: '0.625rem 0.75rem',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
                marginBottom: '0.5rem',
                border: '1px solid #334155',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, color: '#e2e8f0', fontSize: '0.875rem' }}>{ticket.title}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                    {ticket.customers?.name} · {format(parseISO(ticket.created_at), 'dd MMM')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                  <span className={`badge ${priorityColor(ticket.priority)}`}>{ticket.priority}</span>
                  <span className={`badge ${statusColor(ticket.status)}`}>{ticket.status}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
