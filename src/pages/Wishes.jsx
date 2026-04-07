import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Gift, Cake, Heart, Phone } from 'lucide-react'
import { parseISO, format, differenceInDays, isSameDay, getMonth, getDate } from 'date-fns'

export default function Wishes() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('today')

  useEffect(() => { fetchCustomers() }, [])

  async function fetchCustomers() {
    setLoading(true)
    const { data } = await supabase.from('customers').select('id, name, phone, email, birthday, anniversary').eq('status', 'active')
    setCustomers(data || [])
    setLoading(false)
  }

  const today = new Date()

  function getDaysUntil(dateStr) {
    if (!dateStr) return null
    const d = parseISO(dateStr)
    const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate())
    const diff = differenceInDays(thisYear, today)
    return diff < 0 ? differenceInDays(new Date(today.getFullYear() + 1, d.getMonth(), d.getDate()), today) : diff
  }

  function isTodayMD(dateStr) {
    if (!dateStr) return false
    const d = parseISO(dateStr)
    return getMonth(d) === getMonth(today) && getDate(d) === getDate(today)
  }

  const allWishes = customers.flatMap(c => {
    const items = []
    if (c.birthday) items.push({ ...c, type: 'birthday', days: getDaysUntil(c.birthday), isToday: isTodayMD(c.birthday), dateStr: c.birthday })
    if (c.anniversary) items.push({ ...c, type: 'anniversary', days: getDaysUntil(c.anniversary), isToday: isTodayMD(c.anniversary), dateStr: c.anniversary })
    return items
  }).sort((a, b) => a.days - b.days)

  const todayList = allWishes.filter(w => w.isToday)
  const upcomingList = allWishes.filter(w => !w.isToday && w.days <= 30).sort((a, b) => a.days - b.days)
  const allList = allWishes.filter(w => !w.isToday).sort((a, b) => a.days - b.days)

  const displayList = tab === 'today' ? todayList : tab === 'upcoming' ? upcomingList : allList

  const wishText = (w) => {
    if (w.type === 'birthday') return `🎂 Happy Birthday, ${w.name.split(' ')[0]}! Wishing you a wonderful day. - BroadbandCRM Team`
    return `💍 Happy Wedding Anniversary, ${w.name.split(' ')[0]}! Wishing you both joy and love. - BroadbandCRM Team`
  }

  const copyWish = (w) => {
    navigator.clipboard.writeText(wishText(w))
    alert('Wish message copied! Send via SMS or WhatsApp.')
  }

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontFamily: 'Sora', fontWeight: 700 }}>Birthday & Anniversary Wishes</h1>
        <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>Never miss a customer's special day</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: "Today's Wishes", value: todayList.length, icon: Gift, color: '#f472b6', bg: 'rgba(244,114,182,0.1)' },
          { label: 'This Week', value: allWishes.filter(w => w.days <= 7).length, icon: Cake, color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
          { label: 'This Month', value: upcomingList.length, icon: Heart, color: '#c084fc', bg: 'rgba(192,132,252,0.1)' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: bg, borderRadius: 10, padding: 12, flexShrink: 0 }}>
              <Icon size={22} color={color} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
              <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: '1.75rem', color: '#f1f5f9', lineHeight: 1.1 }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {[['today', `Today (${todayList.length})`], ['upcoming', `Upcoming 30 Days (${upcomingList.length})`], ['all', `All (${allList.length})`]].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)} style={{
            padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
            background: tab === val ? '#f472b6' : '#1e293b',
            color: tab === val ? '#fff' : '#94a3b8',
            fontFamily: 'DM Sans', fontWeight: 600, fontSize: '0.85rem',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Wish Cards */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>Loading…</div>
      ) : displayList.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎉</div>
          <div style={{ fontFamily: 'Sora', fontWeight: 600, color: '#e2e8f0' }}>
            {tab === 'today' ? 'No special occasions today!' : 'No upcoming occasions'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {displayList.map((w, i) => (
            <div key={i} className="card" style={{
              border: w.isToday ? '1px solid rgba(244,114,182,0.4)' : '1px solid #334155',
              background: w.isToday ? 'linear-gradient(135deg, rgba(244,114,182,0.08), rgba(192,132,252,0.05))' : '#1e293b',
              position: 'relative', overflow: 'hidden',
            }}>
              {w.isToday && (
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  background: '#f472b6', color: '#fff',
                  fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px',
                  borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  TODAY!
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
                <div style={{
                  fontSize: '2rem', width: 48, height: 48, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: w.type === 'birthday' ? 'rgba(251,146,60,0.1)' : 'rgba(192,132,252,0.1)',
                  borderRadius: '50%',
                }}>
                  {w.type === 'birthday' ? '🎂' : '💍'}
                </div>
                <div>
                  <div style={{ fontFamily: 'Sora', fontWeight: 700, color: '#f1f5f9' }}>{w.name}</div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    {w.type === 'birthday' ? 'Birthday' : 'Wedding Anniversary'}
                    {' · '}
                    {w.dateStr ? format(parseISO(w.dateStr), 'dd MMM') : ''}
                  </div>
                </div>
              </div>

              {/* Wish preview */}
              <div style={{
                background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '0.625rem 0.75rem',
                fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '0.875rem',
                lineHeight: 1.5,
              }}>
                "{wishText(w)}"
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.8rem', color: w.isToday ? '#f472b6' : '#64748b', fontWeight: 600 }}>
                  {w.isToday ? '🎉 Today!' : `In ${w.days} day${w.days !== 1 ? 's' : ''}`}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {w.phone && (
                    <a href={`tel:${w.phone}`} style={{
                      background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                      color: '#4ade80', padding: '4px 10px', borderRadius: 6,
                      fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <Phone size={12} /> Call
                    </a>
                  )}
                  <button onClick={() => copyWish(w)} style={{
                    background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)',
                    color: '#22d3ee', padding: '4px 10px', borderRadius: 6,
                    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                  }}>
                    Copy Wish
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
