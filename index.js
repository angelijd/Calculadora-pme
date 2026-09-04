const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());

// Servir arquivos estaticos
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// Rotas de API
app.get('/api/config', require('./api/config'));
app.get('/api/health', require('./api/health'));
app.post('/api/salvar-bigquery', require('./api/salvar-bigquery'));

// Rota raiz e fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log('Calculadora PME rodando na porta ' + PORT);
  });
}

module.exports = app;
