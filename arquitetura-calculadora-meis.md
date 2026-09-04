# Calculadora para MEIs — Arquitetura Técnica (v2 — Extensão Chrome + Google Meet)

Muda de "app web + integração Tactiq" pra **extensão do Chrome que roda dentro do Google Meet**, com diagnóstico ao vivo durante a call e documento final gerado como Google Doc no Drive da Cris (Workspace).

---

## 1. Componentes

1. **Extensão Chrome (Manifest V3)**
   - Content script injetado em `meet.google.com`: liga a legenda nativa do Meet (CC) e lê o texto incrementalmente do DOM
   - Side panel (`chrome.sidePanel`): UI onde a Cris seleciona o cliente, vê os campos (preenchidos por IA ou digitados por ela) e acompanha o diagnóstico atualizando ao vivo
   - `chrome.identity` / OAuth com a conta Workspace da Cris, pra permitir criação de Google Doc no fim

2. **Backend FastAPI no Render** (mantém o mesmo, muda o papel)
   - Não guarda mais webhook de transcrição — agora recebe chamadas incrementais da extensão durante a call
   - Roda o cálculo determinístico (a árvore de decisão) e a extração de dados via IA

3. **Google Sheets** (via Sheets API), no lugar do Supabase — guarda clientes, produtos e diagnósticos finais. O estado ao vivo (campos sendo preenchidos/atualizados durante a call) vive no `chrome.storage.local` da extensão — não é uma chamada de API externa, é armazenamento local do navegador, então não tem custo de rede nem limite de taxa. Isso funciona como autosave: sobrevive a reinício do service worker (comum no Manifest V3), fechamento acidental da aba, ou reinício do Chrome. O Sheets só é gravado em **checkpoints**: ao cadastrar um cliente novo, e ao fechar o diagnóstico final da call. Se a gravação no Sheets falhar nesse momento (ex: sem internet), os dados continuam no `storage.local` e a extensão oferece "tentar novamente" em vez de perder o progresso.

4. **Google Workspace APIs**: Docs API (cria o documento final), Drive API (salva no lugar certo), Sheets API (persistência em checkpoints)

---

## 2. Fluxo, passo a passo

1. Cris entra na call do Meet → abre o side panel da extensão
2. No painel, ela **seleciona ou cadastra o cliente** (nome, CNPJ) — é esse passo que resolve a associação, sem precisar de matching automático
3. Extensão liga a legenda do Meet e começa a capturar o texto incremental
4. A cada trecho novo de texto (ex: a cada 20-30 segundos, ou a cada N caracteres acumulados), o content script manda esse pedaço pro backend
5. Backend chama a IA (uma chamada, prompt fixo) pedindo:
   - Extração de campos estruturados que aparecerem na fala (produtos, preços, despesas, capacidade, prazo, alvo de faturamento)
   - Os 3 tipos de insight qualitativo (alavanca sensível, riscos, tom)
6. Backend devolve pro side panel os campos que conseguiu extrair + insights até agora
7. Side panel **mostra os campos como editáveis** — a IA preenche, mas a Cris pode corrigir, completar ou sobrescrever a qualquer momento
8. Toda vez que um campo muda (por IA ou por edição manual), o painel chama o endpoint de cálculo determinístico e **atualiza o diagnóstico ao vivo**, na tela, durante a call
9. No fim da call, a Cris clica em "Gerar documento" → backend monta o texto final (diagnóstico + insights) e cria um **Google Doc** via Docs API, direto no Drive da conta dela
10. Ela abre o link do Doc, revisa e edita antes de mandar pro cliente

---

## 3. Modelo de dados (Google Sheets) — simplificado

Uma planilha, três abas:

**Clientes**: `id`, `nome`, `cnpj`, `created_at`

**Produtos** (1 cliente → N produtos)
- `id`, `cliente_id`, `nome`, `preco`, `quantidade_vendida_periodo`

**Diagnósticos** (1 por sessão/call — gravado só no checkpoint final)
- `id`, `cliente_id`, `alvo_faturamento_mensal`, `prazo_meses`, `despesas_atuais`, `capacidade_maxima_atendimento`, `resultado_arvore` (qual etapa/diagnóstico bateu), `created_at`

*(Durante a call, os campos vivem só na memória do side panel — nada é gravado a cada atualização. Grava-se no Sheets só ao criar/editar um cliente e ao fechar o diagnóstico.)*

---

## 4. Endpoints (FastAPI)

| Endpoint | Função |
|---|---|
| `POST /clientes` | Cria/atualiza cliente + produtos |
| `POST /sessoes/{cliente_id}/transcricao` | Recebe trecho incremental de texto da call, roda extração via IA, devolve campos + insights |
| `POST /diagnosticos/calcular` | Roda a árvore de decisão (determinística) com os campos atuais, devolve o diagnóstico |
| `POST /diagnosticos/{id}/gerar-doc` | Monta o conteúdo final e cria o Google Doc via Docs API |

O cálculo (`/diagnosticos/calcular`) é chamado toda vez que um campo muda no painel — é uma função pura e rápida, não depende de IA, então pode rodar a cada tecla digitada sem custo relevante.

## 5. Camada de IA — duas chamadas diferentes, propósitos diferentes

- **Extração de campos + insights** (`/sessoes/.../transcricao`): roda periodicamente durante a call, sobre o texto acumulado. Prompt fixo, retorno em JSON estruturado, via **Gemini API (chave gerada no AI Studio)** — mesmo provider já usado no Valuta e no Movimento pela Base. Sujeita a erro (legenda é imprecisa) — por isso os campos são sempre editáveis pela Cris.
- **Cálculo do diagnóstico**: sem IA nenhuma, só a lógica da árvore de decisão em código puro.

## 6. Geração do Google Doc

Usa a Docs API pra criar o documento direto na conta Workspace da Cris (OAuth já autorizado pela extensão). Estrutura: diagnóstico da árvore, alavancas calculadas (quando aplicável), insights da transcrição. Fica no Drive dela, editável nativamente, exportável pra `.docx` quando quiser.

---

## 7. Riscos técnicos a monitorar

- **Captura de legenda é frágil**: lê o HTML da página do Meet, então uma mudança de interface do Google pode quebrar a captura sem aviso. Vale um teste periódico manual.
- **Legenda é imprecisa**: sem pontuação, frases parafraseadas/cortadas — a extração de números por IA vai errar às vezes. A edição manual não é um "extra", é essencial pro sistema funcionar direito.
- **Latência**: cada extração via IA leva alguns segundos — o "ao vivo" tem um pequeno atraso, não é instantâneo palavra por palavra.
- **Distribuição da extensão**: como é uso interno (só a Cris), não precisa publicar na Chrome Web Store — dá pra carregar em modo desenvolvedor ou distribuir internamente pelo admin do Workspace.
- **Perda de dados por falha da extensão** (mitigado): reinício do service worker, fechamento acidental de aba ou queda de internet no momento do checkpoint final não devem apagar o progresso da call. Resolvido com autosave em `chrome.storage.local` a cada mudança de campo, independente dos checkpoints no Sheets.

---

## Em aberto pra fase de implementação

- Testar a leitura da legenda do Meet num ambiente real antes de construir o resto (é o componente mais frágil e mais crítico — se não funcionar bem, o resto do desenho muda)
- Frequência ideal de envio de trechos pro backend (custo de chamadas de IA vs. atualização em tempo real)
