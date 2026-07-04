require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Configuration du CORS pour accepter ton site Vercel (et ton futur domaine)
app.use(cors());

app.use(express.json());

// Connexion à la base de données PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Requis pour les hébergeurs gratuits comme Supabase/Neon
});

// ─── ROUTES POUR LES ARTICLES ───

// Récupérer tous les articles
app.get('/api/articles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM articles ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ajouter un article (Admin)
app.post('/api/articles', async (req, res) => {
  const { title, category, image, content, score, author } = req.body;
  try {
    const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const result = await pool.query(
      'INSERT INTO articles (title, category, image, content, score, date, author) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title, category, image, content, score, dateStr, author]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ROUTES POUR LES UTILISATEURS ───

// Inscription d'un utilisateur
app.post('/api/users/register', async (req, res) => {
  const { pseudo, email, password } = req.body;
  try {
    // Vérifier si l'email existe déjà
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: "Cet email est déjà utilisé." });
    }

    const result = await pool.query(
      'INSERT INTO users (pseudo, email, password, role, premium) VALUES ($1, $2, $3, $4, $5) RETURNING id, pseudo, email, role, premium',
      [pseudo, email, password, 'user', false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Connexion d'un utilisateur
app.post('/api/users/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }
    const user = result.rows[0];
    res.json({ id: user.id, pseudo: user.pseudo, email: user.email, role: user.role, premium: user.premium });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lancement du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Le serveur AfriGames tourne sur le port ${PORT}`);
});
