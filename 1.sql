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