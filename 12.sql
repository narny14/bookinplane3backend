

UPDATE aeroports a
JOIN villes v ON a.ville = v.name
SET a.latitude = v.latitude_deg,
    a.longitude = v.longitude_deg;