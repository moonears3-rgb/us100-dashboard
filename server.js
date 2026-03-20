const express = require('express');
const redis   = require('redis');
const app     = express();
app.use(express.json());
app.use(express.static('public'));

const SECRET = process.env.WEBHOOK_SECRET || 'us100secret';

// ── Redis connection ──────────────────────────────────────────────────────────
const client = redis.createClient({ url: process.env.REDIS_URL });
client.on('error', err => console.log('Redis error:', err));
client.connect();

const DEFAULT_STATE = { swingHigh: 'HH', swingLow: 'HL', lastPoint: 'HL', updatedAt: null };

async function loadState() {
  try {
    const data = await client.get('dashboard_state');
    return data ? JSON.parse(data) : { ...DEFAULT_STATE };
  } catch(e) {
    console.log('Redis load error:', e.message);
    return { ...DEFAULT_STATE };
  }
}

async function saveState(s) {
  try {
    await client.set('dashboard_state', JSON.stringify(s));
  } catch(e) {
    console.log('Redis save error:', e.message);
  }
}

// ── Webhook from TradingView ──────────────────────────────────────────────────
app.post('/webhook', async (req, res) => {
  const { token, type, value } = req.body;
  if (token !== SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const val   = (value || '').trim().toUpperCase();
  const valid = ['HH','LH','HL','LL'];
  if (!valid.includes(val)) return res.status(400).json({ error: 'Invalid value' });

  const state = await loadState();
  if      (type === 'swingHigh') state.swingHigh = val;
  else if (type === 'swingLow')  state.swingLow  = val;
  else if (type === 'lastPoint') state.lastPoint  = val;
  else return res.status(400).json({ error: 'Invalid type' });

  state.updatedAt = new Date().toISOString();
  await saveState(state);
  console.log(`[${state.updatedAt}] Updated ${type} = ${val}`);
  res.json({ ok: true, state });
});

// ── State endpoint ────────────────────────────────────────────────────────────
app.get('/state', async (req, res) => {
  const state = await loadState();
  res.json(state);
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Dashboard server running on port ${PORT}`));
