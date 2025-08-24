CREATE TABLE utilisateurs (
    id INT NOT NULL,
    nom VARCHAR(100),
    prenom VARCHAR(100),
    telephone VARCHAR(20),
    email VARCHAR(100) UNIQUE,
    date_inscription DATETIME,
    PRIMARY KEY (id)
);


CREATE TABLE vols (
    id INT NOT NULL,
    numero_vol VARCHAR(20) UNIQUE,
    avion_id INT,
    depart_id INT,
    arrivee_id INT,
    date_depart DATETIME,
    date_arrivee DATETIME,
    disponible TINYINT(1),
    PRIMARY KEY (id),
    FOREIGN KEY (avion_id) REFERENCES avions(id),
    FOREIGN KEY (depart_id) REFERENCES aeroports(id),
    FOREIGN KEY (arrivee_id) REFERENCES aeroports(id)
);


CREATE TABLE tarifs_vol (
    id INT NOT NULL,
    vol_id INT,
    classe_id INT,
    prix DECIMAL(10,2),
    devise VARCHAR(10),
    places_disponibles INT,
    PRIMARY KEY (id),
    FOREIGN KEY (vol_id) REFERENCES vols(id),
    FOREIGN KEY (classe_id) REFERENCES classes_voyage(id)
);


CREATE TABLE poids_bagages (
    id INT NOT NULL,
    reservation_id INT,
    poids_kg DECIMAL(5,2),
    autorise_kg DECIMAL(5,2),
    PRIMARY KEY (id),
    FOREIGN KEY (reservation_id) REFERENCES reservations(id)
);


CREATE TABLE passagers (
    id INT NOT NULL,
    reservation_id INT,
    nom VARCHAR(100),
    prenom VARCHAR(100),
    date_naissance DATE,
    passeport VARCHAR(50),
    PRIMARY KEY (id),
    FOREIGN KEY (reservation_id) REFERENCES reservations(id)
);


CREATE TABLE classes_voyage (
    id INT NOT NULL,
    nom VARCHAR(50),
    description TEXT,
    PRIMARY KEY (id)
);


CREATE TABLE cartbillets (
    id INT NOT NULL,
    utilisateurs_id INT,
    flight_id INT,
    airline VARCHAR(100),
    departure DATETIME,
    arrival DATETIME,
    from_location VARCHAR(100),
    to_location VARCHAR(100),
    price DECIMAL(10, 2),
    date DATE,
    class_text VARCHAR(50),
    code VARCHAR(50),
    seat VARCHAR(10),
    payment_method VARCHAR(50),
    email VARCHAR(100),
    created_at TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (utilisateurs_id) REFERENCES utilisateurs(id),
    FOREIGN KEY (flight_id) REFERENCES vols(id)
);


CREATE TABLE avions (
    id INT NOT NULL,
    numero_avion VARCHAR(20) UNIQUE,
    modele VARCHAR(100),
    capacite_total INT,
    PRIMARY KEY (id)
);


CREATE TABLE aeroports (
    id INT NOT NULL,
    nom VARCHAR(100),
    code_iata VARCHAR(10),
    ville VARCHAR(100),
    pays VARCHAR(50),
    PRIMARY KEY (id)
);


CREATE TABLE reservations (
    id INT NOT NULL,
    utilisateur_id INT,
    vol_id INT,
    classe_id INT,
    statut ENUM('Réservé', 'Payé', 'Annulé'),
    date_reservation DATETIME,
    nom VARCHAR(100),
    email VARCHAR(100),
    adresse VARCHAR(150),
    ville VARCHAR(100),
    date_naissance DATE,
    pays VARCHAR(100),
    passeport VARCHAR(50),
    expiration_passeport DATE,
    place_selectionnee VARCHAR(10),
    airline_id INT,
    class_text VARCHAR(50),
    code_vol VARCHAR(20),
    heure_depart TIME,
    heure_arrivee TIME,
    date_vol DATE,
    aeroport_depart VARCHAR(100),
    aeroport_arrivee VARCHAR(100),
    duree_vol TIME,
    PRIMARY KEY (id)
);


