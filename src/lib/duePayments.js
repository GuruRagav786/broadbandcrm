import { addMonths, isAfter, parseISO } from 'date-fns'

export function isDueCustomer(customer, now = new Date()) {
  if (!customer?.plan_due_date || customer?.status !== 'active') return false
  return !isAfter(parseISO(customer.plan_due_date), now)
}

export function getNextPlanDueDate(planDueDate) {
  if (!planDueDate) return null
  return addMonths(parseISO(planDueDate), 1).toISOString().split('T')[0]
}

export function createInvoiceNumber() {
  return `INV-${Date.now().toString().slice(-6)}`
}

export function buildRazorpayTemplateLink(template, customer) {
  if (!template) return ''

  const tokens = {
    '{customerId}': customer.id || '',
    '{name}': customer.name || '',
    '{phone}': customer.phone || '',
    '{email}': customer.email || '',
    '{amount}': customer.plan_amount || '',
    '{plan}': customer.plan || '',
    '{dueDate}': customer.plan_due_date || '',
  }

  return Object.entries(tokens).reduce(
    (link, [token, value]) => link.replaceAll(token, encodeURIComponent(String(value))),
    template
  )
}
