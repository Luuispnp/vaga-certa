let intervaloGlobal = null;
let historicoGlobal = JSON.parse(localStorage.getItem('vagaCerta_logs')) || [];

class SensorSimulado {
  ler() { return Math.floor(Math.random() * 350) + 1; }
}

class Vaga {
  constructor(id, limite) {
    this.id = id;
    this.limite = limite;
    this.ocupada = false;
    this.sensor = new SensorSimulado();
    this.confirmacoes = 0;
    this.dom = this.renderizar();
  }

  renderizar() {
    const container = document.getElementById('estacionamento');
    if (!container) return null;
    const div = document.createElement('div');
    div.className = 'vaga VERDE';
    div.innerHTML = `<strong>${this.id < 10 ? '0' + this.id : this.id}</strong><small>Disponível</small>`;
    container.appendChild(div);
    return div;
  }

  monitorar() {
    const d = this.sensor.ler();
    if (d <= this.limite) this.confirmacoes++;
    else this.confirmacoes = 0;

    if (this.confirmacoes >= 3 && !this.ocupada) this.mudar(true);
    else if (this.confirmacoes === 0 && this.ocupada) this.mudar(false);
  }

  mudar(status) {
    this.ocupada = status;
    if (this.dom) {
      this.dom.className = `vaga ${status ? 'VERMELHO' : 'VERDE'}`;
      this.dom.querySelector('small').innerText = status ? 'Ocupada' : 'Disponível';
    }
    
    const registro = {
      texto: `Vaga ${this.id}: ${status ? 'Entrada' : 'Saída'}`,
      hora: new Date().toLocaleTimeString(),
      classe: status ? 'log-entrada' : 'log-saida'
    };
    
    historicoGlobal.push(registro);
    localStorage.setItem('vagaCerta_logs', JSON.stringify(historicoGlobal));
    this.adicionarLog(registro);
    if (window.sistema) window.sistema.atualizarContador();
  }

  adicionarLog(reg) {
    const lista = document.getElementById('lista-logs');
    if (!lista) return;
    const li = document.createElement('li');
    li.className = reg.classe;
    li.innerHTML = `<span>${reg.texto}</span> <strong>${reg.hora}</strong>`;
    lista.prepend(li);
    if (lista.children.length > 30) lista.lastChild.remove();
  }
}

class GestorEstacionamento {
  constructor(qtd, limite) {
    this.vagas = Array.from({length: qtd}, (_, i) => new Vaga(i + 1, limite));
    this.atualizarContador();
    this.carregarLogsAntigos();
  }

  carregarLogsAntigos() {
    const lista = document.getElementById('lista-logs');
    if (!lista) return;
    historicoGlobal.slice(-15).forEach(reg => {
      const li = document.createElement('li');
      li.className = reg.classe;
      li.innerHTML = `<span>${reg.texto}</span> <strong>${reg.hora}</strong>`;
      lista.prepend(li);
    });
  }

  atualizarContador() {
    const livres = this.vagas.filter(v => !v.ocupada).length;
    const contadorDom = document.getElementById('contador');
    if (contadorDom) contadorDom.innerText = livres;
  }

  exportarDados() {
    const blob = new Blob([JSON.stringify(historicoGlobal, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'historico.json'; a.click();
  }

  gerarRelatorioPDF() {
    const win = window.open('', '_blank');
    win.document.write(`<html><body style="font-family:sans-serif;padding:40px"><h2>Relatório Vaga Certa</h2><hr>`);
    historicoGlobal.forEach(h => win.document.write(`<p>${h.hora} - ${h.texto}</p>`));
    win.document.close(); win.print();
  }
}

function salvarConfiguracoes() {
  const v = document.getElementById('inputVagas').value;
  const l = document.getElementById('inputLimite').value;
  localStorage.setItem('vagaCerta_config', JSON.stringify({vagas: v, limite: l}));
  alert("Configurações Aplicadas!");
}

function limparHistorico() {
  if (confirm("Limpar todos os registos?")) {
    localStorage.removeItem('vagaCerta_logs');
    historicoGlobal = [];
    location.reload();
  }
}

window.onload = () => {
  const config = JSON.parse(localStorage.getItem('vagaCerta_config')) || {vagas: 5, limite: 50};
  
  if (document.getElementById('inputVagas')) {
    document.getElementById('inputVagas').value = config.vagas;
    document.getElementById('inputLimite').value = config.limite;
  }

  window.sistema = new GestorEstacionamento(parseInt(config.vagas), parseInt(config.limite));
  
  if (document.getElementById('estacionamento')) {
    intervaloGlobal = setInterval(() => window.sistema.vagas.forEach(v => v.monitorar()), 2000);
  }
};