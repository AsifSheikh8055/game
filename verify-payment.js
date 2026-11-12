const crypto = require('crypto');

function safeEqualHex(a, b) {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length === 0 || bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (e) {
    return false;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    console.error('RAZORPAY_KEY_SECRET missing');
    return res.status(500).json({ error: 'Payment gateway not configured' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }

  const orderId = body && body.razorpay_order_id;
  const paymentId = body && body.razorpay_payment_id;
  const signature = body && body.razorpay_signature;

  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({ verified: false, error: 'Missing payment fields' });
  }

  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(orderId + '|' + paymentId)
    .digest('hex');

  if (!safeEqualHex(expected, String(signature))) {
    console.warn('Signature mismatch for order', orderId);
    return res.status(400).json({ verified: false, error: 'Invalid signature' });
  }

  // ✅ Signature is authentic.
  // In a real app: mark the order as paid in your DB here, idempotently,
  // keyed on paymentId. Never credit the wallet from the browser alone.
  return res.status(200).json({ verified: true, paymentId, orderId });
};