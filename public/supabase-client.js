// Supabase Client & LocalStorage Sync Layer
class DataManager {
  constructor() {
    this.supabase = null;
    this.isSupabaseConfigured = false;
    this.storageKey = 'calculadora_mei_estado_v4';
  }

  async init() {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const config = await res.json();
        if (config.supabaseUrl && config.supabaseAnonKey && window.supabase) {
          this.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
          this.isSupabaseConfigured = true;
          console.log('Supabase configurado com sucesso via servidor.');
          return true;
        }
      }
    } catch (e) {
      console.warn('Rodando em modo cliente puro ou sem backend ativo.');
    }

    // Tentar ler do localStorage caso o usuário tenha configurado manualmente
    const localUrl = localStorage.getItem('calc_supabase_url');
    const localKey = localStorage.getItem('calc_supabase_anon_key');
    if (localUrl && localKey && window.supabase) {
      try {
        this.supabase = window.supabase.createClient(localUrl, localKey);
        this.isSupabaseConfigured = true;
        return true;
      } catch (err) {
        console.error('Erro ao inicializar Supabase local:', err);
      }
    }

    return false;
  }

  salvarLocal(dados) {
    try {
      const payload = {
        ...dados,
        atualizado_em: new Date().toISOString()
      };
      // 1. Sempre salva no navegador (localStorage)
      localStorage.setItem(this.storageKey, JSON.stringify(payload));

      // 2. Se o backend estiver ativo, salva automaticamente na pasta dados_salvos do computador
      if (this.debounceTimeout) clearTimeout(this.debounceTimeout);
      this.debounceTimeout = setTimeout(() => {
        fetch('/api/salvar-disco', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }, 500);
    } catch (e) {
      console.error('Erro ao salvar no localStorage:', e);
    }
  }

  carregarLocal() {
    try {
      const salvo = localStorage.getItem(this.storageKey);
      return salvo ? JSON.parse(salvo) : null;
    } catch (e) {
      console.error('Erro ao ler do localStorage:', e);
      return null;
    }
  }

  exportarJSON(dados) {
    try {
      const payload = JSON.stringify(dados, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const nomeCliente = (dados.cliente && dados.cliente.nome) 
        ? dados.cliente.nome.trim().replace(/[^a-zA-Z0-9_-]/g, '_') 
        : 'simulacao';
      const timestamp = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calculadora_${nomeCliente}_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      console.error('Erro ao exportar JSON:', err);
      return false;
    }
  }

  importarJSON(callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const dados = JSON.parse(event.target.result);
          this.salvarLocal(dados);
          if (callback) callback(dados);
        } catch (err) {
          alert('Arquivo JSON inválido ou corrompido.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  async sincronizarSupabase(dadosCompletos) {
    if (!this.isSupabaseConfigured || !this.supabase) {
      return { sucesso: false, motivo: 'Supabase não configurado' };
    }

    try {
      // 1. Inserir ou atualizar cliente
      let clienteId = dadosCompletos.clienteId;
      if (!clienteId && dadosCompletos.nome) {
        const { data: cliente, error: errCliente } = await this.supabase
          .from('clientes')
          .insert([{ nome: dadosCompletos.nome, email: dadosCompletos.email || '' }])
          .select()
          .single();

        if (errCliente) throw errCliente;
        clienteId = cliente.id;
      }

      // 2. Salvar diagnóstico
      const { data: diag, error: errDiag } = await this.supabase
        .from('diagnosticos')
        .insert([{
          cliente_id: clienteId,
          alvo_mensal: dadosCompletos.alvoMensal,
          prazo_meses: dadosCompletos.prazoMeses,
          faturamento_atual: dadosCompletos.faturamentoMensal,
          despesas_atuais: dadosCompletos.despesasAtuais,
          gap_inicial: dadosCompletos.gapInicial
        }])
        .select()
        .single();

      if (errDiag) throw errDiag;

      // 3. Salvar simulação
      const { error: errSim } = await this.supabase
        .from('simulacoes')
        .insert([{
          diagnostico_id: diag.id,
          reducao_despesas: dadosCompletos.reducaoDespesas,
          ofertas_simuladas: dadosCompletos.ofertas,
          novo_produto: dadosCompletos.novoProduto,
          total_contribuido: dadosCompletos.totalContribuido,
          pct_fechado: dadosCompletos.pctFechado,
          saldo_restante: dadosCompletos.saldoRestante
        }]);

      if (errSim) throw errSim;

      return { sucesso: true, clienteId, diagnosticoId: diag.id };
    } catch (error) {
      console.error('Erro na sincronização com Supabase:', error);
      return { sucesso: false, erro: error.message };
    }
  }
}

window.dataManager = new DataManager();
