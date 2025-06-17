<?php
// Connexion à la base de données Railway
$host = 'yamabiko.proxy.rlwy.net';
$port = 51719;
$user = 'root';
$pass = 'ebRRVBYJQXgnBSLYyqctgCFUfXAgUBWp';
$dbname = 'railway';

// Connexion MySQLi
$conn = new mysqli($host, $user, $pass, $dbname, $port);

// Vérifier la connexion
if ($conn->connect_error) {
    die("Échec de la connexion : " . $conn->connect_error);
}

// Charger le contenu du fichier SQL
$sql_file = 'insertion_vols_et_tarifs.sql';
if (!file_exists($sql_file)) {
    die("Le fichier $sql_file est introuvable.");
}

$sql = file_get_contents($sql_file);

// Modifier les "INSERT INTO" en "INSERT IGNORE INTO"
$sql = str_replace('INSERT INTO', 'INSERT IGNORE INTO', $sql);

// Exécuter toutes les requêtes (en les séparant)
$queries = array_filter(array_map('trim', explode(';', $sql)));

$executed = 0;
foreach ($queries as $query) {
    if (!empty($query)) {
        if ($conn->query($query)) {
            $executed++;
        } else {
            echo "Erreur dans la requête : " . $conn->error . "<br>";
        }
    }
}

$conn->close();

echo "Import terminé. Requêtes exécutées : $executed.";
?>
