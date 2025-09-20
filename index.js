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
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.connect(err => {
  if (err) {
    console.error('❌ Erreur de connexion MySQL :', err.message);
  } else {
    console.log('✅ Connecté à Railway MySQL');
  }
});
console.log("✅ Connecté DB:", process.env.DB_HOST, process.env.DB_NAME, process.env.DB_USER);

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
  let connection; // Déclarer la connexion pour gestion manuelle des transactions

  try {
    if (!data.email) {
      return res.status(400).json({ message: 'Email manquant' });
    }

    // Obtenir une connexion dédiée pour la transaction
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    // 1️⃣ Vérifier utilisateur ou créer
    let [userRows] = await connection.query(
      "SELECT id FROM utilisateurs WHERE email = ?",
      [data.email]
    );

    let utilisateurId;
    if (userRows.length > 0) {
      utilisateurId = userRows[0].id;
    } else {
      const [userResult] = await connection.query(
        `INSERT INTO utilisateurs (nom, prenom, telephone, email, date_inscription)
         VALUES (?, ?, ?, ?, NOW())`,
        [data.nom || '', data.prenom || '', data.telephone || '', data.email]
      );
      utilisateurId = userResult.insertId;
    }

    // 2️⃣ Fonction insertion réservation - CORRIGÉE
    const insertReservation = async (seg, idx = 0, type = "oneway") => {
      const flightIdInt = parseInt(seg.flight_id) || 9999;

      // CALCUL DE LA DURÉE DU VOL - CORRECTION
      let dureeVol = "02:00:00";
      
      if (seg.departure && seg.arrival) {
        try {
          const [depHours, depMins] = seg.departure.split(':').map(Number);
          const [arrHours, arrMins] = seg.arrival.split(':').map(Number);
          
          let totalMins = (arrHours * 60 + arrMins) - (depHours * 60 + depMins);
          if (totalMins < 0) totalMins += 1440;
          
          const hours = Math.floor(totalMins / 60);
          const mins = totalMins % 60;
          dureeVol = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
        } catch (e) {
          console.error("Erreur calcul durée:", e);
          dureeVol = "02:00:00";
        }
      }

      // CORRECTION: 24 placeholders pour 24 valeurs
      const [resResult] = await connection.query(
        `INSERT INTO reservations 
        (utilisateur_id, vol_id, classe_id, statut, date_reservation,
         nom, email, adresse, ville, date_naissance, pays, passeport, expiration_passeport,
         place_selectionnee, airline_id, class_text, code_vol, 
         heure_depart, heure_arrivee, date_vol, aeroport_depart, aeroport_arrivee, duree_vol, types_de_vol)
        VALUES (?, ?, ?, ?, NOW(),
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          utilisateurId,
          flightIdInt,
          seg.classe_id || 1,
          data.statut || 'Réservé',
          // Données personnelles
          data.nom || '',
          data.email,
          data.adresse || '',
          data.ville || '',
          data.date_naissance || null,
          data.pays || '',
          data.passeport || '',
          data.expiration_passeport || null,
          // Info vol
          seg.seat || '',
          seg.airline_id || 0,
          seg.class_text || 'Economy',
          // Code court (max 20 caractères)
          seg.code ? seg.code.slice(0, 19) : `C${Date.now().toString().slice(-8)}${idx}`,
          seg.departure || "00:00:00",
          seg.arrival || "00:00:00",
          seg.date ? seg.date.split(" ")[0] : new Date().toISOString().split("T")[0],
          seg.from_location || seg.from || "N/A",
          seg.to_location || seg.to || "N/A",
          dureeVol,
          type
        ]
      );

      return resResult.insertId;
    };

    // 3️⃣ Insérer selon type de vol
    let insertedReservations = [];
    let flightIds = []; // Pour stocker les IDs de vol pour cartbillets

    if (data.types_de_vol === "oneway") {
      const reservationId = await insertReservation(data, 0, "oneway");
      insertedReservations.push(reservationId);
      flightIds.push(parseInt(data.flight_id) || 9999);
    }
    else if (data.types_de_vol === "roundtrip") {
      // Aller
      const allerId = await insertReservation({
        ...data,
        from_location: data.from_location || "N/A",
        to_location: data.to_location || "N/A",
        departure: data.departure || "00:00:00",
        arrival: data.arrival || "00:00:00",
        date: data.date || new Date().toISOString().split("T")[0],
        code: `${data.code || "CODE"}-ALLER`
      }, 0, "roundtrip");
      insertedReservations.push(allerId);
      flightIds.push(parseInt(data.flight_id) || 9999);

      // Retour
      const retourId = await insertReservation({
        ...data,
        from_location: data.to_location || "N/A",
        to_location: data.from_location || "N/A",
        departure: data.departure_retour || "00:00:00",
        arrival: data.arrival_retour || "00:00:00",
        date: data.date_retour || new Date().toISOString().split("T")[0],
        code: `${data.code || "CODE"}-RETOUR`
      }, 1, "roundtrip");
      insertedReservations.push(retourId);
      flightIds.push(parseInt(data.flight_id_retour) || 9998); // ID différent pour le vol retour
    }
    else if (data.types_de_vol === "multicity" && Array.isArray(data.segments)) {
      for (let i = 0; i < data.segments.length; i++) {
        const seg = {
          ...data.segments[i],
          from_location: data.segments[i].from || data.segments[i].from_location || "N/A",
          to_location: data.segments[i].to || data.segments[i].to_location || "N/A",
          departure: data.segments[i].departure || "00:00:00",
          arrival: data.segments[i].arrival || "00:00:00",
          date: data.segments[i].date || new Date().toISOString().split("T")[0],
          class_text: data.segments[i].class_text || "Economy",
          airline: data.segments[i].airline || "Non spécifié",
          seat: data.segments[i].seat || "",
          code: `${data.code || "CODE"}-SEG${i+1}`
        };
        const reservationId = await insertReservation(seg, i, "multicity");
        insertedReservations.push(reservationId);
        flightIds.push(parseInt(data.segments[i].flight_id) || (9999 + i));
      }
    }

    console.log("✅ Reservations insérées:", insertedReservations);

    // 4️⃣ Insertion dans cartbillets - CORRIGÉE
    // Utiliser le premier flight_id ou une valeur par défaut
    const primaryFlightId = flightIds.length > 0 ? flightIds[0] : 9999;
    
    const [cartResult] = await connection.query(
      `INSERT INTO cartbillets 
      (utilisateurs_id, flight_id, airline, departure, arrival, 
       from_location, to_location, price, date, class_text, code, 
       seat, payment_method, email, types_de_vol, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        utilisateurId,
        primaryFlightId,  // Utiliser un ID de vol réel au lieu de null
        data.airline || '',
        data.departure || null,
        data.arrival || null,
        data.from_location || '',
        data.to_location || '',
        data.price || 0,
        data.date ? data.date.split(' ')[0] : new Date().toISOString().split('T')[0],
        data.class_text || 'Economy',
        data.code ? data.code.slice(0, 19) : `C${Date.now().toString().slice(-8)}`,
        data.seat || '',
        data.payment_method || 'Carte',
        data.email,
        data.types_de_vol || ''
      ]
    );

    console.log('✅ CartBillet inséré ID:', cartResult.insertId);

    // Valider la transaction
    await connection.commit();
    connection.release();

    // 5️⃣ Génération PDF billet (reste identique)
    // ... [le reste du code pour le PDF et l'email]

    res.status(200).json({
      message: "Réservation(s) + panier sauvegardés, billet envoyé par email",
      utilisateurId,
      reservations: insertedReservations,
      cartId: cartResult.insertId
    });

  } catch (err) {
    // Annuler la transaction en cas d'erreur
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    
    console.error("❌ Erreur:", err.message);
    if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
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
