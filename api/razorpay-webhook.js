import crypto from 'node:crypto'
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { findInvoiceForPaymentEvent, markInvoicePaidAndAdvanceCustomer } from './_lib/paymentSync.js'

function send(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

function isValidSignature(rawBody, signature, secret) {
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const digestBuffer = Buffer.from(digest)
  const signatureBuffer = Buffer.from(signature || '')

  if (digestBuffer.length !== signatureBuffer.length) return false

  return crypto.timingSafeEqual(digestBuffer, signatureBuffer)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    send(res, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!webhookSecret) throw new Error('Missing RAZORPAY_WEBHOOK_SECRET')

    const rawBody = await readRawBody(req)
    const signature = req.headers['x-razorpay-signature']

    if (!signature || !isValidSignature(rawBody, signature, webhookSecret)) {
      send(res, 401, { error: 'Invalid signature' })
      return
    }

    const body = JSON.parse(rawBody.toString('utf8') || '{}')
    if (body.event !== 'payment_link.paid') {
      send(res, 200, { received: true, ignored: true })
      return
    }

    const paymentLinkEntity = body.payload?.payment_link?.entity || {}
    const paymentEntity = body.payload?.payment?.entity || {}
    const notes = paymentLinkEntity.notes || paymentEntity.notes || {}

    const supabase = getSupabaseAdmin()
    const invoice = await findInvoiceForPaymentEvent(supabase, {
      invoiceId: notes.invoice_id,
      paymentLinkId: paymentLinkEntity.id,
      referenceId: paymentLinkEntity.reference_id,
    })

    if (!invoice) {
      send(res, 404, { error: 'Invoice not found for payment link event' })
      return
    }

    if (invoice.status !== 'paid') {
      await markInvoicePaidAndAdvanceCustomer(supabase, invoice, {
        source: 'razorpay',
        paymentId: paymentEntity.id || null,
        paymentLinkId: paymentLinkEntity.id || null,
        paymentLinkUrl: paymentLinkEntity.short_url || null,
      })
    }

    send(res, 200, { received: true, updated: true })
  } catch (error) {
    send(res, 500, { error: error.message || 'Webhook processing failed' })
  }
}
