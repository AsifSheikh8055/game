const Razorpay = require('razorpay');

const MIN_AMOUNT = 1;        // ₹1
const MAX_AMOUNT = 500000;   // ₹5,00,000 (change as per your limits)

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error('Razorpay keys missing from environment');
    return res.status(500).json({ error: 'Payment gateway not configured' });
  }

  // Vercel parses JSON bodies automatically
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }

  const amount = Number(body && body.amount);

  if (!Number.isFinite(amount) || amount < MIN_AMOUNT) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  if (amount > MAX_AMOUNT) {
    return res.status(400).json({ error: 'Amount exceeds the allowed limit' });
  }

  const instance = new Razorpay({ key_id: keyId, key_secret: keySecret });

  try {
    const order = await instance.orders.create({
      amount: Math.round(amount * 100), // Razorpay works in paise
      currency: 'INR',
      receipt: 'rcpt_' + Date.now(),
      notes: { source: 'mines-demo' }
    });

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId
    });
  } catch (err) {
    console.error('Order creation failed:', err);
    return res.status(500).json({ error: 'Unable to create order' });
  }
};