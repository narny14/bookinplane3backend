const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const mysql = require('mysql');

// Connexion à Railway MySQL
const db = mysql.createConnection({
  host: 'yamabiko.proxy.rlwy.net',
  user: 'root',
  password: 'ebRRVBYJQXgnBSLYyqctgCFUfXAgUBWp',
  database: 'railway',
  port: 51719
});

db.connect(err => {
  if (err) {
    console.error('❌ Erreur de connexion MySQL:', err);
  } else {
    console.log('✅ Connecté à la base de données Railway');
  }
});

// Pour servir le formulaire
app.get('/import-form', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/import.html'));
});

// Pour exécuter le script SQL
app.post('/import', (req, res) => {
  const sqlPath = path.join(__dirname, 'insertion_vols_et_tarifs.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  db.query(sql, (err, result) => {
    if (err) {
      console.error('❌ Erreur lors de l\'import SQL:', err);
      res.status(500).send('Erreur lors de l\'importation');
    } else {
      res.send('✅ Importation réussie dans Railway !');
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur en écoute sur le port ${PORT}`);
});
