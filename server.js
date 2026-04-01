const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Serve o site HTML na pasta /public ───
app.use(express.static(path.join(__dirname, 'public')));

// ─── MongoDB ───
const MONGO_URI = process.env.MONGO_URI || '';

if (!MONGO_URI) {
  console.error('❌ MONGO_URI não configurada! Adicione nas Environment Variables do Render.');
} else {
  console.log('🔄 Conectando ao MongoDB...');
  mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log('✅ MongoDB conectado!');
    ensureAdmin();
  })
  .catch(err => {
    console.error('❌ Erro MongoDB:', err.message);
  });
}

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

async function ensureAdmin() {
  try {
    const exists = await Admin.findOne({ username: 'admin' });
    if (!exists) {
      await Admin.create({ username: 'admin', password: 'gm7@cinema2024' });
      console.log('👤 Admin padrão criado (admin / gm7@cinema2024)');
    }
  } catch (err) {
    console.error('Erro ao criar admin:', err.message);
  }
}

function checkDB(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ success: false, error: 'Banco de dados não conectado.' });
  }
  next();
}

// ══════════════════════════════════════
// ROTAS DA API
// ══════════════════════════════════════

app.get('/api/ping', (req, res) => {
  const dbOk = mongoose.connection.readyState === 1;
  res.json({ success: true, message: 'Cinema GM7 API rodando!', database: dbOk ? 'conectado' : 'desconectado' });
});

app.post('/api/login', checkDB, async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username, password });
    if (!admin) return res.json({ success: false, error: 'Usuário ou senha incorretos' });
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

app.get('/api/codes', checkDB, async (req, res) => {
  try {
    const codes = await Code.find().sort({ created_at: 1 });
    res.json({ success: true, codes });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

app.post('/api/codes', checkDB, async (req, res) => {
  try {
    const { codes, shopping } = req.body;
    if (!codes || !shopping) return res.json({ success: false, error: 'Dados incompletos' });
    const existing = await Code.find({ shopping }).select('code');
    const existingSet = new Set(existing.map(c => c.code));
    const fresh = codes.filter(c => c.trim() && !existingSet.has(c.trim()));
    if (fresh.length === 0) return res.json({ success: true, added: 0 });
    const docs = fresh.map(code => ({ code: code.trim(), shopping }));
    await Code.insertMany(docs);
    res.json({ success: true, added: fresh.length });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

app.delete('/api/codes/:id', checkDB, async (req, res) => {
  try {
    await Code.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

app.post('/api/codes/:id/claim', checkDB, async (req, res) => {
  try {
    const { email, name } = req.body;
    const code = await Code.findById(req.params.id);
    if (!code) return res.json({ success: false, error: 'Código não encontrado' });
    if (code.claimed) return res.json({ success: false, error: 'Convite já foi resgatado' });
    code.claimed = true;
    code.claimed_by = email;
    code.claimed_by_name = name;
    code.claimed_at = new Date();
    await code.save();
    await Claim.create({ code: code.code, shopping: code.shopping, claimed_by: email, claimed_by_name: name });
    res.json({ success: true, code: code.code });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

app.get('/api/claims', checkDB, async (req, res) => {
  try {
    const claims = await Claim.find().sort({ claimed_at: 1 });
    res.json({ success: true, claims });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

app.post('/api/admin/password', checkDB, async (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;
    const admin = await Admin.findOne({ username, password: oldPassword });
    if (!admin) return res.json({ success: false, error: 'Senha atual incorreta' });
    admin.password = newPassword;
    await admin.save();
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

// Qualquer rota não-API serve o index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── START ───
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('🎬 Cinema GM7 rodando na porta ' + PORT);
});
