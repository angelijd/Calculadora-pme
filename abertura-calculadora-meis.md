# Calculadora para MEIs — Documento de Abertura

**Objetivo:** ferramenta de apoio à consultoria comercial da Cris. Faz diagnóstico de viabilidade de faturamento (chegar a R$81k/ano), diagnóstico de saúde financeira, e gera insights qualitativos a partir da transcrição da reunião com o cliente.

---

## 1. Output

### Binário 1 — Viabilidade de receita
- Dado o prazo informado pelo cliente, é matematicamente possível fechar o gap entre receita atual e R$6.750/mês (R$81k/ano ÷ 12)?
- Se **não viável**: calcular, para cada uma das 3 alavancas de receita isoladamente, quanto seria necessário para fechar o gap sozinha:
  - **Preço**: novo preço médio necessário (ou % de aumento) por produto
  - **Produto novo**: receita mensal que um novo produto precisaria gerar
  - **Clientes novos**: quantidade de novos clientes necessária, dado o ticket médio atual
- Essas alavancas podem se combinar — o output não precisa forçar uma alavanca única, mas mostrar o "custo" de cada uma isoladamente é a base pra Cris montar combinações com o cliente.
- Se **capacidade máxima de atendimento** não suporta a quantidade de clientes/produção necessária pra alguma alavanca, sinalizar isso (ex: "alavanca 'clientes novos' exigiria mais atendimentos do que a capacidade atual permite").

### Binário 2 — Saúde financeira
- Independente do binário 1: margem atual (receita − despesa) está saudável?
- Não entra no cálculo de gap de receita (despesa não muda faturamento bruto). É um diagnóstico paralelo.
- Sinalizar se despesa > receita (prejuízo), mesmo que a meta de faturamento seja viável.

### Insights qualitativos (transcrição da reunião — input opcional)
A IA deve extrair, quando a transcrição for fornecida:
1. **Alavanca sensível**: se o cliente expressou resistência/preferência sobre alguma das alavancas (ex: já mencionou não querer mexer em preço)
2. **Riscos/objeções não capturados no cálculo**: menções a mudanças de disponibilidade, contexto pessoal, sazonalidade, etc.
3. **Calibração de tom**: sinais sobre o perfil do cliente que ajudem a ajustar a linguagem do documento final (mais técnico, mais motivacional, mais cauteloso)

Esses insights aparecem como uma seção separada no documento — não interferem no cálculo determinístico dos binários.

### Documento final
- **Formato: Word editável (.docx)** — a Cris revisa e ajusta antes de enviar ao cliente
- Linguagem simples, períodos curtos
- Gráfico/tabela onde ajudar a visualizar o gap e as alavancas

---

## 2. Input

| Campo | Obrigatório? | Observação |
|---|---|---|
| Nome do empreendedor | Sim | |
| CNPJ | Sim | |
| Produtos (nome, preço, quantidade vendida no período) | Sim | Lista — pode ter 1 ou mais produtos |
| Quantidade atual de clientes | Sim | |
| Prazo para atingir a meta | Sim | Informado pelo cliente (não calculado) |
| Despesas atuais | Sim | Usado só no binário 2 |
| Capacidade máxima de atendimento atual | Sim | Número direto (não vamos derivar de horas/semana) |
| Transcrição da reunião | Não | Recebida automaticamente via API/webhook do Tactiq — não é colada manualmente. Camada de insight qualitativo. |

**Constante do sistema (não é input):** Meta de faturamento = R$81.000/ano, diluída em R$6.750/mês.

---

## 3. Edge cases

- **Cliente já bate a meta hoje**: binário 1 é trivialmente viável. Output foca em insights de otimização/estabilidade, não em alavancas de gap.
- **Múltiplos produtos com preços diferentes**: cálculo de ticket médio e simulação de "novo preço" precisa considerar por produto, não um número agregado único.
- **Prejuízo (despesa > receita)**: binário 2 sinaliza mesmo que binário 1 seja viável.
- **Prazo muito curto ou = 0**: calculadora deve tratar como prazo inválido e não gerar uma recomendação absurda (ex: "consiga 500 clientes este mês").
- **Capacidade não suporta nenhuma alavanca isoladamente**: sinalizar que só combinação de alavancas resolve, ou que o prazo é irreal dado a capacidade.
- **Transcrição ausente**: pipeline roda normalmente sem a camada de insights qualitativos — essa seção simplesmente não aparece no documento.
- **Falha no matching automático** (transcrição do Tactiq chega mas não casa com nenhum cliente cadastrado, ou casa errado): sistema deve sinalizar a inconsistência em vez de anexar silenciosamente ao cliente errado. Precisa de um fallback de revisão manual pela Cris.
- **Desenquadramento (cliente já ultrapassou ou está perto do teto)**: fora de escopo, não tratar.

---

## 4. Assumptions

1. Meta de R$81k/ano é diluída igualmente mês a mês (R$6.750/mês fixo), sem sazonalidade.
2. O prazo para atingir a meta é definido pelo cliente, não calculado pela ferramenta.
3. O cálculo de viabilidade assume crescimento linear até a meta (não composto).
4. Ticket médio por produto é constante ao longo do prazo (não há projeção de reajuste natural).
5. Despesas atuais são tratadas como estáticas para fins do binário 2 (não há projeção de aumento de custo).
6. Capacidade máxima de atendimento é um teto rígido — alavancas que ultrapassam esse teto são marcadas como inviáveis isoladamente.
7. As 3 alavancas de receita (preço, produto, clientes) são calculadas de forma independente entre si (não há uma "alavanca combinada" automática — combinação fica a cargo da Cris na conversa com o cliente).
8. Transcrição, quando fornecida, é tratada como texto bruto de reunião (não pré-estruturado).
9. A associação transcrição↔cliente é automática, via metadado da reunião (ex: link do Google Meet, ID do evento de calendário, ou participantes) casado com um registro do cliente previamente cadastrado. O schema exato do payload do webhook do Tactiq precisa ser confirmado na fase técnica (depende do plano/API disponível).

---

## 5. Validation checkpoints

- [ ] Confirmar com a Cris o teto de R$81k antes de rodar (caso a legislação mude — hoje, jul/2026, ainda é R$81k, mas há PLPs em tramitação para subir o valor)
- [ ] Testar com múltiplos produtos de preços muito diferentes (garantir que o cálculo por produto não quebra)
- [ ] Testar cenário de prejuízo (despesa > receita) isolado do binário 1
- [ ] Testar prazo = 0 e prazo muito longo (ex: 5 anos) para garantir mensagens sensatas
- [ ] Validar com a Cris os primeiros 2-3 diagnósticos gerados antes de liberar uso recorrente — ela calibra a leitura das alavancas
- [ ] Revisar com a Cris o tipo de insight que a IA está puxando da transcrição nos primeiros casos reais (evitar generalização vazia tipo "cliente parece motivado")

---

## Decisões fechadas (histórico)

- Formato final: **Word editável (.docx)**
- Fonte da transcrição: **integração via API do Tactiq** (webhook), associação automática ao cliente por metadado da reunião — ver assumption 9 e edge case de falha de matching
