const express  = require('express');
const fs       = require('fs');
const path     = require('path');
const nodemailer = require('nodemailer');
const app      = express();
app.use(express.json());
app.use(express.static('public'));

const SECRET     = process.env.WEBHOOK_SECRET || 'us100secret';
const STATE_FILE = path.join('/tmp', 'state.json');
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch(e) {}
  return {
    slot1_swingHigh:'HH', slot1_swingLow:'HL', slot1_lastPoint:'HL',
    slot2_swingHigh:'HH', slot2_swingLow:'HL', slot2_lastPoint:'HL',
    slot3_swingHigh:'HH', slot3_swingLow:'HL', slot3_lastPoint:'HL',
    slot4_swingHigh:'HH', slot4_swingLow:'HL', slot4_lastPoint:'HL',
    slot5_swingHigh:'HH', slot5_swingLow:'HL', slot5_lastPoint:'HL',
    slot6_swingHigh:'HH', slot6_swingLow:'HL', slot6_lastPoint:'HL',
    lastPoint1H:'LL', updatedAt:null
  };
}

function saveState(s) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(s)); } catch(e) {}
}

const structures = {
  'HH+HL':'UPTREND','LH+LL':'DOWNTREND','LH+HL':'CONSOLIDATION','HH+LL':'EXPANSION'
};

const SLOT_NAMES = ['US100','Gold','GBP/USD','GER40','S&P500','BTC'];

function getSignal(sh, sl, lp) {
  const struct = structures[sh+'+'+sl] || 'UNKNOWN';
  if (struct==='UPTREND'   && lp==='HL') return 'LONG';
  if (struct==='DOWNTREND' && lp==='LH') return 'SHORT';
  return null;
}

async function sendEmail(slotNum, marketName, signal, sh, sl, lp) {
  if (!EMAIL_USER || !EMAIL_PASS) return;
  const time = new Date().toLocaleTimeString();
  const emoji = signal === 'LONG' ? '🟢' : '🔴';
  try {
    await transporter.sendMail({
      from: EMAIL_USER,
      to: EMAIL_USER,
      subject: `${emoji} TRADING SIGNAL — SLOT ${slotNum} — ${marketName} — ${signal}`,
      text: `New trading signal detected\n\nMarket: ${marketName}\nSlot: ${slotNum}\nSignal: ${signal}\nSwing High: ${sh}\nSwing Low: ${sl}\nLast Point: ${lp}\nTime: ${time}\n\nAction: Drop to 1M — Find C2 — Draw Fib — Enter C4\n\nDashboard: https://837kge2k5b.us-east-2.awsapprunner.com/markets`
    });
    console.log(`Email sent: SLOT ${slotNum} ${marketName} ${signal}`);
  } catch(e) {
    console.log('Email error:', e.message);
  }
}

let state = loadState();

const ALLOWED = [
  'slot1_swingHigh','slot1_swingLow','slot1_lastPoint',
  'slot2_swingHigh','slot2_swingLow','slot2_lastPoint',
  'slot3_swingHigh','slot3_swingLow','slot3_lastPoint',
  'slot4_swingHigh','slot4_swingLow','slot4_lastPoint',
  'slot5_swingHigh','slot5_swingLow','slot5_lastPoint',
  'slot6_swingHigh','slot6_swingLow','slot6_lastPoint',
  'lastPoint1H'
];

app.post('/webhook', (req, res) => {
  const { token, type, value } = req.body;
  if (token !== SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const val = (value || '').trim().toUpperCase();
  if (!['HH','LH','HL','LL'].includes(val)) return res.status(400).json({ error: 'Invalid value' });
  if (!ALLOWED.includes(type)) return res.status(400).json({ error: 'Invalid type' });
  state[type] = val;
  state.updatedAt = new Date().toISOString();
  state.updatedType = type;
  saveState(state);
  console.log(`[${state.updatedAt}] ${type} = ${val}`);

  // Check if this update creates a LONG or SHORT signal
  const match = type.match(/^slot(\d)_/);
  if (match) {
    const i       = parseInt(match[1]) - 1;
    const slotNum = i + 1;
    const name    = SLOT_NAMES[i] || 'Slot '+slotNum;
    const sh      = state[`slot${slotNum}_swingHigh`];
    const sl      = state[`slot${slotNum}_swingLow`];
    const lp      = state[`slot${slotNum}_lastPoint`];
    const signal  = getSignal(sh, sl, lp);
    if (signal) sendEmail(slotNum, name, signal, sh, sl, lp);
  }

  res.json({ ok: true, state });
});

app.get('/state', (req, res) => res.json(state));
app.get('/markets', (req, res) => res.sendFile(path.join(__dirname, 'public', 'markets.html')));
app.get('/gold',    (req, res) => res.sendFile(path.join(__dirname, 'public', 'gold.html')));
app.get('/1h',      (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard1h.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
