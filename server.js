const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const fs = require('fs');

// Criação automática da pasta de salvamento local no disco
const PASTA_SALVAMENTO = path.join(__dirname, 'dados_salvos');
if (!fs.existsSync(PASTA_SALVAMENTO)) {
  fs.mkdirSync(PASTA_SALVAMENTO, { recursive: true });
  console.log(`Pasta de salvamento criada automaticamente em: ${PASTA_SALVAMENTO}`);
}

// Endpoint de verificação de saúde (Railway)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Configuração do status de integração (BigQuery)
app.get('/api/config', (req, res) => {
  const hasBigQuery = !!(process.env.GOOGLE_PROJECT_ID && process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
  res.json({
    bigqueryConfigured: hasBigQuery,
    projectId: process.env.GOOGLE_PROJECT_ID || ''
  });
});

// Endpoint de salvamento no Google BigQuery
app.post('/api/salvar-bigquery', require('./api/salvar-bigquery'));

// Salvar dados automaticamente no disco local (cria arquivos JSON na pasta dados_salvos)
app.post('/api/salvar-disco', (req, res) => {
  try {
    const dados = req.body;
    const nomeCliente = (dados.cliente && dados.cliente.nome) 
      ? dados.cliente.nome.trim().replace(/[^a-zA-Z0-9_-]/g, '_') 
      : 'sem_nome';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const nomeArquivo = `${nomeCliente}_${timestamp}.json`;
    const caminhoCompleto = path.join(PASTA_SALVAMENTO, nomeArquivo);

    fs.writeFileSync(caminhoCompleto, JSON.stringify(dados, null, 2), 'utf8');
    fs.writeFileSync(path.join(PASTA_SALVAMENTO, 'ultimo_salvamento.json'), JSON.stringify(dados, null, 2), 'utf8');

    res.json({ sucesso: true, arquivo: nomeArquivo, pasta: PASTA_SALVAMENTO });
  } catch (err) {
    console.error('Erro ao salvar no disco:', err);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// Carregar último salvamento do disco local
app.get('/api/carregar-disco', (req, res) => {
  try {
    const caminhoUltimo = path.join(PASTA_SALVAMENTO, 'ultimo_salvamento.json');
    if (fs.existsSync(caminhoUltimo)) {
      const conteudo = JSON.parse(fs.readFileSync(caminhoUltimo, 'utf8'));
      return res.json({ sucesso: true, dados: conteudo });
    }
    res.json({ sucesso: false, motivo: 'Nenhum salvamento encontrado' });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// Listar arquivos salvos na pasta
app.get('/api/listar-salvamentos', (req, res) => {
  try {
    const arquivos = fs.readdirSync(PASTA_SALVAMENTO).filter(f => f.endsWith('.json'));
    res.json({ sucesso: true, pasta: PASTA_SALVAMENTO, arquivos });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// Rota de fallback para a aplicação
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Calculadora MEI rodando na porta ${PORT}`);
});
