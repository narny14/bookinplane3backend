WITH RECURSIVE dates AS (
    SELECT DATE('2025-09-10') AS jour
    UNION ALL
    SELECT DATE_ADD(jour, INTERVAL 1 DAY)
    FROM dates
    WHERE jour <= '2025-09-30'
),
segments AS (
    SELECT 1 AS ordre, 'Kinshasa' AS ville_depart, 'Lubumbashi' AS ville_arrivee
    UNION ALL
    SELECT 2, 'Lubumbashi', 'Goma'
    UNION ALL
    SELECT 3, 'Goma', 'Kisangani'
)
SELECT 
    s.ordre,
    'multicity' AS type_voyage,
    d.ville AS ville_depart,
    a.ville AS ville_arrivee,
    ROUND(6371 * ACOS(
            COS(RADIANS(d.latitude)) * COS(RADIANS(a.latitude)) *
            COS(RADIANS(a.longitude) - RADIANS(d.longitude)) +
            SIN(RADIANS(d.latitude)) * SIN(RADIANS(a.latitude))
        ) * p.prix_km_economy, 2) AS prix_economy,
    ROUND(6371 * ACOS(
            COS(RADIANS(d.latitude)) * COS(RADIANS(a.latitude)) *
            COS(RADIANS(a.longitude) - RADIANS(d.longitude)) +
            SIN(RADIANS(d.latitude)) * SIN(RADIANS(a.latitude))
        ) * p.prix_km_first_class, 2) AS prix_first_class,
    ROUND(6371 * ACOS(
            COS(RADIANS(d.latitude)) * COS(RADIANS(a.latitude)) *
            COS(RADIANS(a.longitude) - RADIANS(d.longitude)) +
            SIN(RADIANS(d.latitude)) * SIN(RADIANS(a.latitude))
        ) * p.prix_km_vip, 2) AS prix_vip,
    dates.jour AS date_depart
FROM segments s
JOIN aeroports d ON d.ville = s.ville_depart
JOIN aeroports a ON a.ville = s.ville_arrivee
JOIN prix p ON 1=1
JOIN dates ON 1=1
ORDER BY dates.jour, s.ordre;
