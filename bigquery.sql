-- ============================================================
-- GOOGLE BIGQUERY - ESTRUTURA PARA CALCULADORA PME / MEI
-- ============================================================
-- Substitua 'SEU_PROJETO_ID' pelo ID real do seu projeto no Google Cloud.
--
-- 1. CRIAR O DATASET (CONJUNTO DE DADOS)
-- ============================================================
CREATE SCHEMA IF NOT EXISTS SEU_PROJETO_ID.calculadora_pme
OPTIONS (
  description = 'Dados e simulações da Calculadora de Metas Financeiras PME/MEI',
  location = 'southamerica-east1' -- Região São Paulo (ou 'US' se preferir)
);

-- 2. CRIAR A TABELA DE SIMULAÇÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS SEU_PROJETO_ID.calculadora_pme.simulacoes (
  id STRING NOT NULL OPTIONS(description='Identificador único da simulação'),
  cliente_nome STRING OPTIONS(description='Nome do empreendedor / cliente'),
  cliente_email STRING OPTIONS(description='E-mail de contato'),
  alvo_mensal FLOAT64 OPTIONS(description='Meta de renda líquida mensal (R$)'),
  prazo_meses INT64 OPTIONS(description='Prazo em meses para atingir a meta'),
  despesas_atuais FLOAT64 OPTIONS(description='Despesas gerais mensais atuais (R$)'),
  faturamento_atual FLOAT64 OPTIONS(description='Faturamento mensal total atual (R$)'),
  renda_atual FLOAT64 OPTIONS(description='Renda líquida atual (R$)'),
  gap_inicial FLOAT64 OPTIONS(description='GAP financeiro a fechar (R$)'),
  reducao_despesas FLOAT64 OPTIONS(description='Economia mensal simulada na Alavanca 1 (R$)'),
  total_simulado FLOAT64 OPTIONS(description='Total gerado pelas 4 alavancas (R$)'),
  pct_fechado FLOAT64 OPTIONS(description='Percentual do GAP coberto (%)'),
  saldo_restante FLOAT64 OPTIONS(description='Saldo restante para bater a meta (R$)'),
  ofertas JSON OPTIONS(description='Portfólio de ofertas e simulações de vendas/preços em JSON'),
  novo_produto JSON OPTIONS(description='Dados do novo produto simulado na Alavanca 4 em JSON'),
  plano_acao JSON OPTIONS(description='Pilares selecionados e ações detalhadas do plano em JSON'),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP() OPTIONS(description='Data e hora do registro')
);
