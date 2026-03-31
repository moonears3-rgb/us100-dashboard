const express = require('express');
const fs      = require('fs');
const path    = require('path');
const app     = express();
app.use(express.json());
app.use(express.static('public'));

const SECRET     = process.env.WEBHOOK_SECRET || 'us100secret';
const STATE_FILE = path.join('/tmp', 'state.json');

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch(e) {}
  return {
    slot1_swingHigh:'HH', slot1_swingLow:'HL', slot1_lastPoint:'HL',
    slot2_swingHigh:'HH', slot2_swingLow:'HL', slot2_lastPoint:'HL',
    lastPoint1H:'LL', updatedAt:null
  };
}

function saveState(s) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(s)); } catch(e) {}
}

let state = loadState();

const ALLOWED = ['slot1_swingHigh','slot1_swingLow','slot1_lastPoint','slot2_swingHigh','slot2_swingLow','slot2_lastPoint','lastPoint1H'];

app.post('/webhook', (req, res) => {
  const { token, type, value } = req.body;
  if (token !== SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const val = (value || '').trim().toUpperCase();
  if (!['HH','LH','HL','LL'].includes(val)) return res.status(400).json({ error: 'Invalid value' });
  if (!ALLOWED.includes(type)) return res.status(400).json({ error: 'Invalid type. Use: ' + ALLOWED.join(', ') });
  state[type] = val;
  state.updatedAt = new Date().toISOString();
  state.updatedType = type;
  saveState(state);
  console.log(`[${state.updatedAt}] ${type} = ${val}`);
  res.json({ ok: true, state });
});

app.get('/state', (req, res) => res.json(state));

app.get('/markets', (req, res) => res.sendFile(path.join(__dirname, 'public', 'markets.html')));
app.get('/gold',    (req, res) => res.sendFile(path.join(__dirname, 'public', 'gold.html')));
app.get('/1h',      (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard1h.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
