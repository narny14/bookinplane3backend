-- Lot 1: Vols 1-100
INSERT INTO tarifs_vol (vol_id, classe_id, prix, devise, places_disponibles)
SELECT 
    v.id as vol_id,
    cv.id as classe_id,
    CASE 
        WHEN cv.id = 2 THEN 120.00 * (0.8 + RAND() * 0.4) -- Economy
        WHEN cv.id = 1 THEN 280.00 * (0.8 + RAND() * 0.4) -- Business
        WHEN cv.id = 3 THEN 550.00 * (0.8 + RAND() * 0.4) -- VIP
        ELSE 0
    END as prix,
    'USD' as devise,
    CASE 
        WHEN cv.id = 2 THEN FLOOR(120 + RAND() * 60)  -- Economy
        WHEN cv.id = 1 THEN FLOOR(30 + RAND() * 20)   -- Business
        WHEN cv.id = 3 THEN FLOOR(12 + RAND() * 8)    -- VIP
        ELSE 0
    END as places_disponibles
FROM (
    SELECT id FROM vols ORDER BY id LIMIT 100 OFFSET 0
) v
CROSS JOIN classes_voyage cv;

-- Lot 2: Vols 101-200 (si nécessaire)
INSERT INTO tarifs_vol (vol_id, classe_id, prix, devise, places_disponibles)
SELECT 
    v.id as vol_id,
    cv.id as classe_id,
    CASE 
        WHEN cv.id = 2 THEN 120.00 * (0.8 + RAND() * 0.4) -- Economy
        WHEN cv.id = 1 THEN 280.00 * (0.8 + RAND() * 0.4) -- Business
        WHEN cv.id = 3 THEN 550.00 * (0.8 + RAND() * 0.4) -- VIP
        ELSE 0
    END as prix,
    'USD' as devise,
    CASE 
        WHEN cv.id = 2 THEN FLOOR(120 + RAND() * 60)  -- Economy
        WHEN cv.id = 1 THEN FLOOR(30 + RAND() * 20)   -- Business
        WHEN cv.id = 3 THEN FLOOR(12 + RAND() * 8)    -- VIP
        ELSE 0
    END as places_disponibles
FROM (
    SELECT id FROM vols ORDER BY id LIMIT 100 OFFSET 100
) v
CROSS JOIN classes_voyage cv;

-- Continuer avec les lots suivants si nécessaire...