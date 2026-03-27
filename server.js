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
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch(e) {}
  return { swingHigh: 'HH', swingLow: 'HL', lastPoint: 'HL', lastPoint1H: 'LL', goldSwingHigh: 'HH', goldSwingLow: 'HL', goldLastPoint: 'HL', gbpSwingHigh: 'HH', gbpSwingLow: 'HL', gbpLastPoint: 'HL', gerSwingHigh: 'HH', gerSwingLow: 'HL', gerLastPoint: 'HL', updatedAt: null };
}

function saveState(s) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(s)); } catch(e) {}
}

let state = loadState();

app.post('/webhook', (req, res) => {
  const { token, type, value } = req.body;
  if (token !== SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const val = (value || '').trim().toUpperCase();
  if (!['HH','LH','HL','LL'].includes(val)) return res.status(400).json({ error: 'Invalid value' });
  if      (type === 'swingHigh')   state.swingHigh   = val;
  else if (type === 'swingLow')    state.swingLow    = val;
  else if (type === 'lastPoint')   state.lastPoint   = val;
  else if (type === 'lastPoint1H')   state.lastPoint1H   = val;
  else if (type === 'gold_swingHigh') state.goldSwingHigh = val;
  else if (type === 'gold_swingLow')  state.goldSwingLow  = val;
  else if (type === 'gold_lastPoint') state.goldLastPoint = val;
  else if (type === 'gbp_swingHigh')  state.gbpSwingHigh  = val;
  else if (type === 'gbp_swingLow')   state.gbpSwingLow   = val;
  else if (type === 'gbp_lastPoint')  state.gbpLastPoint  = val;
  else if (type === 'ger_swingHigh')  state.gerSwingHigh  = val;
  else if (type === 'ger_swingLow')   state.gerSwingLow   = val;
  else if (type === 'ger_lastPoint')  state.gerLastPoint  = val;
  else return res.status(400).json({ error: 'Invalid type' });
  state.updatedAt = new Date().toISOString();
  state.updatedType = type;
  saveState(state);
  console.log(`[${state.updatedAt}] ${type} = ${val}`);
  res.json({ ok: true, state });
});

app.get('/state', (req, res) => res.json(state));

app.get('/gold-state', (req, res) => res.json({
  goldSwingHigh: state.goldSwingHigh,
  goldSwingLow:  state.goldSwingLow,
  goldLastPoint: state.goldLastPoint,
  updatedAt:     state.updatedAt,
  updatedType:   state.updatedType
}));

app.get('/markets', (req, res) => {
  res.sendFile(require('path').join(__dirname, 'public', 'markets.html'));
});

app.get('/gold', (req, res) => {
  res.sendFile(require('path').join(__dirname, 'public', 'gold.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));

// Serve 1H dashboard at /1h
const path2 = require('path');
app.get('/1h', (req, res) => {
  res.sendFile(path2.join(__dirname, 'public', 'dashboard1h.html'));
});
