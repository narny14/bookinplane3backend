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
  db.query('SELECT * FROM aeroports  WHERE id != 11', (err, result) => {
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
  return res.status(500).json({ error: err.message });
}

    res.json(results);
  });
});

const fs = require('fs');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const path = require('path');

app.post('/cartbillets', async (req, res) => {
  const data = req.body;
  console.log('=== NOUVELLE REQUÊTE CARTBILLETS ===');
  console.log('Données reçues:', JSON.stringify(data, null, 2));

  let pdfPath = null;

  try {
    // Vérification basique des champs
    if (!data.email) {
      console.error('❌ Erreur: email manquant');
      return res.status(400).json({ message: 'Email manquant' });
    }

    // 🔹 CONVERSION DES TYPES POUR RAILWAY
    let flightIdInt = parseInt(data.flight_id);
    if (isNaN(flightIdInt)) {
      console.warn('⚠️ flight_id n\'est pas un nombre, utilisation de valeur par défaut');
      flightIdInt = 9999;
    }

    // Convertir les heures en datetime pour MySQL
    const departureDatetime = data.date && data.departure 
      ? `${data.date.split(' ')[0]} ${data.departure}:00` 
      : `${new Date().toISOString().split('T')[0]} 08:00:00`;
    
    const arrivalDatetime = data.date && data.arrival 
      ? `${data.date.split(' ')[0]} ${data.arrival}:00` 
      : `${new Date().toISOString().split('T')[0]} 10:00:00`;

    // Log des données transformées
    console.log('Données transformées pour insertion:');
    console.log('- flight_id:', data.flight_id, '→', flightIdInt);
    console.log('- departure:', data.departure, '→', departureDatetime);
    console.log('- arrival:', data.arrival, '→', arrivalDatetime);

    // 1. Insertion MySQL
    console.log('Tentative d\'insertion dans la base de données...');
    
    const [result] = await db.promise().query(
      `INSERT INTO cartbillets 
      (utilisateurs_id, flight_id, airline, departure, arrival, 
       from_location, to_location, price, date, class_text, 
       code, seat, payment_method, email) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.utilisateurs_id || 1,
        flightIdInt,
        data.airline || 'Airline Inconnue',
        departureDatetime,
        arrivalDatetime,
        data.from_location || 'Non spécifié',
        data.to_location || 'Non spécifié',
        data.price || 0,
        data.date ? data.date.split(' ')[0] : new Date().toISOString().split('T')[0],
        data.class_text || 'Economy',
        data.code || `CODE${Date.now()}`,
        data.seat || 'Non assigné',
        data.payment_method || 'card',
        data.email
      ]
    );

    console.log('✅ Insertion MySQL réussie, ID:', result.insertId);

    // 2. Générer le PDF (simplifié pour le test)
    console.log('Génération du PDF...');
    pdfPath = path.join(__dirname, 'temp', `billet-${data.code}-${Date.now()}.pdf`);
    
    if (!fs.existsSync(path.join(__dirname, 'temp'))) {
      fs.mkdirSync(path.join(__dirname, 'temp'));
    }

    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    doc.fontSize(20).text('Billet de Réservation', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Réservation: ${data.code}`);
    doc.end();

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    console.log('✅ PDF généré:', pdfPath);

    // 3. Nettoyage
    try {
      fs.unlinkSync(pdfPath);
      console.log('✅ PDF temporaire supprimé');
    } catch (cleanupError) {
      console.warn('⚠️ Erreur suppression PDF:', cleanupError.message);
    }

    // 4. Réponse succès
    console.log('✅ Envoi réponse succès au client');
    res.status(200).json({ 
      message: 'Réservation enregistrée avec succès',
      reservationId: result.insertId,
      code: data.code
    });

  } catch (error) {
    console.error('❌ ERREUR SERVEUR COMPLÈTE:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.code) {
      console.error('Code erreur MySQL:', error.code);
    }
    
    if (error.sql) {
      console.error('Requête SQL:', error.sql);
      console.error('Paramètres SQL:', error.parameters);
    }

    // Nettoyage en cas d'erreur
    try {
      if (pdfPath && fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
        console.log('✅ PDF nettoyé après erreur');
      }
    } catch (cleanupError) {
      console.error('❌ Erreur nettoyage après erreur:', cleanupError);
    }

    // Réponse d'erreur avec plus de détails en développement
    const errorResponse = {
      message: 'Erreur lors de la réservation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    };
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = {
        code: error.code,
        sqlMessage: error.sqlMessage,
        stack: error.stack
      };
    }
    
    res.status(500).json(errorResponse);
  }
});

/*
app.post('/cartbillets', (req, res) => {
  const data = req.body;
  console.log('REQUETE REÇUE DANS /cartbillets :', data);

  // Vérification basique des champs
  if (!data.email) {
    console.error('Erreur : email manquant');
    return res.status(400).json({ message: 'Email manquant' });
  }
  if (!data.code) {
    console.error('Erreur : code manquant');
    return res.status(400).json({ message: 'Code manquant' });
  }

  // 1. Insertion MySQL
  db.promise().query(
    'INSERT INTO cartbillets (utilisateurs_id, flight_id, airline, departure, arrival, from_location, to_location, price, date, class_text, code, seat, payment_method,email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      data.utilisateurs_id,
      data.flight_id,
      data.airline,
      data.departure,
      data.arrival,
      data.from,
      data.to,
      data.price,
      data.date,
      data.classText,
      data.code,
      data.selectedSeat,
      data.paymentMethod,
      data.email
    ]
  )
  .then(() => {
    console.log('Insertion MySQL OK');
    // 2. Générer le PDF
    const doc = new PDFDocument();
    const pdfPath = path.join(__dirname, `billet-${data.code}.pdf`);
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    doc.fontSize(20).text('Billet de Réservation', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Numéro de réservation: ${data.code}`);
    doc.text(`Nom du passager ID: ${data.utilisateurs_id}`);
    doc.text(`Compagnie: ${data.airline}`);
    doc.text(`Date de vol: ${data.date}`);
    doc.text(`Classe: ${data.classText}`);
    doc.text(`Départ: ${data.departure} depuis ${data.from}`);
    doc.text(`Arrivée: ${data.arrival} à ${data.to}`);
    doc.text(`Siège: ${data.selectedSeat}`);
    doc.text(`Prix: ${data.price} $`);
    doc.text(`Méthode de paiement: ${data.paymentMethod}`);
    doc.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        console.log('PDF généré:', pdfPath);
        resolve(pdfPath);
      });
      writeStream.on('error', (err) => {
        console.error('Erreur écriture PDF:', err);
        reject(err);
      });
    });
  })
  .then((pdfPath) => {
    // 3. Envoi email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'spencermimo@gmail.com',
        pass: 'iqvc rnjr uhms ukok'
      }
    });

    return transporter.sendMail({
      from: '"Booking Plane" <spencermimo@gmail.com>',
      to: data.email,
      subject: 'Votre billet de voyage',
      text: `Bonjour,\n\nVeuillez trouver ci-joint votre billet de réservation.\nMerci d’avoir choisi Booking Plane.`,
      attachments: [
        {
          filename: `billet-${data.code}.pdf`,
          path: pdfPath
        }
      ]
    })
    .then(() => {
      console.log('Email envoyé à', data.email);
      return pdfPath;
    });
  })
  .then((pdfPath) => {
    // Supprimer le fichier PDF après l’envoi
    fs.unlink(pdfPath, (err) => {
      if (err) console.error('Erreur suppression PDF:', err);
      else console.log('PDF supprimé:', pdfPath);
    });
    res.status(200).json({ message: 'Réservation enregistrée et email envoyé.' });
  })
  .catch(err => {
    console.error('Erreur serveur:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  });
});*/

// GET /reservations?email=...&user_id=...// GET /reservationslist?email=...&user_id=...
app.get('/reservationslist', (req, res) => {
  const { email, user_id } = req.query;

  if (!email || !user_id) {
    return res.status(400).json({ message: 'Email et user_id sont requis' });
  }

  const sql = `
    SELECT * FROM reservations 
    WHERE email = ? AND utilisateur_id = ? 
    ORDER BY date_reservation DESC
  `;

  db.query(sql, [email, user_id], (err, results) => {
    if (err) {
      console.error('Erreur serveur :', err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }

    res.json(results);
  });
});


// Réservation
// Réservation multiple (oneway, roundtrip, multicity)
app.post('/add', async (req, res) => {
  try {
    const {
      nom,
      prenom,
      telephone,
      email,
      adresse,
      ville,
      date_naissance,
      pays,
      passeport,
      expiration_passeport,
      place_selectionnee,
      vols, // [{vol_id, classe_id, airline, ...}]
    } = req.body;

    if (!nom || !email || !Array.isArray(vols) || vols.length === 0) {
      return res.status(400).json({ error: 'Champs obligatoires manquants ou vols vides' });
    }

    // Promisify MySQL
    const query = (sql, params) =>
      new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });

    // --- Format helpers ---
    const formatDate = (d) => {
      if (!d) return null;
      // Si déjà YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      // Si JJ/MM/AAAA
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d)) {
        const [jour, mois, annee] = d.split('/');
        return `${annee}-${mois.padStart(2, '0')}-${jour.padStart(2, '0')}`;
      }
      const parsed = new Date(d);
      return isNaN(parsed) ? null : parsed.toISOString().split('T')[0];
    };

    const formatTime = (t) => {
      if (!t) return null;
      // Si déjà HH:MM:SS
      if (/^\d{1,2}:\d{2}:\d{2}$/.test(t)) return t;
      // Si HH:MM → ajouter :00
      if (/^\d{1,2}:\d{2}$/.test(t)) return t + ':00';
      return null; // sinon NULL MySQL
    };

    const dateNaissanceFormatted = formatDate(date_naissance);
    const expirationPasseportFormatted = formatDate(expiration_passeport);

    // 1️⃣ Chercher ou créer utilisateur
    let utilisateurs = await query('SELECT id FROM utilisateurs WHERE email = ?', [email]);
    let utilisateur_id = utilisateurs.length
      ? utilisateurs[0].id
      : (await query(
          'INSERT INTO utilisateurs (nom, prenom, telephone, email) VALUES (?, ?, ?, ?)',
          [nom, prenom || null, telephone || null, email]
        )).insertId;

    // 2️⃣ Insertion pour chaque vol
    for (const vol of vols) {
      const {
        vol_id,
        classe_id,
        airline,
        arrival,
        classText,
        code,
        departure,
        fdate,
        from,
        to,
        time,   // durée vol
        price,
        gates
      } = vol;

      // Skip si pas de vol_id ou classe_id
      if (!vol_id || !classe_id) continue;

      const values = [
        utilisateur_id,
        vol_id,
        classe_id,
        nom,
        email,
        adresse || null,
        ville || null,
        dateNaissanceFormatted,
        pays || null,
        passeport || null,
        expirationPasseportFormatted,
        place_selectionnee || null,
        airline || null,
        classText || null,
        code || null,
        formatTime(departure),
        formatTime(arrival),
        formatDate(fdate),
        from || null,
        to || null,
        formatTime(time), // durée vol
        price || 0,
        gates || null,
      ];

      const sqlReservation = `
        INSERT INTO reservations (
          utilisateur_id, vol_id, classe_id,
          nom, email, adresse, ville, date_naissance,
          pays, passeport, expiration_passeport,
          place_selectionnee,
          airline_id, class_text, code_vol,
          heure_depart, heure_arrivee, date_vol,
          aeroport_depart, aeroport_arrivee, duree_vol,
          prix, gates, statut
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Réservé')
      `;

      await query(sqlReservation, values);
    }

    res.json({
      message: 'Réservations enregistrées avec succès',
      email,
      utilisateur_id,
      total_vols: vols.length
    });

  } catch (err) {
    console.error('Erreur serveur :', err);
    res.status(500).json({
      error: 'Erreur serveur',
      details: err.message,
    });
  }
});

/*app.post('/add', async (req, res) => {
  try {
    const {
      nom,
      prenom,       // tu peux ajouter ça côté client si possible
      telephone,    // idem
      email,
      vol_id,
      classe_id,
      adresse,
      ville,
      date_naissance,
      pays,
      passeport,
      expiration_passeport,
      place_selectionnee,
      airline,
      arrival,
      classText,
      code,
      departure,
      fdate,
      from,
      to,
      time,
      price,
      gates
    } = req.body;

    if (!nom || !email || !vol_id || !classe_id) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    // Fonction utilitaire pour exécuter une requête SQL avec promise
    const query = (sql, params) =>
      new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });

    // 1. Chercher utilisateur
    let utilisateurs = await query('SELECT id FROM utilisateurs WHERE email = ?', [email]);
    let utilisateur_id;

    if (utilisateurs.length > 0) {
      utilisateur_id = utilisateurs[0].id;
    } else {
      // 2. Créer utilisateur si pas trouvé
      const insertResult = await query(
        'INSERT INTO utilisateurs (nom, prenom, telephone, email) VALUES (?, ?, ?, ?)',
        [nom, prenom || null, telephone || null, email]
      );
      utilisateur_id = insertResult.insertId;
    }

    // Format dates au format YYYY-MM-DD si besoin
    const formatDate = (d) => (d ? new Date(d).toISOString().split('T')[0] : null);
    const dateNaissanceFormatted = formatDate(date_naissance);
    const expirationPasseportFormatted = formatDate(expiration_passeport);
    const dateVolFormatted = formatDate(fdate);

    // 3. Insérer la réservation avec utilisateur_id récupéré/créé
    const sqlReservation = `
      INSERT INTO reservations (
        utilisateur_id, vol_id, classe_id,
        nom, email, adresse, ville, date_naissance,
        pays, passeport, expiration_passeport,
        place_selectionnee,
        airline_id, class_text, code_vol,
        heure_depart, heure_arrivee, date_vol,
        aeroport_depart, aeroport_arrivee, duree_vol,
        prix, gates, statut
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Réservé')
    `;

    const values = [
      utilisateur_id,
      vol_id,
      classe_id,
      nom,
      email,
      adresse || null,
      ville || null,
      dateNaissanceFormatted,
      pays || null,
      passeport || null,
      expirationPasseportFormatted,
      place_selectionnee || null,
      airline,
      classText || null,
      code || null,
      departure || null,
      arrival || null,
      dateVolFormatted,
      from || null,
      to || null,
      time || null,
      price || 0,
      gates || null,
    ];

    await query(sqlReservation, values);

    // Renvoi de email + utilisateur_id au client
    res.json({
      message: 'Réservation enregistrée avec succès',
      email,
      utilisateur_id
    });
  } catch (err) {
    console.error('Erreur serveur :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});*/


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
});
app.post('/api/search-vols-dispo', (req, res) => {
  const { tripType, segments, adults, children } = req.body;
  const totalPassagers = (adults || 0) + (children || 0);

  if (!Array.isArray(segments) || segments.length === 0) {
    return res.status(400).json({ error: 'Aucun segment de vol fourni' });
  }

  // Collecte toutes les villes utilisées pour éviter des erreurs de jointure
  const villes = [];
  segments.forEach(seg => {
    if (seg.depart) villes.push(seg.depart);
    if (seg.arrivee) villes.push(seg.arrivee);
  });
  const uniqueVilles = [...new Set(villes)];

  const getIdsQuery = `
    SELECT id, ville, latitude, longitude FROM aeroports WHERE ville IN (${uniqueVilles.map(() => '?').join(',')})
  `;

  db.query(getIdsQuery, uniqueVilles, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const villeMap = {};
    rows.forEach(r => villeMap[r.ville] = r);

    // Vérifier que toutes les villes existent
    for (const seg of segments) {
      if (!villeMap[seg.depart] || !villeMap[seg.arrivee]) {
        return res.status(404).json({ error: `Aéroport introuvable pour ${seg.depart} ou ${seg.arrivee}` });
      }
    }

    // Génération SQL dynamique pour les segments et les dates
    const dateStart = segments[0].date;
    const dateEnd = segments[segments.length-1].date; // on peut ajuster selon le tripType

    const tripSqlSegments = segments.map((seg, idx) => {
      const dep = villeMap[seg.depart];
      const arr = villeMap[seg.arrivee];
      const directionOrder = idx + 1; // permet de trier
      return `SELECT ${directionOrder} AS ordre,
                     '${seg.depart}' AS ville_depart,
                     '${seg.arrivee}' AS ville_arrivee,
                     '${tripType}' AS type_voyage,
                     ${dep.latitude} AS dep_lat,
                     ${dep.longitude} AS dep_lon,
                     ${arr.latitude} AS arr_lat,
                     ${arr.longitude} AS arr_lon`;
    }).join(' UNION ALL ');

    const finalQuery = `
      WITH RECURSIVE dates AS (
        SELECT DATE(?) AS jour
        UNION ALL
        SELECT DATE_ADD(jour, INTERVAL 1 DAY)
        FROM dates
        WHERE jour <= ?
      ),
      segments AS (
        ${tripSqlSegments}
      )
      SELECT 
        d.jour AS date_depart,
        s.type_voyage,
        s.ville_depart,
        s.ville_arrivee,
        ROUND(
          (6371 * ACOS(
            COS(RADIANS(s.dep_lat)) * COS(RADIANS(s.arr_lat)) *
            COS(RADIANS(s.arr_lon) - RADIANS(s.dep_lon)) +
            SIN(RADIANS(s.dep_lat)) * SIN(RADIANS(s.arr_lat))
          )) * p.prix_km_economy, 2
        ) AS prix_economy,
        ROUND(
          (6371 * ACOS(
            COS(RADIANS(s.dep_lat)) * COS(RADIANS(s.arr_lat)) *
            COS(RADIANS(s.arr_lon) - RADIANS(s.dep_lon)) +
            SIN(RADIANS(s.dep_lat)) * SIN(RADIANS(s.arr_lat))
          )) * p.prix_km_first_class, 2
        ) AS prix_first_class,
        ROUND(
          (6371 * ACOS(
            COS(RADIANS(s.dep_lat)) * COS(RADIANS(s.arr_lat)) *
            COS(RADIANS(s.arr_lon) - RADIANS(s.dep_lon)) +
            SIN(RADIANS(s.dep_lat)) * SIN(RADIANS(s.arr_lat))
          )) * p.prix_km_vip, 2
        ) AS prix_vip
      FROM dates d
      CROSS JOIN segments s
      JOIN prix p ON 1=1
      ORDER BY d.jour, s.ordre
    `;

    db.query(finalQuery, [dateStart, dateEnd], (err2, results) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ tripType, flights: results });
    });
  });
});

/*app.post('/api/search-vols-dispo', (req, res) => {
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

    const queryExactDate = `
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
        AND DATE(v.date_depart) = DATE(?)
        AND v.disponible = 1
        AND t.places_disponibles >= ?
    `;

    const queryFutureDates = `
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
        AND DATE(v.date_depart) >= DATE(?)
        AND v.disponible = 1
        AND t.places_disponibles >= ?
      ORDER BY v.date_depart ASC
      LIMIT 10
    `;

    const formatToDateTime = (dateStr) => {
      return `${dateStr} 00:00:00`;
    };

    const searchSegment = (seg) => {
      return new Promise((resolve, reject) => {
        const formattedDate = formatToDateTime(seg.date);

        const params = [
          villeToId[seg.depart],
          villeToId[seg.arrivee],
          formattedDate,
          totalPassagers
        ];

        console.log("Recherche segment exact:", seg, params);

        db.query(queryExactDate, params, (err, exactResults) => {
          if (err) return reject(err);

          if (exactResults.length > 0) {
            console.log("→ Vol exact trouvé:", exactResults.length);
            resolve(exactResults.map(f => ({ ...f, alternative: false })));
          } else {
            db.query(queryFutureDates, params, (err2, futureResults) => {
              if (err2) return reject(err2);

              console.log("→ Aucun vol exact, alternatives trouvées:", futureResults.length);
              resolve(futureResults.map(f => ({ ...f, alternative: true })));
            });
          }
        });
      });
    };

    Promise.all(segments.map(searchSegment))
      .then(results => {
        res.json({ tripType, flights: results });
      })
      .catch(err => {
        console.error("Erreur lors de la recherche des vols:", err);
        res.status(500).json({ error: err.message });
      });
  });
});***/
/*app.post('/api/search-vols-dispo', (req, res) => {
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

    // CORRECTION : Requête modifiée pour mieux correspondre à votre structure de données
    const queryExactDate = `
      SELECT v.*, 
             a1.nom AS depart_nom, 
             a2.nom AS arrivee_nom,
             a1.ville AS depart_ville,
             a2.ville AS arrivee_ville,
             t.prix, t.devise, t.places_disponibles, 
             c.nom AS classe, c.id AS classe_id
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
      ORDER BY v.date_depart, c.id
    `;

    const queryFutureDates = `
      SELECT v.*, 
             a1.nom AS depart_nom, 
             a2.nom AS arrivee_nom,
             a1.ville AS depart_ville,
             a2.ville AS arrivee_ville,
             t.prix, t.devise, t.places_disponibles, 
             c.nom AS classe, c.id AS classe_id
      FROM vols v
      JOIN aeroports a1 ON v.depart_id = a1.id
      JOIN aeroports a2 ON v.arrivee_id = a2.id
      JOIN tarifs_vol t ON v.id = t.vol_id
      JOIN classes_voyage c ON t.classe_id = c.id
      WHERE v.depart_id = ?
        AND v.arrivee_id = ?
        AND DATE(v.date_depart) >= ?
        AND v.disponible = 1
        AND t.places_disponibles >= ?
      ORDER BY v.date_depart ASC, c.id
      LIMIT 10
    `;

    // CORRECTION : Format de date simplifié
    const formatToDate = (dateStr) => {
      return dateStr; // La date est déjà au format YYYY-MM-DD
    };

    const searchSegment = (seg) => {
      return new Promise((resolve, reject) => {
        const formattedDate = formatToDate(seg.date);

        const params = [
          villeToId[seg.depart],
          villeToId[seg.arrivee],
          formattedDate,
          totalPassagers
        ];

        console.log("Recherche segment:", seg, "Params:", params);

        db.query(queryExactDate, params, (err, exactResults) => {
          if (err) {
            console.error("Erreur queryExactDate:", err);
            return reject(err);
          }

          console.log("Résultats exacts trouvés:", exactResults.length);
          
          if (exactResults.length > 0) {
            // Grouper par vol et inclure toutes les classes
            const groupedResults = {};
            exactResults.forEach(flight => {
              if (!groupedResults[flight.id]) {
                groupedResults[flight.id] = {
                  ...flight,
                  tarifs: []
                };
                delete groupedResults[flight.id].prix;
                delete groupedResults[flight.id].devise;
                delete groupedResults[flight.id].places_disponibles;
                delete groupedResults[flight.id].classe;
                delete groupedResults[flight.id].classe_id;
              }
              groupedResults[flight.id].tarifs.push({
                classe_id: flight.classe_id,
                classe: flight.classe,
                prix: flight.prix,
                devise: flight.devise,
                places_disponibles: flight.places_disponibles
              });
            });
            
            resolve(Object.values(groupedResults).map(f => ({ ...f, alternative: false })));
          } else {
            console.log("Aucun vol exact, recherche d'alternatives...");
            
            db.query(queryFutureDates, params, (err2, futureResults) => {
              if (err2) {
                console.error("Erreur queryFutureDates:", err2);
                return reject(err2);
              }

              console.log("Résultats alternatifs trouvés:", futureResults.length);
              
              // Grouper par vol et inclure toutes les classes
              const groupedResults = {};
              futureResults.forEach(flight => {
                if (!groupedResults[flight.id]) {
                  groupedResults[flight.id] = {
                    ...flight,
                    tarifs: []
                  };
                  delete groupedResults[flight.id].prix;
                  delete groupedResults[flight.id].devise;
                  delete groupedResults[flight.id].places_disponibles;
                  delete groupedResults[flight.id].classe;
                  delete groupedResults[flight.id].classe_id;
                }
                groupedResults[flight.id].tarifs.push({
                  classe_id: flight.classe_id,
                  classe: flight.classe,
                  prix: flight.prix,
                  devise: flight.devise,
                  places_disponibles: flight.places_disponibles
                });
              });
              
              resolve(Object.values(groupedResults).map(f => ({ ...f, alternative: true })));
            });
          }
        });
      });
    };

    Promise.all(segments.map(searchSegment))
      .then(results => {
        console.log("Recherche terminée, résultats:", results.map(r => r.length));
        res.json({ 
          success: true,
          tripType, 
          segments: results,
          message: `Recherche effectuée avec succès`
        });
      })
      .catch(err => {
        console.error("Erreur lors de la recherche des vols:", err);
        res.status(500).json({ 
          success: false,
          error: "Erreur interne du serveur lors de la recherche des vols" 
        });
      });
  });
});*/

app.listen(PORT, () => {
  console.log(`🚀 Serveur backend en cours sur http://localhost:${PORT}`);
});
