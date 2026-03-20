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
  return { swingHigh: 'HH', swingLow: 'HL', lastPoint: 'HL', updatedAt: null };
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
  if      (type === 'swingHigh') state.swingHigh = val;
  else if (type === 'swingLow')  state.swingLow  = val;
  else if (type === 'lastPoint') state.lastPoint  = val;
  else return res.status(400).json({ error: 'Invalid type' });
  state.updatedAt = new Date().toISOString();
  saveState(state);
  console.log(`[${state.updatedAt}] ${type} = ${val}`);
  res.json({ ok: true, state });
});

app.get('/state', (req, res) => res.json(state));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
