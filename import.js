const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send("✅ La route /import fonctionne !");
});

module.exports = router;
