// ══════════════════════════════════════════════════════════════
// CINEMA GM7 — Servidor API (Node.js + Express + MongoDB)
// Hospede no Render.com como Web Service
// ══════════════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// ─── MongoDB Connection ───
const MONGO_URI = process.env.MONGO_URI || 'SUA_CONNECTION_STRING_AQUI';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB conectado!'))
  .catch(err => console.error('❌ Erro MongoDB:', err));

// ─── Schemas ───
const codeSchema = new mongoose.Schema({
  code:             { type: String, required: true },
  shopping:         { type: String, enum: ['campinas', 'galleria'], required: true },
  claimed:          { type: Boolean, default: false },
  claimed_by:       { type: String, default: '' },
  claimed_by_name:  { type: String, default: '' },
  claimed_at:       { type: Date, default: null },
  created_at:       { type: Date, default: Date.now }
});

const claimSchema = new mongoose.Schema({
  code:             { type: String, required: true },
  shopping:         { type: String, required: true },
  claimed_by:       { type: String, required: true },
  claimed_by_name:  { type: String, required: true },
  claimed_at:       { type: Date, default: Date.now }
});

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const Code  = mongoose.model('Code', codeSchema);
const Claim = mongoose.model('Claim', claimSchema);
const Admin = mongoose.model('Admin', adminSchema);

// ─── Criar admin padrão se não existir ───
async function ensureAdmin() {
  const exists = await Admin.findOne({ username: 'admin' });
  if (!exists) {
    await Admin.create({ username: 'admin', password: 'gm7@cinema2024' });
    console.log('👤 Admin padrão criado (admin / gm7@cinema2024)');
  }
}
ensureAdmin();

// ══════════════════════════════════════
// ROTAS
// ══════════════════════════════════════

// Health check
app.get('/ping', (req, res) => {
  res.json({ success: true, message: 'Cinema GM7 API rodando!' });
});

// ─── LOGIN ───
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username, password });
    if (!admin) return res.json({ success: false, error: 'Usuário ou senha incorretos' });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ─── GET ALL CODES ───
app.get('/codes', async (req, res) => {
  try {
    const codes = await Code.find().sort({ created_at: 1 });
    res.json({ success: true, codes });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ─── ADD CODES (bulk) ───
app.post('/codes', async (req, res) => {
  try {
    const { codes, shopping } = req.body;
    if (!codes || !shopping) return res.json({ success: false, error: 'Dados incompletos' });

    // Filter duplicates
    const existing = await Code.find({ shopping }).select('code');
    const existingSet = new Set(existing.map(c => c.code));
    const fresh = codes.filter(c => c.trim() && !existingSet.has(c.trim()));

    if (fresh.length === 0) return res.json({ success: true, added: 0 });

    const docs = fresh.map(code => ({ code: code.trim(), shopping }));
    await Code.insertMany(docs);

    res.json({ success: true, added: fresh.length });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ─── REMOVE CODE ───
app.delete('/codes/:id', async (req, res) => {
  try {
    await Code.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ─── CLAIM CODE ───
app.post('/codes/:id/claim', async (req, res) => {
  try {
    const { email, name } = req.body;
    const code = await Code.findById(req.params.id);

    if (!code) return res.json({ success: false, error: 'Código não encontrado' });
    if (code.claimed) return res.json({ success: false, error: 'Convite já foi resgatado' });

    // Update code
    code.claimed = true;
    code.claimed_by = email;
    code.claimed_by_name = name;
    code.claimed_at = new Date();
    await code.save();

    // Save to history
    await Claim.create({
      code: code.code,
      shopping: code.shopping,
      claimed_by: email,
      claimed_by_name: name
    });

    res.json({ success: true, code: code.code });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ─── GET CLAIMS HISTORY ───
app.get('/claims', async (req, res) => {
  try {
    const claims = await Claim.find().sort({ claimed_at: 1 });
    res.json({ success: true, claims });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ─── CHANGE ADMIN PASSWORD ───
app.post('/admin/password', async (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;
    const admin = await Admin.findOne({ username, password: oldPassword });
    if (!admin) return res.json({ success: false, error: 'Senha atual incorreta' });
    admin.password = newPassword;
    await admin.save();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ─── START ───
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎬 Cinema GM7 API rodando na porta ${PORT}`);
});
