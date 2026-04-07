import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Plus, Ticket, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'

const EMPTY = { customer_id: '', title: '', description: '', category: 'connectivity', priority: 'medium', status: 'open' }
const CATEGORIES = ['connectivity', 'billing', 'hardware', 'relocation', 'speed', 'other']

export default function Tickets() {
  const [tickets, setTickets] = useState([])
  const [customers, setCustomers] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [viewTicket, setViewTicket] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [tRes, cRes] = await Promise.all([
      supabase.from('tickets').select('*, customers(name, phone)').order('created_at', { ascending: false }),
      supabase.from('customers').select('id, name').order('name'),
    ])
    setTickets(tRes.data || [])
    setCustomers(cRes.data || [])
    setLoading(false)
  }

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter)
  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    'in-progress': tickets.filter(t => t.status === 'in-progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  }

  async function handleSave() {
    if (!form.customer_id || !form.title) return toast.error('Customer and title required')
    setSaving(true)
    const { error } = await supabase.from('tickets').insert({
      customer_id: form.customer_id, title: form.title,
      description: form.description, category: form.category,
      priority: form.priority, status: form.status,
    })
    if (error) { toast.error('Failed to create ticket'); setSaving(false); return }
    toast.success('Ticket created')
    setSaving(false); setShowModal(false); setForm(EMPTY); fetchAll()
  }

  async function updateStatus(id, status) {
    const update = { status }
    if (status === 'resolved') update.resolved_at = new Date().toISOString()
    await supabase.from('tickets').update(update).eq('id', id)
    toast.success(`Ticket ${status}`)
    fetchAll()
    if (viewTicket?.id === id) setViewTicket(null)
  }

  const priorityBadge = p => ({ high: 'badge-red', medium: 'badge-yellow', low: 'badge-gray' }[p] || 'badge-gray')
  const statusBadge = s => ({ open: 'badge-blue', 'in-progress': 'badge-yellow', resolved: 'badge-green', closed: 'badge-gray' }[s] || 'badge-gray')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontFamily: 'Sora', fontWeight: 700 }}>Service Tickets</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>Track customer complaints & service requests</p>
        </div>
        <button className="btn-primary" onClick={() => { setShowModal(true); setForm(EMPTY) }}>
          <Plus size={16} /> New Ticket
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {[['all', 'All'], ['open', 'Open'], ['in-progress', 'In Progress'], ['resolved', 'Resolved']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)} style={{
            padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
            background: filter === val ? '#06b6d4' : '#1e293b',
            color: filter === val ? '#fff' : '#94a3b8',
            fontFamily: 'DM Sans', fontWeight: 600, fontSize: '0.85rem',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {label} <span style={{ opacity: 0.7, marginLeft: 4 }}>({counts[val]})</span>
          </button>
        ))}
      </div>

      {/* Ticket Cards */}
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {loading ? (
          <div className="card" style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No tickets found</div>
        ) : filtered.map(t => (
          <div key={t.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setViewTicket(t)}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                  <span style={{ fontSize: '0.72rem', fontFamily: 'Sora', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    #{t.id?.slice(-6).toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#475569' }}>·</span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'capitalize' }}>{t.category}</span>
                </div>
                <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '0.25rem' }}>{t.title}</div>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  {t.customers?.name} · {t.customers?.phone} · {format(parseISO(t.created_at), 'dd MMM yyyy HH:mm')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                <span className={`badge ${priorityBadge(t.priority)}`}>{t.priority}</span>
                <span className={`badge ${statusBadge(t.status)}`}>{t.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Ticket Modal */}
      {showModal && (
        <Modal title="Create Service Ticket" onClose={() => setShowModal(false)}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label className="label">Customer *</label>
              <select className="input" value={form.customer_id} onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))}>
                <option value="">Select Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Issue Title *</label>
              <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Brief description of the issue" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Detailed description…" style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <select className="input" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Creating…' : 'Create Ticket'}
            </button>
          </div>
        </Modal>
      )}

      {/* View Ticket Modal */}
      {viewTicket && (
        <Modal title={`Ticket #${viewTicket.id?.slice(-6).toUpperCase()}`} onClose={() => setViewTicket(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: 4 }}>ISSUE</div>
              <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '1rem' }}>{viewTicket.title}</div>
            </div>
            {viewTicket.description && (
              <div>
                <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: 4 }}>DESCRIPTION</div>
                <div style={{ color: '#cbd5e1', fontSize: '0.875rem', lineHeight: 1.6 }}>{viewTicket.description}</div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                ['Customer', viewTicket.customers?.name],
                ['Phone', viewTicket.customers?.phone],
                ['Category', viewTicket.category],
                ['Created', format(parseISO(viewTicket.created_at), 'dd MMM yyyy HH:mm')],
                ['Priority', <span className={`badge ${priorityBadge(viewTicket.priority)}`}>{viewTicket.priority}</span>],
                ['Status', <span className={`badge ${statusBadge(viewTicket.status)}`}>{viewTicket.status}</span>],
              ].map(([k, v]) => (
                <div key={k} style={{ padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  <div style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{k}</div>
                  <div style={{ color: '#e2e8f0', fontSize: '0.875rem', fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {viewTicket.status === 'open' && (
              <button className="btn-primary" style={{ background: '#f59e0b' }} onClick={() => updateStatus(viewTicket.id, 'in-progress')}>
                Mark In Progress
              </button>
            )}
            {viewTicket.status !== 'resolved' && (
              <button className="btn-primary" style={{ background: '#22c55e' }} onClick={() => updateStatus(viewTicket.id, 'resolved')}>
                <CheckCircle size={15} /> Mark Resolved
              </button>
            )}
            <button className="btn-ghost" onClick={() => setViewTicket(null)} style={{ marginLeft: 'auto' }}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
