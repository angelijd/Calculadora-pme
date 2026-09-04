-- Schema para Calculadora de MEIs — Supabase
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Habilitar extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Diagnósticos e Cenários Base
CREATE TABLE IF NOT EXISTS public.diagnosticos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    alvo_mensal NUMERIC(12,2) NOT NULL DEFAULT 0,
    prazo_meses INTEGER NOT NULL DEFAULT 6,
    faturamento_atual NUMERIC(12,2) NOT NULL DEFAULT 0,
    despesas_atuais NUMERIC(12,2) NOT NULL DEFAULT 0,
    gap_inicial NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Ofertas do Portfólio Atual
CREATE TABLE IF NOT EXISTS public.ofertas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diagnostico_id UUID REFERENCES public.diagnosticos(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    preco NUMERIC(12,2) NOT NULL DEFAULT 0,
    quantidade INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Simulações Realizadas
CREATE TABLE IF NOT EXISTS public.simulacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diagnostico_id UUID REFERENCES public.diagnosticos(id) ON DELETE CASCADE,
    reducao_despesas NUMERIC(12,2) DEFAULT 0,
    ofertas_simuladas JSONB DEFAULT '[]'::jsonb,
    novo_produto JSONB DEFAULT '{}'::jsonb,
    total_contribuido NUMERIC(12,2) DEFAULT 0,
    pct_fechado NUMERIC(6,2) DEFAULT 0,
    saldo_restante NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosticos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso anônimo para facilidade de uso na consultoria
CREATE POLICY "Permitir leitura pública/anônima clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir leitura pública/anônima diagnosticos" ON public.diagnosticos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir leitura pública/anônima ofertas" ON public.ofertas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir leitura pública/anônima simulacoes" ON public.simulacoes FOR ALL USING (true) WITH CHECK (true);
