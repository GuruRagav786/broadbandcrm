import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { ensurePendingInvoice } from './_lib/paymentSync.js'

function getOrigin(req) {
  const forwardedProto = req.headers['x-forwarded-proto'] || 'https'
  const forwardedHost = req.headers['x-forwarded-host'] || req.headers.host
  return process.env.APP_BASE_URL || `${forwardedProto}://${forwardedHost}`
}

function send(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.end(JSON.stringify(payload))
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

async function createRazorpayPaymentLink(req, invoice, customer) {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error('Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET')
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
  const referenceId = `${customer.id}:${customer.plan_due_date}`
  const callbackUrl = `${getOrigin(req)}/due-payments?customer=${customer.id}&due=${customer.plan_due_date}`

  const response = await fetch('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: Math.round(Number(customer.plan_amount || 0) * 100),
      currency: 'INR',
      reference_id: referenceId,
      description: `${customer.plan || 'Broadband'} due for ${customer.name}`,
      customer: {
        name: customer.name,
        contact: customer.phone || undefined,
        email: customer.email || undefined,
      },
      notify: {
        sms: false,
        email: false,
      },
      reminder_enable: true,
      callback_url: callbackUrl,
      callback_method: 'get',
      notes: {
        invoice_id: invoice.id,
        customer_id: customer.id,
        due_date: customer.plan_due_date,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || 'Failed to create Razorpay payment link')
  }

  return response.json()
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.end()
    return
  }

  if (req.method !== 'POST') {
    send(res, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const body = await readBody(req)
    const customer = {
      id: body.customerId,
      name: body.name,
      phone: body.phone,
      email: body.email,
      plan: body.plan,
      plan_amount: Number(body.amount),
      plan_due_date: body.dueDate,
    }

    if (!customer.id || !customer.name || !customer.plan_amount || !customer.plan_due_date) {
      send(res, 400, { error: 'Missing required payment details' })
      return
    }

    const supabase = getSupabaseAdmin()
    const invoice = await ensurePendingInvoice(supabase, customer)

    if (invoice.payment_link_url && invoice.status !== 'paid') {
      send(res, 200, {
        invoiceId: invoice.id,
        paymentLinkId: invoice.payment_link_id,
        shortUrl: invoice.payment_link_url,
        reused: true,
      })
      return
    }

    const razorpayLink = await createRazorpayPaymentLink(req, invoice, customer)

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'pending',
        source: 'razorpay',
        payment_link_id: razorpayLink.id,
        payment_link_url: razorpayLink.short_url,
      })
      .eq('id', invoice.id)

    if (updateError) throw updateError

    send(res, 200, {
      invoiceId: invoice.id,
      paymentLinkId: razorpayLink.id,
      shortUrl: razorpayLink.short_url,
      reused: false,
    })
  } catch (error) {
    send(res, 500, { error: error.message || 'Unable to create payment link' })
  }
}
