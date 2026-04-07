import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, Ticket, Gift, Wifi
} from 'lucide-react'

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/invoices', icon: FileText, label: 'Invoices & Payments' },
  { to: '/tickets', icon: Ticket, label: 'Service Tickets' },
  { to: '/wishes', icon: Gift, label: 'Wishes' },
]

export default function Sidebar() {
  return (
    <aside style={{
      width: 240,
      minHeight: '100vh',
      background: '#1e293b',
      borderRight: '1px solid #334155',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0, top: 0, bottom: 0,
      zIndex: 40,
    }}>
      {/* Logo */}
      <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Wifi size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: '0.95rem', color: '#f1f5f9' }}>
              BroadbandCRM
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Admin Panel</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '0.75rem 0.75rem', flex: 1 }}>
        <div style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 0.25rem', marginBottom: '0.5rem' }}>
          Menu
        </div>
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            style={{ marginBottom: '0.25rem' }}
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #334155', fontSize: '0.75rem', color: '#475569' }}>
        v1.0.0 · Broadband CRM
      </div>
    </aside>
  )
}
