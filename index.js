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
    if (!data.email) {
      return res.status(400).json({ message: 'Email manquant' });
    }

    // 1️⃣ Vérifier utilisateur ou créer
    let [userRows] = await db.promise().query(
      "SELECT id FROM utilisateurs WHERE email = ?",
      [data.email]
    );

    let utilisateurId;
    if (userRows.length > 0) {
      utilisateurId = userRows[0].id;
    } else {
      const [userResult] = await db.promise().query(
        `INSERT INTO utilisateurs (nom, prenom, telephone, email, date_inscription)
         VALUES (?, ?, ?, ?, NOW())`,
        [data.nom || '', data.prenom || '', data.telephone || '', data.email]
      );
      utilisateurId = userResult.insertId;
    }

    const crypto = require("crypto");

    // Générateur de flight_id basé sur (from, to, date)
    const generateFlightId = (seg) => {
      const key = `${seg.from_location || seg.from || ''}-${seg.to_location || seg.to || ''}-${seg.date ? seg.date.split(" ")[0] : ''}`;
      const hash = crypto.createHash("md5").update(key).digest("hex");
      return parseInt(hash.substring(0, 8), 16); // entier 32 bits
    };

    // 2️⃣ Fonction insertion réservation
    const insertReservation = async (seg, idx = 0, type = "oneway") => {
      const flightIdInt = generateFlightId(seg);

      // Calcul durée vol
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
        } catch {
          dureeVol = "02:00:00";
        }
      }

      const [resResult] = await db.promise().query(
        `INSERT INTO reservations 
        (utilisateur_id, vol_id, classe_id, statut, date_reservation,
         nom, email, adresse, ville, date_naissance, pays, passeport, expiration_passeport,
         place_selectionnee, airline_id, class_text, code_vol, 
         heure_depart, heure_arrivee, date_vol, aeroport_depart, aeroport_arrivee, duree_vol, types_de_vol, compagnie)
        VALUES (?, ?, ?, ?, NOW(),
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          utilisateurId,
          flightIdInt,
          seg.classe_id || 1,
          data.statut || 'Réservé',
          data.nom || '',
          data.email,
          data.adresse || '',
          data.ville || '',
          data.date_naissance || null,
          data.pays || '',
          data.passeport || '',
          data.expiration_passeport || null,
          seg.seat || '',
          seg.airline_id || 0,
          seg.class_text || 'Economy',
          seg.code ? seg.code.slice(0, 19) : `C${Date.now().toString().slice(-8)}${idx}`,
          seg.departure || "00:00:00",
          seg.arrival || "00:00:00",
          seg.date ? seg.date.split(" ")[0] : new Date().toISOString().split("T")[0],
          seg.from_location || seg.from || "N/A",
          seg.to_location || seg.to || "N/A",
          dureeVol,
          type,
          seg.airline || seg.compagnie || "Ituri Airline" // 👈 ajouté ici
        ]
      );

      return { reservationId: resResult.insertId, flightId: flightIdInt };
    };

    // 3️⃣ Insérer selon type de vol
    let insertedReservations = [];

    if (data.types_de_vol === "oneway") {
      insertedReservations.push(await insertReservation(data, 0, "oneway"));
    } else if (data.types_de_vol === "roundtrip") {
      insertedReservations.push(await insertReservation({
        ...data,
        from_location: data.from_location,
        to_location: data.to_location,
        departure: data.departure,
        arrival: data.arrival,
        date: data.date,
        code: `${data.code || "CODE"}-ALLER`
      }, 0, "roundtrip"));

      insertedReservations.push(await insertReservation({
        ...data,
        from_location: data.to_location,
        to_location: data.from_location,
        departure: data.departure_retour,
        arrival: data.arrival_retour,
        date: data.date_retour,
        code: `${data.code || "CODE"}-RETOUR`
      }, 1, "roundtrip"));
    } else if (data.types_de_vol === "multicity" && Array.isArray(data.segments)) {
      for (let i = 0; i < data.segments.length; i++) {
        const seg = {
          ...data.segments[i],
          from_location: data.segments[i].from || data.segments[i].from_location,
          to_location: data.segments[i].to || data.segments[i].to_location,
          departure: data.segments[i].departure,
          arrival: data.segments[i].arrival,
          date: data.segments[i].date,
          class_text: data.segments[i].class_text || "Economy",
          airline: data.segments[i].airline || "Non spécifié",
          seat: data.segments[i].seat || "",
          code: `${data.code || "CODE"}-SEG${i+1}`
        };
        insertedReservations.push(await insertReservation(seg, i, "multicity"));
      }
    }

    console.log("✅ Reservations insérées:", insertedReservations);

    // 4️⃣ Insertion dans cartbillets avec flightId unique
    const flightIdForCart = insertedReservations[0].flightId;
    const [cartResult] = await db.promise().query(
      `INSERT INTO cartbillets 
      (utilisateurs_id, flight_id, airline, departure, arrival, 
       from_location, to_location, price, date, class_text, code, 
       seat, payment_method, email, types_de_vol, created_at, compagnie)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(),?)`,
      [
        utilisateurId,
        flightIdForCart,
        data.airline || '',
        data.departure || null,
        data.arrival || null,
        data.from_location || '',
        data.to_location || '',
        data.price || 0,
        data.date ? data.date.split(' ')[0] : new Date().toISOString().split('T')[0],
        data.class_text || 'Economy',
        data.code,
        data.seat || '',
        data.payment_method || 'Carte',
        data.email,
        data.types_de_vol || '',
        data.compagnie ||  'Ituri Airline'
      ]
    );

    console.log('✅ CartBillet inséré ID:', cartResult.insertId);

    // 5️⃣ Génération PDF billet
    const fs = require("fs");
    const path = require("path");
    const PDFDocument = require("pdfkit");

    pdfPath = path.join(__dirname, 'temp', `billet-${data.code}-${Date.now()}.pdf`);
    if (!fs.existsSync(path.join(__dirname, 'temp'))) fs.mkdirSync(path.join(__dirname, 'temp'));

    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    doc.fontSize(20).text('Billet de Réservation - BookInPlane - Ituri Airline', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12)
      .text(`Passager: ${data.nom || ''} (${data.email})`)
      .text(`Paiement: ${data.payment_method || 'Carte'}`)
      .text(`Prix total: ${data.price || 0} ${data.currency || 'USD'}`)
      .moveDown();

    if (data.types_de_vol === "oneway") {
      doc.fontSize(14).text("✈️ Vol Aller", { underline: true });
      doc.fontSize(12)
        .text(`${data.from_location} → ${data.to_location}`)
        .text(`Départ: ${data.departure} le ${data.date}`)
        .text(`Arrivée: ${data.arrival}`);
    } else if (data.types_de_vol === "roundtrip") {
      doc.fontSize(14).text("✈️ Vol Aller", { underline: true });
      doc.text(`${data.from_location} → ${data.to_location}`)
        .text(`Départ: ${data.departure} le ${data.date}`)
        .text(`Arrivée: ${data.arrival}`);
      doc.moveDown();
      doc.fontSize(14).text("✈️ Vol Retour", { underline: true });
      doc.text(`${data.to_location} → ${data.from_location}`)
        .text(`Départ: ${data.departure_retour} le ${data.date_retour}`)
        .text(`Arrivée: ${data.arrival_retour}`);
    } else if (data.types_de_vol === "multicity" && Array.isArray(data.segments)) {
      doc.fontSize(14).text("✈️ Itinéraire Multi-City", { underline: true });
      data.segments.forEach((seg, idx) => {
        doc.moveDown();
        doc.text(`Segment ${idx + 1}`);
        doc.text(`${seg.from} → ${seg.to}`);
        doc.text(`Départ: ${seg.departure} le ${seg.date}`);
        doc.text(`Arrivée: ${seg.arrival}`);
      });
    }

    doc.end();
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    console.log('✅ PDF généré:', pdfPath);

    // 6️⃣ Envoi Email
    const nodemailer = require("nodemailer");

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER || "spencermimo@gmail.com",
        pass: process.env.SMTP_PASS || "ton_mot_de_passe_app"
      }
    });

    await transporter.verify();

    let emailContent = `
      <h2>Confirmation de votre réservation</h2>
      <p>Bonjour ${data.nom || "Cher Passager"},</p>
      <p>Votre réservation est confirmée.</p>
    `;

    if (data.types_de_vol === "oneway") {
      emailContent += `<p><b>${data.from_location} → ${data.to_location}</b><br/>Départ: ${data.departure} le ${data.date}<br/>Arrivée: ${data.arrival}</p>`;
    } else if (data.types_de_vol === "roundtrip") {
      emailContent += `<h3>Vol Aller</h3><p>${data.from_location} → ${data.to_location}<br/>Départ: ${data.departure} le ${data.date}<br/>Arrivée: ${data.arrival}</p>`;
      emailContent += `<h3>Vol Retour</h3><p>${data.to_location} → ${data.from_location}<br/>Départ: ${data.departure_retour} le ${data.date_retour}<br/>Arrivée: ${data.arrival_retour}</p>`;
    } else if (data.types_de_vol === "multicity" && Array.isArray(data.segments)) {
      emailContent += `<h3>Itinéraire Multi-City</h3>`;
      data.segments.forEach((seg, index) => {
        emailContent += `<p><b>Segment ${index+1}</b><br/>${seg.from} → ${seg.to}<br/>Départ: ${seg.departure} le ${seg.date}<br/>Arrivée: ${seg.arrival}</p>`;
      });
    }

    emailContent += `<p>Votre billet est en pièce jointe.</p>`;

    const info = await transporter.sendMail({
      from: `"BookInPlane" <${process.env.SMTP_USER || "spencermimo@gmail.com"}>`,
      to: data.email,
      subject: "Votre billet de voyage BookInPlane",
      html: emailContent,
      attachments: [{ filename: `billet-${data.code}.pdf`, path: pdfPath }]
    });

    console.log("✅ Email envoyé ID:", info.messageId);

    try { fs.unlinkSync(pdfPath); } catch {}

    res.status(200).json({
      message: "Réservation(s) + panier sauvegardés, billet envoyé par email",
      utilisateurId,
      reservations: insertedReservations,
      cartId: cartResult.insertId
    });

  } catch (err) {
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
  console.log('📥 Requête reçue sur /add');
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Vérification DB
    if (!db) {
      console.error('❌ DB non connectée');
      return res.status(500).json({ error: "Base de données non connectée" });
    }

    const {
      nom,
      prenom,
      telephone,
      email
    } = req.body;

    // ✅ Vérification des champs obligatoires
    if (!nom || !email) {
      return res.status(400).json({
        error: "Nom et email sont obligatoires",
      });
    }

    // Helper query avec logging
    const query = (sql, params) =>
      new Promise((resolve, reject) => {
        console.log('🔍 Exécution SQL:', sql);
        console.log('📋 Params:', params);
        
        db.query(sql, params, (err, results) => {
          if (err) {
            console.error('❌ Erreur SQL:', err);
            reject(err);
          } else {
            console.log('✅ Résultat SQL:', results);
            resolve(results);
          }
        });
      });

    // ✅ Insertion utilisateur avec ON DUPLICATE KEY UPDATE
    console.log('👤 Insertion utilisateur...');
    const insertUser = await query(
      `INSERT INTO utilisateurs (nom, prenom, telephone, email, date_inscription) 
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE 
         nom = VALUES(nom),
         prenom = VALUES(prenom),
         telephone = VALUES(telephone)`,
      [nom || null, prenom || null, telephone || null, email.trim()]
    );

    let utilisateur_id;

    // Gestion de l'ID utilisateur
    if (insertUser.insertId && insertUser.insertId > 0) {
      // Nouvel utilisateur créé
      utilisateur_id = insertUser.insertId;
      console.log('✅ Nouvel utilisateur créé, ID:', utilisateur_id);
    } else {
      // Utilisateur existant mis à jour - on doit récupérer l'ID
      const existingUser = await query(
        "SELECT id FROM utilisateurs WHERE email = ?", 
        [email.trim()]
      );
      
      if (existingUser.length > 0) {
        utilisateur_id = existingUser[0].id;
        console.log('✅ Utilisateur existant mis à jour, ID:', utilisateur_id);
      } else {
        // Cas d'erreur improbable
        console.error('❌ Impossible de récupérer l\'ID utilisateur');
        return res.status(500).json({
          error: "Erreur lors de la récupération de l'utilisateur",
        });
      }
    }

    // ✅ Réponse succès
    console.log('✅ Utilisateur traité avec succès');
    res.json({
      message: "Utilisateur enregistré/mis à jour avec succès ✅",
      email: email.trim(),
      utilisateur_id: utilisateur_id,
      action: insertUser.insertId > 0 ? "créé" : "mis à jour"
    });

  } catch (err) {
    console.error("❌ Erreur serveur:", err);
    res.status(500).json({
      error: "Erreur serveur",
      details: err.sqlMessage || err.message,
      code: err.code
    });
  }
});

/*
app.post('/add', async (req, res) => {
  console.log('📥 Requête reçue sur /add');
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Vérification DB
    if (!db) {
      console.error('❌ DB non connectée');
      return res.status(500).json({ error: "Base de données non connectée" });
    }

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
      vols = [],
    } = req.body;

    // ✅ Vérification plus détaillée
    if (!nom || !email) {
      return res.status(400).json({
        error: "Nom et email sont obligatoires",
      });
    }

    if (!Array.isArray(vols) || vols.length === 0) {
      return res.status(400).json({
        error: "Au moins un vol est requis",
      });
    }

    // Helper query avec logging
    const query = (sql, params) =>
      new Promise((resolve, reject) => {
        console.log('🔍 Exécution SQL:', sql.substring(0, 100) + '...');
        console.log('📋 Params:', params);
        
        db.query(sql, params, (err, results) => {
          if (err) {
            console.error('❌ Erreur SQL:', err);
            reject(err);
          } else {
            console.log('✅ Résultat SQL:', results);
            resolve(results);
          }
        });
      });

    // Formatage dates (votre code existant)
    const formatDate = (d) => {
      if (!d) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d)) {
        const [j, m, a] = d.split('/');
        return `${a}-${m.padStart(2, '0')}-${j.padStart(2, '0')}`;
      }
      const parsed = new Date(d);
      return isNaN(parsed) ? null : parsed.toISOString().split('T')[0];
    };

    const formatTime = (t) => {
      if (!t) return null;
      if (/^\d{1,2}:\d{2}:\d{2}$/.test(t)) return t;
      if (/^\d{1,2}:\d{2}$/.test(t)) return t + ':00';
      return null;
    };

    const dateNaissanceFormatted = formatDate(date_naissance);
    const expirationPasseportFormatted = formatDate(expiration_passeport);

    // ✅ 1. Insertion utilisateur
    console.log('👤 Insertion utilisateur...');
    const insertUser = await query(
      `INSERT INTO utilisateurs (nom, prenom, telephone, email, date_inscription) 
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE 
         nom = VALUES(nom),
         prenom = VALUES(prenom),
         telephone = VALUES(telephone)`,
      [nom || null, prenom || null, telephone || null, email.trim()]
    );

    let utilisateur_id;
    if (insertUser.insertId && insertUser.insertId > 0) {
      utilisateur_id = insertUser.insertId;
      console.log('✅ Nouvel utilisateur ID:', utilisateur_id);
    } else {
      const existing = await query("SELECT id FROM utilisateurs WHERE email = ?", [email.trim()]);
      utilisateur_id = existing[0]?.id;
      console.log('✅ Utilisateur existant ID:', utilisateur_id);
    }

    if (!utilisateur_id) {
      return res.status(500).json({
        error: "Impossible de récupérer ou créer l'utilisateur",
      });
    }

    // ✅ 2. Insertion des réservations
    console.log('🎫 Insertion des réservations...');
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
        time,
      } = vol;

      if (!vol_id || !classe_id) {
        console.warn('⚠️ Vol ignoré - vol_id ou classe_id manquant:', vol);
        continue;
      }

      const values = [
        utilisateur_id,
        vol_id,
        classe_id,
        nom,
        email.trim(),
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
        formatTime(time),
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
          statut
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Réservé')
      `;

      await query(sqlReservation, values);
      console.log('✅ Réservation créée pour le vol:', vol_id);
    }

    // ✅ Réponse succès
    console.log('✅ Toutes les réservations créées avec succès');
    res.json({
      message: "Réservations enregistrées avec succès ✅",
      email,
      utilisateur_id,
      total_vols: vols.length,
    });

  } catch (err) {
    console.error("❌ Erreur serveur:", err);
    res.status(500).json({
      error: "Erreur serveur",
      details: err.sqlMessage || err.message,
      code: err.code
    });
  }
});
*/






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
