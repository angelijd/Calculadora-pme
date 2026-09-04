// DataManager: LocalStorage & BigQuery Sync Layer
class DataManager {
  constructor() {
    this.isBigQueryConfigured = false;
    this.projectId = '';
    this.storageKey = 'calculadora_mei_estado_v4';
  }

  async init() {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const config = await res.json();
        if (config.bigqueryConfigured) {
          this.isBigQueryConfigured = true;
          this.projectId = config.projectId || '';
          console.log('Google BigQuery configurado com sucesso via servidor.');
          return true;
        }
      }
    } catch (e) {
      console.warn('Rodando em modo cliente puro ou sem backend ativo.');
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

  async sincronizarBigQuery(dadosCompletos) {
    try {
      const res = await fetch('/api/salvar-bigquery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosCompletos)
      });
      const data = await res.json();
      return data;
    } catch (error) {
      console.error('Erro na sincronização com BigQuery:', error);
      return { sucesso: false, erro: error.message };
    }
  }
}

window.dataManager = new DataManager();
