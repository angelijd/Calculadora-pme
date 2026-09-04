const { BigQuery } = require('@google-cloud/bigquery');
const fs = require('fs');
const path = require('path');

function getBigQueryClient() {
  // 1. Arquivo local service-account.json
  const localKeyPath = path.join(__dirname, '..', 'service-account.json');
  if (fs.existsSync(localKeyPath)) {
    return new BigQuery({
      projectId: 'calculadora-pme',
      keyFilename: localKeyPath
    });
  }

  // 2. Variável de ambiente com o JSON completo (Recomendado para Vercel)
  if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
    try {
      const creds = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY);
      return new BigQuery({
        projectId: creds.project_id || 'calculadora-pme',
        credentials: {
          client_email: creds.client_email,
          private_key: creds.private_key
        }
      });
    } catch (e) {
      console.error('Erro ao parsear GCP_SERVICE_ACCOUNT_KEY:', e);
    }
  }

  // 3. Variáveis individuais
  if (process.env.GOOGLE_PROJECT_ID && process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    let pk = process.env.GOOGLE_PRIVATE_KEY;
    if (pk.includes('\\n')) pk = pk.replace(/\\n/g, '\n');
    return new BigQuery({
      projectId: process.env.GOOGLE_PROJECT_ID,
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: pk
      }
    });
  }

  return null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ sucesso: false, erro: 'Método não permitido. Use POST.' });
  }

  try {
    const datasetId = process.env.BIGQUERY_DATASET || 'calculadora_pme';
    const tableId = process.env.BIGQUERY_TABLE || 'simulacoes';
    const bigquery = getBigQueryClient();

    if (!bigquery) {
      return res.status(400).json({
        sucesso: false,
        motivo: 'Credenciais do BigQuery não encontradas (service-account.json ou GCP_SERVICE_ACCOUNT_KEY).'
      });
    }

    const dados = req.body || {};
    const fatAtual = parseFloat(dados.faturamentoMensal) || 0;
    const despAtual = parseFloat(dados.despesasAtuais) || 0;
    const row = {
      id: 'sim_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      cliente_nome: dados.nome || '',
      cliente_email: dados.email || '',
      alvo_mensal: parseFloat(dados.alvoMensal) || 0,
      prazo_meses: parseInt(dados.prazoMeses, 10) || 0,
      despesas_atuais: despAtual,
      faturamento_atual: fatAtual,
      renda_atual: fatAtual - despAtual,
      gap_inicial: parseFloat(dados.gapInicial) || 0,
      reducao_despesas: parseFloat(dados.reducaoDespesas) || 0,
      total_simulado: parseFloat(dados.totalContribuido) || 0,
      pct_fechado: parseFloat(dados.pctFechado) || 0,
      saldo_restante: parseFloat(dados.saldoRestante) || 0,
      ofertas: JSON.stringify(dados.ofertas || []),
      novo_produto: JSON.stringify(dados.novoProduto || {}),
      plano_acao: JSON.stringify(dados.planoAcao || {}),
      criado_em: BigQuery.timestamp(new Date())
    };

    await bigquery.dataset(datasetId).table(tableId).insert([row]);

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Simulação gravada com sucesso no Google BigQuery!',
      id: row.id
    });
  } catch (err) {
    console.error('Erro ao salvar no BigQuery:', err);
    return res.status(500).json({
      sucesso: false,
      erro: err.message || 'Falha ao salvar no Google BigQuery'
    });
  }
};
