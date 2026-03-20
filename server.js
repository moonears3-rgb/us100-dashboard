const express = require('express');
const fs      = require('fs');
const path    = require('path');
const app     = express();
app.use(express.json());
app.use(express.static('public'));

const SECRET     = process.env.WEBHOOK_SECRET || 'us100secret';
const STATE_FILE = path.join('/tmp', 'dashboard_state.json');

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch(e) {
    console.log('Could not load state file, using defaults');
  }
  return { swingHigh: 'HH', swingLow: 'HL', lastPoint: 'HL', updatedAt: null };
}

function saveState(s) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(s), 'utf8');
  } catch(e) {
    console.log('Could not save state file:', e.message);
  }
}

let state = loadState();
console.log('Loaded state:', state);

app.post('/webhook', (req, res) => {
  const { token, type, value } = req.body;
  if (token !== SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const val   = (value || '').trim().toUpperCase();
  const valid = ['HH','LH','HL','LL'];
  if (!valid.includes(val)) return res.status(400).json({ error: 'Invalid value' });
  if      (type === 'swingHigh') state.swingHigh = val;
  else if (type === 'swingLow')  state.swingLow  = val;
  else if (type === 'lastPoint') state.lastPoint  = val;
  else return res.status(400).json({ error: 'Invalid type' });
  state.updatedAt = new Date().toISOString();
  saveState(state);
  console.log(`[${state.updatedAt}] Updated ${type} = ${val}`);
  res.json({ ok: true, state });
});

app.get('/state', (req, res) => {
  res.json(state);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Dashboard server running on port ${PORT}`));
