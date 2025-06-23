ALTER TABLE reservations
ADD COLUMN airline_id INT,
ADD COLUMN class_text VARCHAR(50),
ADD COLUMN code_vol VARCHAR(50),
ADD COLUMN heure_depart VARCHAR(20),
ADD COLUMN heure_arrivee VARCHAR(20),
ADD COLUMN date_vol DATE,
ADD COLUMN aeroport_depart VARCHAR(255),
ADD COLUMN aeroport_arrivee VARCHAR(255),
ADD COLUMN duree_vol VARCHAR(50),
ADD COLUMN prix DECIMAL(10,2),
ADD COLUMN place_selectionnee VARCHAR(10),
ADD COLUMN gates VARCHAR(20);
