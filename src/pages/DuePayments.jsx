import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, ExternalLink, IndianRupee, RefreshCw } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { createInvoiceNumber, getNextPlanDueDate, isDueCustomer } from '../lib/duePayments'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export default function DuePayments() {
  const [searchParams] = useSearchParams()
  const [dueCustomers, setDueCustomers] = useState([])
  const [invoiceMap, setInvoiceMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState('')

  useEffect(() => {
    fetchDuePayments()
  }, [])

  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      toast.success('Payment completed. Waiting for Razorpay confirmation.')
    }
  }, [searchParams])

  useEffect(() => {
    const timer = setInterval(() => {
      fetchDuePayments(false)
    }, 30000)

    return () => clearInterval(timer)
  }, [])

  async function fetchDuePayments(showLoader = true) {
    if (showLoader) setLoading(true)

    const customerRes = await supabase
      .from('customers')
      .select('id, name, phone, email, plan, plan_amount, plan_due_date, status')
      .eq('status', 'active')
      .order('plan_due_date', { ascending: true })

    if (customerRes.error) {
      toast.error('Unable to load due customers')
      setLoading(false)
      return
    }

    const customers = (customerRes.data || []).filter(customer => isDueCustomer(customer))
    const customerIds = customers.map(customer => customer.id)

    let invoices = []
    if (customerIds.length > 0) {
      const invoiceRes = await supabase
        .from('invoices')
        .select('id, customer_id, invoice_number, amount, due_date, paid_date, status, payment_link_id, payment_link_url, payment_id, source, created_at')
        .in('customer_id', customerIds)
        .order('created_at', { ascending: false })

      if (invoiceRes.error) {
        toast.error('Unable to load due invoices')
        setLoading(false)
        return
      }

      invoices = invoiceRes.data || []
    }

    const nextInvoiceMap = {}
    invoices.forEach(invoice => {
      const key = `${invoice.customer_id}:${invoice.due_date}`
      if (!nextInvoiceMap[key]) nextInvoiceMap[key] = invoice
    })

    setDueCustomers(customers)
    setInvoiceMap(nextInvoiceMap)
    setLoading(false)
  }

  async function createPaymentLink(customer) {
    setActionId(customer.id)

    try {
      const response = await fetch(`${API_BASE_URL}/api/create-payment-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          plan: customer.plan,
          amount: customer.plan_amount,
          dueDate: customer.plan_due_date,
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to create Razorpay link')

      toast.success(result.reused ? 'Opened existing Razorpay link' : 'Razorpay link created')
      window.open(result.shortUrl, '_blank', 'noopener,noreferrer')
      await fetchDuePayments(false)
    } catch (error) {
      toast.error(error.message || 'Unable to create Razorpay link')
    } finally {
      setActionId('')
    }
  }

  async function markPaidManual(customer) {
    const currentInvoice = invoiceMap[`${customer.id}:${customer.plan_due_date}`]
    const nextDueDate = getNextPlanDueDate(customer.plan_due_date)

    setActionId(customer.id)

    try {
      if (currentInvoice) {
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString().split('T')[0],
            source: 'manual',
          })
          .eq('id', currentInvoice.id)

        if (invoiceError) throw invoiceError
      } else {
        const { error: insertError } = await supabase.from('invoices').insert({
          customer_id: customer.id,
          invoice_number: createInvoiceNumber(),
          amount: customer.plan_amount,
          due_date: customer.plan_due_date,
          paid_date: new Date().toISOString().split('T')[0],
          status: 'paid',
          source: 'manual',
        })

        if (insertError) throw insertError
      }

      const { error: customerError } = await supabase
        .from('customers')
        .update({ plan_due_date: nextDueDate })
        .eq('id', customer.id)

      if (customerError) throw customerError

      toast.success('Customer marked as paid')
      await fetchDuePayments(false)
    } catch (error) {
      toast.error(error.message || 'Unable to mark as paid')
    } finally {
      setActionId('')
    }
  }

  const summary = useMemo(() => {
    const totalAmount = dueCustomers.reduce((sum, customer) => sum + Number(customer.plan_amount || 0), 0)
    const pendingLinks = dueCustomers.filter(customer => {
      const invoice = invoiceMap[`${customer.id}:${customer.plan_due_date}`]
      return invoice?.status !== 'paid' && invoice?.payment_link_url
    }).length

    return {
      count: dueCustomers.length,
      totalAmount,
      pendingLinks,
    }
  }, [dueCustomers, invoiceMap])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontFamily: 'Sora', fontWeight: 700 }}>Due Payments</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Separate dashboard for due customers, Razorpay links, and manual payment updates.
          </p>
        </div>
        <button className="btn-ghost" onClick={() => fetchDuePayments()} disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card stat-card amber">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Due Customers</div>
              <div style={{ fontSize: '2.1rem', fontFamily: 'Sora', fontWeight: 700 }}>{summary.count}</div>
            </div>
            <AlertCircle size={22} color="#f59e0b" />
          </div>
        </div>

        <div className="card stat-card cyan">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Total Due Amount</div>
              <div style={{ fontSize: '2.1rem', fontFamily: 'Sora', fontWeight: 700 }}>₹{summary.totalAmount}</div>
            </div>
            <IndianRupee size={22} color="#06b6d4" />
          </div>
        </div>

        <div className="card stat-card green">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Open Razorpay Links</div>
              <div style={{ fontSize: '2.1rem', fontFamily: 'Sora', fontWeight: 700 }}>{summary.pendingLinks}</div>
            </div>
            <ExternalLink size={22} color="#22c55e" />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Plan</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>Loading due payments...</td></tr>
              ) : dueCustomers.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No due customers right now</td></tr>
              ) : dueCustomers.map(customer => {
                const invoice = invoiceMap[`${customer.id}:${customer.plan_due_date}`]
                const isBusy = actionId === customer.id
                const hasRazorpayLink = Boolean(invoice?.payment_link_url)

                return (
                  <tr key={`${customer.id}:${customer.plan_due_date}`}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{customer.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{customer.phone || customer.email || '—'}</div>
                    </td>
                    <td>{customer.plan || '—'}</td>
                    <td style={{ color: '#f87171' }}>{format(parseISO(customer.plan_due_date), 'dd MMM yyyy')}</td>
                    <td style={{ fontFamily: 'Sora', fontWeight: 700 }}>₹{customer.plan_amount || 0}</td>
                    <td>
                      {invoice?.status === 'paid' ? (
                        <span className="badge badge-green">Paid</span>
                      ) : invoice?.payment_link_url ? (
                        <span className="badge badge-blue">Link Created</span>
                      ) : (
                        <span className="badge badge-red">Due</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          className="btn-primary"
                          onClick={() => createPaymentLink(customer)}
                          disabled={isBusy}
                          style={{ padding: '0.45rem 0.8rem', fontSize: '0.8rem' }}
                        >
                          <ExternalLink size={14} />
                          {hasRazorpayLink ? 'Open Link' : 'Create Link'}
                        </button>
                        <button
                          onClick={() => markPaidManual(customer)}
                          disabled={isBusy}
                          style={{
                            background: 'rgba(34,197,94,0.1)',
                            border: '1px solid rgba(34,197,94,0.25)',
                            color: '#4ade80',
                            cursor: 'pointer',
                            padding: '0.45rem 0.8rem',
                            borderRadius: 8,
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                          }}
                        >
                          <CheckCircle2 size={14} />
                          Mark Paid
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <div style={{ fontFamily: 'Sora', fontSize: '0.95rem', marginBottom: '0.25rem' }}>Automatic payment updates</div>
          <div style={{ color: '#64748b', fontSize: '0.84rem' }}>
            Razorpay-paid links are marked paid automatically through the webhook and then removed from this due list.
          </div>
        </div>
        <Link to="/" className="btn-ghost" style={{ textDecoration: 'none' }}>
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
