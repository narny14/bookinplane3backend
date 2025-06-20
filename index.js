const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connexion MySQL Railway
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

db.connect(err => {
  if (err) {
    console.error('❌ Erreur de connexion MySQL :', err.message);
  } else {
    console.log('✅ Connecté à Railway MySQL');
  }
});

// ====================== ROUTES =======================

// Liste des aéroports
app.get('/api/aeroports', (req, res) => {
  db.query('SELECT * FROM aeroports', (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

// Liste des vols disponibles
app.get('/api/vols', (req, res) => {
  const query = `
    SELECT v.*, a1.nom AS depart_nom, a2.nom AS arrivee_nom
    FROM vols v
    JOIN aeroports a1 ON v.depart_id = a1.id
    JOIN aeroports a2 ON v.arrivee_id = a2.id
    WHERE v.disponible = 1
  `;
  db.query(query, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

// Détails d’un vol (avec tarifs)
app.get('/api/vols/:id', (req, res) => {
  const volId = req.params.id;

  const query = `
    SELECT v.*, 
           a1.nom AS depart_nom, 
           a2.nom AS arrivee_nom,
           t.prix, t.devise, t.places_disponibles, c.nom AS classe
    FROM vols v
    JOIN aeroports a1 ON v.depart_id = a1.id
    JOIN aeroports a2 ON v.arrivee_id = a2.id
    JOIN tarifs_vol t ON v.id = t.vol_id
    JOIN classes_voyage c ON t.classe_id = c.id
    WHERE v.id = ?
  `;
  db.query(query, [volId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

// Route pour lire la liste des aéroports
// GET /airports : liste unique des villes d’aéroports en RDC
app.get('/airports', (req, res) => {
  const sql = `
    SELECT DISTINCT ville AS label, ville AS value
    FROM aeroports
    WHERE pays = 'RDC'
    ORDER BY ville ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Erreur récupération aéroports :', err);
      return res.status(500).json({ error: 'Erreur récupération des aéroports' });
    }
    res.json(results);
  });
});


// Réservation
app.post('/api/reservations', (req, res) => {
  const { utilisateur_id, vol_id, classe_id, passagers, poids_kg } = req.body;

  const insertReservation = `
    INSERT INTO reservations (utilisateur_id, vol_id, classe_id) 
    VALUES (?, ?, ?)
  `;

  db.query(insertReservation, [utilisateur_id, vol_id, classe_id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    const reservationId = result.insertId;

    // Insert passagers
    passagers.forEach(p => {
      db.query(
        `INSERT INTO passagers (reservation_id, nom, prenom, date_naissance, passeport) 
         VALUES (?, ?, ?, ?, ?)`,
        [reservationId, p.nom, p.prenom, p.date_naissance, p.passeport]
      );
    });

    // Insert poids
    db.query(
      `INSERT INTO poids_bagages (reservation_id, poids_kg) 
       VALUES (?, ?)`,
      [reservationId, poids_kg || 0]
    );

    res.json({ message: 'Réservation effectuée', reservationId });
  });
});

// Liste des réservations d’un utilisateur
app.get('/api/reservations/:utilisateur_id', (req, res) => {
  const { utilisateur_id } = req.params;

  const query = `
    SELECT r.*, v.numero_vol, a1.nom AS depart, a2.nom AS arrivee
    FROM reservations r
    JOIN vols v ON r.vol_id = v.id
    JOIN aeroports a1 ON v.depart_id = a1.id
    JOIN aeroports a2 ON v.arrivee_id = a2.id
    WHERE r.utilisateur_id = ?
  `;

  db.query(query, [utilisateur_id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

// ======================================================
// Recherche filtrée des vols
app.get('/api/search-vols', (req, res) => {
  const { from, to, date } = req.query;

  if (!from || !to || !date) {
    return res.status(400).json({ error: 'Paramètres from, to et date requis' });
  }

  const query = `
    SELECT v.*, a1.nom AS depart_nom, a2.nom AS arrivee_nom
    FROM vols v
    JOIN aeroports a1 ON v.depart_id = a1.id
    JOIN aeroports a2 ON v.arrivee_id = a2.id
    WHERE a1.ville = ? AND a2.ville = ? AND DATE(v.date_depart) = ?
      AND v.disponible = 1
  `;

  db.query(query, [from, to, date], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});app.post('/api/search-vols-dispo', (req, res) => {
  const { tripType, segments, adults, children } = req.body;

  if (!Array.isArray(segments) || segments.length === 0) {
    return res.status(400).json({ error: 'Aucun segment de vol fourni' });
  }

  const totalPassagers = (adults || 0) + (children || 0);

  const villes = [];
  segments.forEach(seg => {
    if (seg.depart) villes.push(seg.depart);
    if (seg.arrivee) villes.push(seg.arrivee);
  });

  const uniqueVilles = [...new Set(villes)];

  const getIdsQuery = `
    SELECT id, ville FROM aeroports WHERE ville IN (${uniqueVilles.map(() => '?').join(',')})
  `;

  db.query(getIdsQuery, uniqueVilles, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const villeToId = {};
    rows.forEach(r => {
      villeToId[r.ville] = r.id;
    });

    for (const seg of segments) {
      if (!villeToId[seg.depart] || !villeToId[seg.arrivee]) {
        return res.status(404).json({ error: `Aéroport introuvable pour ${seg.depart} ou ${seg.arrivee}` });
      }
    }

    const results = [];
    let pending = segments.length;
    let hasError = false;

    segments.forEach((seg, index) => {
      const query = `
        SELECT v.*, 
               a1.nom AS depart_nom, 
               a2.nom AS arrivee_nom,
               t.prix, t.devise, t.places_disponibles, c.nom AS classe
        FROM vols v
        JOIN aeroports a1 ON v.depart_id = a1.id
        JOIN aeroports a2 ON v.arrivee_id = a2.id
        JOIN tarifs_vol t ON v.id = t.vol_id
        JOIN classes_voyage c ON t.classe_id = c.id
        WHERE v.depart_id = ?
          AND v.arrivee_id = ?
          AND DATE(v.date_depart) = ?
          AND v.disponible = 1
          AND t.places_disponibles >= ?
        ORDER BY v.date_depart ASC
      `;

      const params = [
        villeToId[seg.depart],
        villeToId[seg.arrivee],
        seg.date,
        totalPassagers
      ];

      db.query(query, params, (err, exactResults) => {
        if (hasError) return;
        if (err) {
          hasError = true;
          return res.status(500).json({ error: err.message });
        }

        // Filtrage redondant de sécurité (au cas où `v.disponible = 1` est contourné)
        const filteredResults = exactResults.filter(f => f.disponible === 1);

        results[index] = filteredResults.map(f => ({ ...f, alternative: false }));

        pending--;
        if (pending === 0) {
          return res.json({ tripType, flights: results });
        }
      });
    });
  });
});




app.listen(PORT, () => {
  console.log(`🚀 Serveur backend en cours sur http://localhost:${PORT}`);
});
