const express = require('express');
const fs = require('fs');
const mysql = require('mysql2');
const router = express.Router();

const connection = mysql.createConnection({
  host: 'yamabiko.proxy.rlwy.net',
  port: 51719,
  user: 'root',
  password: 'ebRRVBYJQXgnBSLYyqctgCFUfXAgUBWp',
  database: 'railway'
});

router.get('/', (req, res) => {
  const sqlFile = './insertion_vols_et_tarifs.sql';

  fs.readFile(sqlFile, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Erreur de lecture du fichier SQL');

    const queries = data.replace(/INSERT INTO/g, 'INSERT IGNORE INTO')
                        .split(';')
                        .map(q => q.trim())
                        .filter(Boolean);

    let executed = 0;
    let errors = [];

    const runNext = () => {
      if (executed >= queries.length) {
        return res.send(`✅ Import terminé : ${executed} requêtes exécutées. ${errors.length ? `${errors.length} erreurs.` : ''}`);
      }

      connection.query(queries[executed], (error) => {
        if (error) errors.push(error.message);
        executed++;
        runNext();
      });
    };

    runNext();
  });
});

module.exports = router;
