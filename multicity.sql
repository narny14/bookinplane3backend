WITH RECURSIVE dates AS (
    SELECT DATE('2025-09-10') AS jour
    UNION ALL
    SELECT DATE_ADD(jour, INTERVAL 1 DAY)
    FROM dates
    WHERE jour < '2025-09-30'
),
-- Définition de l'itinéraire multicity (jusqu'à 10 villes)
itineraire AS (
    SELECT 1 AS ordre, 'Kinshasa' AS ville_depart, 'Lubumbashi' AS ville_arrivee
    UNION ALL SELECT 2, 'Lubumbashi', 'Goma'
    UNION ALL SELECT 3, 'Goma', 'Kisangani'
    UNION ALL SELECT 4, 'Kisangani', 'Mbuji-Mayi'
    UNION ALL SELECT 5, 'Mbuji-Mayi', 'Kananga'
    UNION ALL SELECT 6, 'Kananga', 'Bukavu'
    UNION ALL SELECT 7, 'Bukavu', 'Kolwezi'
    UNION ALL SELECT 8, 'Kolwezi', 'Matadi'
    UNION ALL SELECT 9, 'Matadi', 'Kindu'
    UNION ALL SELECT 10, 'Kindu', 'Kinshasa'
)
SELECT 
    i.ordre,
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
FROM itineraire i
JOIN aeroports d ON d.ville = i.ville_depart
JOIN aeroports a ON a.ville = i.ville_arrivee
JOIN prix p ON 1=1
JOIN dates ON 1=1
ORDER BY dates.jour, i.ordre;
