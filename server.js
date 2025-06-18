const express = require('express');
const app = express();

const importRoute = require('./import');
app.use('/import', importRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur le port ${PORT}`);
});
