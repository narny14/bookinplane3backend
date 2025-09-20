UPDATE aeroports
SET pays = 'RDC'
WHERE pays = '' OR pays IS NULL;
