-- Désactiver les contraintes de clé étrangère temporairement
SET FOREIGN_KEY_CHECKS = 0;

-- Variables pour le calcul des dates et heures
SET @date_debut = '2025-09-01';
SET @date_fin = '2025-09-05';
SET @vol_counter = 1;

-- Insertion des vols aller (de chaque ville vers toutes les autres)
INSERT INTO vols (numero_vol, avion_id, depart_id, arrivee_id, date_depart, date_arrivee, disponible)
SELECT 
    CONCAT('CD', 
           LPAD((@row_number := @row_number + 1), 6, '0'), 
           '-', 
           DATE_FORMAT(dates.date_jour, '%d%m')) as numero_vol,
    FLOOR(1 + RAND() * 50) as avion_id,
    pa.depart_id,
    pa.arrivee_id,
    TIMESTAMP(dates.date_jour, 
              MAKETIME(FLOOR(6 + RAND() * 18), 
                       FLOOR(RAND() * 60), 
                       0)) as date_depart,
    TIMESTAMP(dates.date_jour, 
              MAKETIME(FLOOR(6 + RAND() * 18) + 
                       FLOOR(1 + RAND() * 4), 
                       FLOOR(RAND() * 60), 
                       0)) as date_arrivee,
    1 as disponible
FROM 
    (SELECT a1.id as depart_id, a2.id as arrivee_id
     FROM aeroports a1
     CROSS JOIN aeroports a2 
     WHERE a1.id != a2.id) pa
CROSS JOIN
    (SELECT DATE_ADD(@date_debut, INTERVAL (t4*1000 + t3*100 + t2*10 + t1) DAY) as date_jour
     FROM
        (SELECT 0 t1 UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) t1,
        (SELECT 0 t2 UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) t2,
        (SELECT 0 t3 UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) t3,
        (SELECT 0 t4 UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) t4
     WHERE DATE_ADD(@date_debut, INTERVAL (t4*1000 + t3*100 + t2*10 + t1) DAY) <= @date_fin) dates
CROSS JOIN
    (SELECT @row_number := 0) r
ORDER BY pa.depart_id, pa.arrivee_id, dates.date_jour;

-- Insertion des vols retour (de chaque ville vers toutes les autres, dans le sens inverse)
INSERT INTO vols (numero_vol, avion_id, depart_id, arrivee_id, date_depart, date_arrivee, disponible)
SELECT 
    CONCAT('CD', 
           LPAD((@row_number := @row_number + 1), 6, '0'), 
           '-', 
           DATE_FORMAT(dates.date_jour, '%d%m')) as numero_vol,
    FLOOR(1 + RAND() * 50) as avion_id,
    pa.depart_id,
    pa.arrivee_id,
    TIMESTAMP(dates.date_jour, 
              MAKETIME(FLOOR(6 + RAND() * 18), 
                       FLOOR(RAND() * 60), 
                       0)) as date_depart,
    TIMESTAMP(dates.date_jour, 
              MAKETIME(FLOOR(6 + RAND() * 18) + 
                       FLOOR(1 + RAND() * 4), 
                       FLOOR(RAND() * 60), 
                       0)) as date_arrivee,
    1 as disponible
FROM 
    (SELECT a2.id as depart_id, a1.id as arrivee_id
     FROM aeroports a1
     CROSS JOIN aeroports a2 
     WHERE a1.id != a2.id) pa
CROSS JOIN
    (SELECT DATE_ADD(@date_debut, INTERVAL (t4*1000 + t3*100 + t2*10 + t1) DAY) as date_jour
     FROM
        (SELECT 0 t1 UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) t1,
        (SELECT 0 t2 UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) t2,
        (SELECT 0 t3 UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) t3,
        (SELECT 0 t4 UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) t4
     WHERE DATE_ADD(@date_debut, INTERVAL (t4*1000 + t3*100 + t2*10 + t1) DAY) <= @date_fin) dates
CROSS JOIN
    (SELECT @row_number := (SELECT COUNT(*) FROM vols)) r
ORDER BY pa.depart_id, pa.arrivee_id, dates.date_jour;

-- Réactiver les contraintes de clé étrangère
SET FOREIGN_KEY_CHECKS = 1;