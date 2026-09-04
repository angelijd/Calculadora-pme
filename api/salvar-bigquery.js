const { BigQuery } = require('@google-cloud/bigquery');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ sucesso: false, erro: 'Método não permitido. Use POST.' });
  }

  try {
    const projectId = process.env.GOOGLE_PROJECT_ID;
    const datasetId = process.env.BIGQUERY_DATASET || 'calculadora_pme';
    const tableId = process.env.BIGQUERY_TABLE || 'simulacoes';
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      return res.status(400).json({
        sucesso: false,
        motivo: 'Credenciais do BigQuery não configuradas (GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY).'
      });
    }

    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    const bigquery = new BigQuery({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey
      }
    });

    const dados = req.body || {};
    const fatAtual = parseFloat(dados.faturamentoMensal) || 0;
    const despAtual = parseFloat(dados.despesasAtuais) || 0;
    const row = {
      id: sim__,
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
