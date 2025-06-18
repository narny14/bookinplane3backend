const express = require('express');
const fs = require('fs');
const mysql = require('mysql2');
const router = express.Router();

// Connexion à ta base de données Railway
const connection = mysql.createConnection({
  host: 'yamabiko.proxy.rlwy.net',
  port: 51719,
  user: 'root',
  password: 'ebRRVBYJQXgnBSLYyqctgCFUfXAgUBWp',
  database: 'railway'
});
router.get('/', (req, res) => {
  return res.send("✅ Route import opérationnelle !");
});

/*
router.get('/', (req, res) => {
  const sqlFile = './insertion_vols_et_tarifs.sql';

  if (!fs.existsSync(sqlFile)) {
    return res.status(404).send('❌ Le fichier SQL est introuvable sur Render');
  }

  const sql = fs.readFileSync(sqlFile, 'utf8');
  const queries = sql.replace(/INSERT INTO/g, 'INSERT IGNORE INTO')
                     .split(';')
                     .map(q => q.trim())
                     .filter(Boolean);

  let executed = 0;
  let errors = [];

  const runNext = () => {
    if (executed >= queries.length) {
      return res.send(`✅ Import terminé : ${executed} requêtes exécutées. ${errors.length ? `${errors.length} erreurs.` : ''}`);
    }

    connection.query(queries[executed], (err) => {
      if (err) errors.push(err.message);
      executed++;
      runNext();
    });
  };

  runNext();
});*/

module.exports = router;
