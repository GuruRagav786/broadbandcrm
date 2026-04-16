import { addMonths, parseISO } from 'date-fns'

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

export function createInvoiceNumber() {
  return `INV-${Date.now().toString().slice(-6)}`
}

export function getNextPlanDueDate(dueDate) {
  return addMonths(parseISO(dueDate), 1).toISOString().split('T')[0]
}

export async function findOpenInvoice(supabase, customerId, dueDate) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('customer_id', customerId)
    .eq('due_date', dueDate)
    .neq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function ensurePendingInvoice(supabase, customer) {
  const existing = await findOpenInvoice(supabase, customer.id, customer.plan_due_date)

  if (existing) {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        amount: customer.plan_amount,
        status: existing.status === 'overdue' ? 'overdue' : 'pending',
      })
      .eq('id', existing.id)
      .select('*')
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      customer_id: customer.id,
      invoice_number: createInvoiceNumber(),
      amount: customer.plan_amount,
      due_date: customer.plan_due_date,
      status: 'pending',
      source: 'razorpay',
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function markInvoicePaidAndAdvanceCustomer(supabase, invoice, updates = {}) {
  const { error: invoiceError } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_date: todayIso(),
      source: updates.source || invoice.source || 'manual',
      payment_id: updates.paymentId || invoice.payment_id || null,
      payment_link_id: updates.paymentLinkId || invoice.payment_link_id || null,
      payment_link_url: updates.paymentLinkUrl || invoice.payment_link_url || null,
    })
    .eq('id', invoice.id)

  if (invoiceError) throw invoiceError

  const { data: customer, error: customerFetchError } = await supabase
    .from('customers')
    .select('id, plan_due_date')
    .eq('id', invoice.customer_id)
    .single()

  if (customerFetchError) throw customerFetchError

  if (customer?.plan_due_date === invoice.due_date) {
    const nextDueDate = getNextPlanDueDate(invoice.due_date)
    const { error: customerUpdateError } = await supabase
      .from('customers')
      .update({ plan_due_date: nextDueDate })
      .eq('id', invoice.customer_id)

    if (customerUpdateError) throw customerUpdateError
  }
}

export async function findInvoiceForPaymentEvent(supabase, { invoiceId, paymentLinkId, referenceId }) {
  if (invoiceId) {
    const { data, error } = await supabase.from('invoices').select('*').eq('id', invoiceId).maybeSingle()
    if (error) throw error
    if (data) return data
  }

  if (paymentLinkId) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('payment_link_id', paymentLinkId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (data) return data
  }

  if (referenceId?.includes(':')) {
    const [customerId, dueDate] = referenceId.split(':')
    return findOpenInvoice(supabase, customerId, dueDate)
  }

  return null
}
