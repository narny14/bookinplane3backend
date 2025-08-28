-- Vérifier les vols entre Kinshasa (id:1) et Lubumbashi (id:2) pour le 1er septembre 2025
SELECT v.*, 
       a1.ville AS depart_ville, 
       a2.ville AS arrivee_ville,
       t.prix, t.devise, t.places_disponibles, 
       c.nom AS classe
FROM vols v
JOIN aeroports a1 ON v.depart_id = a1.id
JOIN aeroports a2 ON v.arrivee_id = a2.id
JOIN tarifs_vol t ON v.id = t.vol_id
JOIN classes_voyage c ON t.classe_id = c.id
WHERE v.depart_id = 1
  AND v.arrivee_id = 2
  AND DATE(v.date_depart) = '2025-09-01'
  AND v.disponible = 1
ORDER BY v.date_depart, c.id;