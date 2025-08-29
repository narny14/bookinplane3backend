CREATE TABLE tarifs_vol (
    id INT NOT NULL  AUTO_INCREMENT,
    vol_id INT,
    classe_id INT,
    prix DECIMAL(10,2),
    devise VARCHAR(10),
    places_disponibles INT,
    PRIMARY KEY (id),
    FOREIGN KEY (vol_id) REFERENCES vols(id),
    FOREIGN KEY (classe_id) REFERENCES classes_voyage(id)
);

