WITH RECURSIVE dates AS (
    SELECT DATE('2025-09-10') AS jour
    UNION ALL
    SELECT DATE_ADD(jour, INTERVAL 1 DAY)
    FROM dates
    WHERE jour <= '2025-09-30'
),
segments AS (
    -- Aller
    SELECT 1 AS ordre, 'Kinshasa' AS ville_depart, 'Lubumbashi' AS ville_arrivee, 'aller' AS direction, 1 AS direction_order
    UNION ALL
    -- Retour
    SELECT 2 AS ordre, 'Lubumbashi' AS ville_depart, 'Kinshasa' AS ville_arrivee, 'retour' AS direction, 2 AS direction_order
)
SELECT 
    d.jour AS date_depart,
    s.direction,
    'roundtrip' AS type_voyage,
    s.ville_depart,
    s.ville_arrivee,
    ROUND(
        (6371 * ACOS(
            COS(RADIANS(dep.latitude)) * COS(RADIANS(arr.latitude)) *
            COS(RADIANS(arr.longitude) - RADIANS(dep.longitude)) +
            SIN(RADIANS(dep.latitude)) * SIN(RADIANS(arr.latitude))
        )) * p.prix_km_economy, 2
    ) AS prix_economy,
    ROUND(
        (6371 * ACOS(
            COS(RADIANS(dep.latitude)) * COS(RADIANS(arr.latitude)) *
            COS(RADIANS(arr.longitude) - RADIANS(dep.longitude)) +
            SIN(RADIANS(dep.latitude)) * SIN(RADIANS(arr.latitude))
        )) * p.prix_km_first_class, 2
    ) AS prix_first_class,
    ROUND(
        (6371 * ACOS(
            COS(RADIANS(dep.latitude)) * COS(RADIANS(arr.latitude)) *
            COS(RADIANS(arr.longitude) - RADIANS(dep.longitude)) +
            SIN(RADIANS(dep.latitude)) * SIN(RADIANS(arr.latitude))
        )) * p.prix_km_vip, 2
    ) AS prix_vip
FROM dates d
CROSS JOIN segments s
JOIN aeroports dep ON dep.ville = s.ville_depart
JOIN aeroports arr ON arr.ville = s.ville_arrivee
JOIN prix p ON 1=1
ORDER BY d.jour, s.direction_order, s.ordre;
