const express = require('express');
const app = express();
app.use(express.json());
app.use(express.static('public'));

// In-memory state
let state = {
  swingHigh: 'HH',
  swingLow:  'HL',
  lastPoint: 'HL',
  updatedAt: null
};

// ── Webhook from TradingView ──────────────────────────────────────────────────
// TradingView alert message format (JSON):
// { "token": "YOUR_SECRET", "type": "swingHigh", "value": "LH" }
// OR
// { "token": "YOUR_SECRET", "type": "lastPoint", "value": "HL" }

const SECRET = process.env.WEBHOOK_SECRET || 'us100secret';

app.post('/webhook', (req, res) => {
  const { token, type, value } = req.body;

  if (token !== SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const val = (value || '').trim().toUpperCase();
  const valid = ['HH','LH','HL','LL'];

  if (!valid.includes(val)) {
    return res.status(400).json({ error: 'Invalid value. Use HH, LH, HL or LL' });
  }

  if (type === 'swingHigh') state.swingHigh = val;
  else if (type === 'swingLow')  state.swingLow  = val;
  else if (type === 'lastPoint') state.lastPoint  = val;
  else return res.status(400).json({ error: 'Invalid type. Use swingHigh, swingLow or lastPoint' });

  state.updatedAt = new Date().toISOString();
  console.log(`[${state.updatedAt}] Updated ${type} = ${val}`);
  res.json({ ok: true, state });
});

// ── State endpoint (dashboard polls this) ────────────────────────────────────
app.get('/state', (req, res) => {
  res.json(state);
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Dashboard server running on port ${PORT}`));
