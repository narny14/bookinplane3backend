WITH RECURSIVE dates AS (
    SELECT DATE('2025-09-10') AS jour
    UNION ALL
    SELECT DATE_ADD(jour, INTERVAL 1 DAY)
    FROM dates
    WHERE jour < '2025-09-30'
)
-- Bloc Aller
SELECT 
    'Aller' AS segment,
    d.ville AS ville_depart,
    a.ville AS ville_arrivee,
    ROUND(
        (6371 * ACOS(
            COS(RADIANS(d.latitude)) * COS(RADIANS(a.latitude)) *
            COS(RADIANS(a.longitude) - RADIANS(d.longitude)) +
            SIN(RADIANS(d.latitude)) * SIN(RADIANS(a.latitude))
        )) * p.prix_km_economy
    , 2) AS prix_economy,
    ROUND(
        (6371 * ACOS(
            COS(RADIANS(d.latitude)) * COS(RADIANS(a.latitude)) *
            COS(RADIANS(a.longitude) - RADIANS(d.longitude)) +
            SIN(RADIANS(d.latitude)) * SIN(RADIANS(a.latitude))
        )) * p.prix_km_first_class
    , 2) AS prix_first_class,
    ROUND(
        (6371 * ACOS(
            COS(RADIANS(d.latitude)) * COS(RADIANS(a.latitude)) *
            COS(RADIANS(a.longitude) - RADIANS(d.longitude)) +
            SIN(RADIANS(d.latitude)) * SIN(RADIANS(a.latitude))
        )) * p.prix_km_vip
    , 2) AS prix_vip,
    dates.jour AS date_depart
FROM aeroports d
JOIN aeroports a ON d.ville = 'Kinshasa' AND a.ville = 'Lubumbashi'
JOIN prix p ON 1=1
JOIN dates ON 1=1

UNION ALL

-- Bloc Retour
SELECT 
    'Retour' AS segment,
    d.ville AS ville_depart,
    a.ville AS ville_arrivee,
    ROUND(
        (6371 * ACOS(
            COS(RADIANS(d.latitude)) * COS(RADIANS(a.latitude)) *
            COS(RADIANS(a.longitude) - RADIANS(d.longitude)) +
            SIN(RADIANS(d.latitude)) * SIN(RADIANS(a.latitude))
        )) * p.prix_km_economy
    , 2) AS prix_economy,
    ROUND(
        (6371 * ACOS(
            COS(RADIANS(d.latitude)) * COS(RADIANS(a.latitude)) *
            COS(RADIANS(a.longitude) - RADIANS(d.longitude)) +
            SIN(RADIANS(d.latitude)) * SIN(RADIANS(a.latitude))
        )) * p.prix_km_first_class
    , 2) AS prix_first_class,
    ROUND(
        (6371 * ACOS(
            COS(RADIANS(d.latitude)) * COS(RADIANS(a.latitude)) *
            COS(RADIANS(a.longitude) - RADIANS(d.longitude)) +
            SIN(RADIANS(d.latitude)) * SIN(RADIANS(a.latitude))
        )) * p.prix_km_vip
    , 2) AS prix_vip,
    dates.jour AS date_depart
FROM aeroports d
JOIN aeroports a ON d.ville = 'Lubumbashi' AND a.ville = 'Kinshasa'
JOIN prix p ON 1=1
JOIN dates ON 1=1

ORDER BY segment, date_depart;
