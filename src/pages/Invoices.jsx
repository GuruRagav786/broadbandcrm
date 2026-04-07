import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Plus, FileText, AlertCircle, CheckCircle, Clock, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, parseISO, isPast } from 'date-fns'

const EMPTY_INV = { customer_id: '', amount: '', due_date: '', status: 'pending', notes: '' }

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_INV)
  const [saving, setSaving] = useState(false)
  const [printInv, setPrintInv] = useState(null)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [invRes, custRes] = await Promise.all([
      supabase.from('invoices').select('*, customers(name, phone, address, plan)').order('created_at', { ascending: false }),
      supabase.from('customers').select('id, name').eq('status', 'active').order('name'),
    ])
    setInvoices(invRes.data || [])
    setCustomers(custRes.data || [])
    setLoading(false)
  }

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter)
  const counts = {
    all: invoices.length,
    pending: invoices.filter(i => i.status === 'pending').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    paid: invoices.filter(i => i.status === 'paid').length,
  }

  async function handleSave() {
    if (!form.customer_id || !form.amount || !form.due_date) return toast.error('Fill required fields')
    setSaving(true)
    const invNum = `INV-${Date.now().toString().slice(-6)}`
    const { error } = await supabase.from('invoices').insert({
      customer_id: form.customer_id,
      invoice_number: invNum,
      amount: parseFloat(form.amount),
      due_date: form.due_date,
      status: form.status,
      notes: form.notes,
    })
    if (error) { toast.error('Failed to create invoice'); setSaving(false); return }
    toast.success('Invoice created')
    setSaving(false); setShowModal(false); setForm(EMPTY_INV); fetchAll()
  }

  async function markPaid(id) {
    await supabase.from('invoices').update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] }).eq('id', id)
    toast.success('Marked as Paid')
    fetchAll()
  }

  async function markOverdue(id) {
    await supabase.from('invoices').update({ status: 'overdue' }).eq('id', id)
    toast.success('Marked as Overdue')
    fetchAll()
  }

  const statusBadge = s => ({ paid: 'badge-green', pending: 'badge-yellow', overdue: 'badge-red' }[s] || 'badge-gray')
  const StatusIcon = ({ s }) => s === 'paid' ? <CheckCircle size={14} color="#4ade80" /> : s === 'overdue' ? <AlertCircle size={14} color="#f87171" /> : <Clock size={14} color="#facc15" />

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontFamily: 'Sora', fontWeight: 700 }}>Invoices & Payments</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>Track billing and overdue payments</p>
        </div>
        <button className="btn-primary" onClick={() => { setShowModal(true); setForm(EMPTY_INV) }}>
          <Plus size={16} /> Create Invoice
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {['all', 'pending', 'overdue', 'paid'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '0.5rem 1rem',
            borderRadius: 8, border: 'none',
            background: filter === f ? '#06b6d4' : '#1e293b',
            color: filter === f ? '#fff' : '#94a3b8',
            fontFamily: 'DM Sans', fontWeight: 600, fontSize: '0.85rem',
            cursor: 'pointer', transition: 'all 0.15s',
            textTransform: 'capitalize',
          }}>
            {f} <span style={{ opacity: 0.7, marginLeft: 4 }}>({counts[f]})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No invoices found</td></tr>
              ) : filtered.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontFamily: 'Sora', fontSize: '0.82rem', color: '#06b6d4', fontWeight: 600 }}>{inv.invoice_number}</td>
                  <td>
                    <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{inv.customers?.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{inv.customers?.plan}</div>
                  </td>
                  <td style={{ fontFamily: 'Sora', fontWeight: 700, color: '#f1f5f9' }}>₹{inv.amount}</td>
                  <td>
                    <span style={{ color: inv.status === 'overdue' ? '#f87171' : '#94a3b8' }}>
                      {inv.due_date ? format(parseISO(inv.due_date), 'dd MMM yyyy') : '—'}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <StatusIcon s={inv.status} />
                      <span className={`badge ${statusBadge(inv.status)}`}>{inv.status}</span>
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      {inv.status !== 'paid' && (
                        <button onClick={() => markPaid(inv.id)} title="Mark Paid" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80', cursor: 'pointer', padding: '4px 10px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600 }}>
                          Mark Paid
                        </button>
                      )}
                      {inv.status === 'pending' && (
                        <button onClick={() => markOverdue(inv.id)} title="Mark Overdue" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer', padding: '4px 10px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600 }}>
                          Overdue
                        </button>
                      )}
                      <button onClick={() => setPrintInv(inv)} title="Print Invoice" style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 6, borderRadius: 6 }}>
                        <Printer size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showModal && (
        <Modal title="Create Invoice" onClose={() => setShowModal(false)}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label className="label">Customer *</label>
              <select className="input" value={form.customer_id} onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))}>
                <option value="">Select Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="label">Amount (₹) *</label>
                <input type="number" className="input" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <label className="label">Due Date *</label>
                <input type="date" className="input" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <input type="text" className="input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes…" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Creating…' : 'Create Invoice'}
            </button>
          </div>
        </Modal>
      )}

      {/* Print Invoice Modal */}
      {printInv && (
        <Modal title="Invoice Preview" onClose={() => setPrintInv(null)}>
          <div style={{ background: '#0f172a', borderRadius: 10, padding: '1.5rem', fontFamily: 'DM Sans' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: '1.25rem', color: '#06b6d4' }}>INVOICE</div>
                <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{printInv.invoice_number}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Sora', fontWeight: 700, color: '#f1f5f9' }}>BroadbandCRM</div>
                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Broadband Services</div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #334155', paddingTop: '1rem', marginBottom: '1rem' }}>
              <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: 4 }}>BILLED TO</div>
              <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{printInv.customers?.name}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{printInv.customers?.address}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', background: '#1e293b', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.78rem' }}>DUE DATE</div>
                <div style={{ color: '#f1f5f9', fontWeight: 600 }}>{printInv.due_date ? format(parseISO(printInv.due_date), 'dd MMM yyyy') : '—'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#64748b', fontSize: '0.78rem' }}>AMOUNT DUE</div>
                <div style={{ color: '#06b6d4', fontFamily: 'Sora', fontWeight: 700, fontSize: '1.5rem' }}>₹{printInv.amount}</div>
              </div>
            </div>
            <div style={{ textAlign: 'center', color: '#475569', fontSize: '0.75rem' }}>
              Thank you for your business!
            </div>
          </div>
          <div style={{ marginTop: '1rem', textAlign: 'right' }}>
            <button className="btn-ghost" onClick={() => setPrintInv(null)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
