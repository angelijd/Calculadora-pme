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
    const simId = (dados.id && dados.id.trim()) ? dados.id.trim() : ('sim_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));

    const mergeQuery = `
      MERGE \`${datasetId}.${tableId}\` T
      USING (
        SELECT 
          @id as id,
          @cliente_nome as cliente_nome,
          @cliente_email as cliente_email,
          @alvo_mensal as alvo_mensal,
          @prazo_meses as prazo_meses,
          @despesas_atuais as despesas_atuais,
          @faturamento_atual as faturamento_atual,
          @renda_atual as renda_atual,
          @gap_inicial as gap_inicial,
          @reducao_despesas as reducao_despesas,
          @total_simulado as total_simulado,
          @pct_fechado as pct_fechado,
          @saldo_restante as saldo_restante,
          PARSE_JSON(@ofertas) as ofertas,
          PARSE_JSON(@novo_produto) as novo_produto,
          PARSE_JSON(@plano_acao) as plano_acao,
          CURRENT_TIMESTAMP() as criado_em
      ) S
      ON T.id = S.id
      WHEN MATCHED THEN
        UPDATE SET 
          cliente_nome = S.cliente_nome,
          cliente_email = S.cliente_email,
          alvo_mensal = S.alvo_mensal,
          prazo_meses = S.prazo_meses,
          despesas_atuais = S.despesas_atuais,
          faturamento_atual = S.faturamento_atual,
          renda_atual = S.renda_atual,
          gap_inicial = S.gap_inicial,
          reducao_despesas = S.reducao_despesas,
          total_simulado = S.total_simulado,
          pct_fechado = S.pct_fechado,
          saldo_restante = S.saldo_restante,
          ofertas = S.ofertas,
          novo_produto = S.novo_produto,
          plano_acao = S.plano_acao,
          criado_em = S.criado_em
      WHEN NOT MATCHED THEN
        INSERT (id, cliente_nome, cliente_email, alvo_mensal, prazo_meses, despesas_atuais, faturamento_atual, renda_atual, gap_inicial, reducao_despesas, total_simulado, pct_fechado, saldo_restante, ofertas, novo_produto, plano_acao, criado_em)
        VALUES (S.id, S.cliente_nome, S.cliente_email, S.alvo_mensal, S.prazo_meses, S.despesas_atuais, S.faturamento_atual, S.renda_atual, S.gap_inicial, S.reducao_despesas, S.total_simulado, S.pct_fechado, S.saldo_restante, S.ofertas, S.novo_produto, S.plano_acao, S.criado_em)
    `;

    const params = {
      id: simId,
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
      plano_acao: JSON.stringify(dados.planoAcao || {})
    };

    const [job] = await bigquery.createQueryJob({ query: mergeQuery, params });
    await job.getQueryResults();

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Simulação gravada com sucesso no Google BigQuery!',
      id: simId
    });
  } catch (err) {
    console.error('Erro ao salvar no BigQuery:', err);
    return res.status(500).json({
      sucesso: false,
      erro: err.message || 'Falha ao salvar no Google BigQuery'
    });
  }
};
