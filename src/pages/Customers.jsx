import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Plus, Search, Edit2, Eye, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'

const PLANS = ['10 Mbps', '25 Mbps', '50 Mbps', '100 Mbps', '200 Mbps', '500 Mbps', '1 Gbps']

const EMPTY = {
  name: '', phone: '', email: '', address: '',
  plan: '', plan_amount: '', connection_date: '',
  plan_due_date: '', status: 'active',
  birthday: '', anniversary: '',
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [viewModal, setViewModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchCustomers() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(customers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q)
    ))
  }, [search, customers])

  async function fetchCustomers() {
    setLoading(true)
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
    setCustomers(data || [])
    setFiltered(data || [])
    setLoading(false)
  }

  // useCallback so this function reference never changes between renders
  const setField = useCallback((field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }, [])

  function openAdd() { setForm(EMPTY); setEditing(null); setShowModal(true) }

  function openEdit(c) {
    setForm({
      name: c.name || '', phone: c.phone || '', email: c.email || '',
      address: c.address || '', plan: c.plan || '',
      plan_amount: c.plan_amount || '', connection_date: c.connection_date || '',
      plan_due_date: c.plan_due_date || '', status: c.status || 'active',
      birthday: c.birthday || '', anniversary: c.anniversary || '',
    })
    setEditing(c.id)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('Customer name is required')
    setSaving(true)
    const payload = {
      name: form.name, phone: form.phone, email: form.email,
      address: form.address, plan: form.plan,
      plan_amount: form.plan_amount ? parseFloat(form.plan_amount) : null,
      connection_date: form.connection_date || null,
      plan_due_date: form.plan_due_date || null,
      status: form.status,
      birthday: form.birthday || null,
      anniversary: form.anniversary || null,
    }
    if (editing) {
      const { error } = await supabase.from('customers').update(payload).eq('id', editing)
      if (error) { toast.error('Update failed'); setSaving(false); return }
      toast.success('Customer updated')
    } else {
      const { error } = await supabase.from('customers').insert(payload)
      if (error) { toast.error('Save failed'); setSaving(false); return }
      toast.success('Customer added')
    }
    setSaving(false)
    setShowModal(false)
    fetchCustomers()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this customer?')) return
    await supabase.from('customers').delete().eq('id', id)
    toast.success('Customer deleted')
    fetchCustomers()
  }

  const statusBadge = s => s === 'active' ? 'badge-green' : s === 'suspended' ? 'badge-yellow' : 'badge-red'

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontFamily: 'Sora', fontWeight: 700 }}>Customers</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>{customers.length} total customers</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Search by name, phone or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Plan</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No customers found</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.85rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>
                        {c.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{c.name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{c.email || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.plan ? `${c.plan}${c.plan_amount ? ` · ₹${c.plan_amount}` : ''}` : '—'}</td>
                  <td>{c.plan_due_date ? format(parseISO(c.plan_due_date), 'dd MMM yyyy') : '—'}</td>
                  <td><span className={`badge ${statusBadge(c.status)}`}>{c.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => setViewModal(c)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 6, borderRadius: 6 }} title="View">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => openEdit(c)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 6, borderRadius: 6 }} title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 6, borderRadius: 6 }} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <Modal title={editing ? 'Edit Customer' : 'Add New Customer'} onClose={() => setShowModal(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

            <div style={{ gridColumn: '1/-1' }}>
              <label className="label">Full Name *</label>
              <input className="input" value={form.name} onChange={setField('name')} placeholder="Enter full name" />
            </div>

            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={setField('phone')} placeholder="9876543210" />
            </div>

            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={setField('email')} placeholder="email@example.com" />
            </div>

            <div style={{ gridColumn: '1/-1' }}>
              <label className="label">Address</label>
              <input className="input" value={form.address} onChange={setField('address')} placeholder="Full address" />
            </div>

            <div>
              <label className="label">Plan</label>
              <select className="input" value={form.plan} onChange={setField('plan')}>
                <option value="">Select Plan</option>
                {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Monthly Amount (₹)</label>
              <input className="input" type="number" value={form.plan_amount} onChange={setField('plan_amount')} placeholder="0" />
            </div>

            <div>
              <label className="label">Connection Date</label>
              <input className="input" type="date" value={form.connection_date} onChange={setField('connection_date')} />
            </div>

            <div>
              <label className="label">Plan Due Date</label>
              <input className="input" type="date" value={form.plan_due_date} onChange={setField('plan_due_date')} />
            </div>

            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={setField('status')}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="disconnected">Disconnected</option>
              </select>
            </div>

            <div /> {/* spacer */}

            <div>
              <label className="label">Birthday</label>
              <input className="input" type="date" value={form.birthday} onChange={setField('birthday')} />
            </div>

            <div>
              <label className="label">Wedding Anniversary</label>
              <input className="input" type="date" value={form.anniversary} onChange={setField('anniversary')} />
            </div>

          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </Modal>
      )}

      {/* View Modal */}
      {viewModal && (
        <Modal title="Customer Details" onClose={() => setViewModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              ['Name', viewModal.name],
              ['Phone', viewModal.phone],
              ['Email', viewModal.email],
              ['Address', viewModal.address],
              ['Plan', viewModal.plan],
              ['Monthly Amount', viewModal.plan_amount ? `₹${viewModal.plan_amount}` : null],
              ['Connection Date', viewModal.connection_date ? format(parseISO(viewModal.connection_date), 'dd MMM yyyy') : null],
              ['Plan Due Date', viewModal.plan_due_date ? format(parseISO(viewModal.plan_due_date), 'dd MMM yyyy') : null],
              ['Status', viewModal.status],
              ['Birthday', viewModal.birthday ? format(parseISO(viewModal.birthday), 'dd MMM') : null],
              ['Anniversary', viewModal.anniversary ? format(parseISO(viewModal.anniversary), 'dd MMM') : null],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #334155' }}>
                <span style={{ color: '#64748b', fontSize: '0.875rem' }}>{k}</span>
                <span style={{ color: '#e2e8f0', fontSize: '0.875rem', fontWeight: 500, textTransform: 'capitalize' }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
            <button className="btn-ghost" onClick={() => setViewModal(null)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
