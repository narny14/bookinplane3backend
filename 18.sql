-- 1. Désactiver temporairement les contraintes
SET FOREIGN_KEY_CHECKS = 0;

-- 2. Vérifier la structure actuelle de cartbillets
DESCRIBE cartbillets;

-- 3. Si la colonne utilisateur_id n'existe pas, l'ajouter
ALTER TABLE cartbillets 
ADD COLUMN utilisateur_id INT AFTER id;

-- 4. Ajouter la contrainte de clé étrangère
ALTER TABLE cartbillets 
ADD CONSTRAINT fk_cartbillets_utilisateur
FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id)
ON DELETE CASCADE;

-- 5. Réactiver les contraintes
SET FOREIGN_KEY_CHECKS = 1;

-- 6. Vérifier la nouvelle structure
DESCRIBE cartbillets;