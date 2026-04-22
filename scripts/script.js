let intervaloGlobal = null;
let historicoGlobal = [];

class SensorSimulado {
  ler() { return Math.floor(Math.random() * 300) + 1; }
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
    const div = document.createElement('div');
    div.className = 'vaga VERDE';
    // AJUSTE: Ordem invertida (strong antes de small) para alinhar melhor verticalmente
    div.innerHTML = `
      <strong>${this.id < 10 ? '0' + this.id : this.id}</strong>
      <small>Disponível</small>
    `;
    document.getElementById('estacionamento').appendChild(div);
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
    this.dom.className = `vaga ${status ? 'VERMELHO' : 'VERDE'}`;
    this.dom.querySelector('small').innerText = status ? 'Ocupada' : 'Disponível';
    
    const registro = {
      texto: `Vaga ${this.id}: ${status ? 'Entrada' : 'Saída'}`,
      hora: new Date().toLocaleTimeString(),
      classe: status ? 'log-entrada' : 'log-saida'
    };
    
    historicoGlobal.push(registro);
    this.adicionarLog(registro);
    window.sistema.atualizarContador();
  }

  adicionarLog(reg) {
    const lista = document.getElementById('lista-logs');
    if (!lista) return; // Segurança caso o elemento não exista
    const li = document.createElement('li');
    li.className = reg.classe;
    li.innerHTML = `<span>${reg.texto}</span> <strong>${reg.hora}</strong>`;
    lista.prepend(li);
  }
}

class GestorEstacionamento {
  constructor(qtd, limite) {
    this.vagas = Array.from({length: qtd}, (_, i) => new Vaga(i + 1, limite));
    this.atualizarContador();
  }

  atualizarContador() {
    const livres = this.vagas.filter(v => !v.ocupada).length;
    const contadorDom = document.getElementById('contador');
    if (contadorDom) contadorDom.innerText = livres;
  }

  exportarDados() {
    if(historicoGlobal.length === 0) return alert("Sem dados para exportar.");
    const blob = new Blob([JSON.stringify(historicoGlobal, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'historico_vagas.json'; a.click();
    URL.revokeObjectURL(url); // Limpeza de memória
  }

  gerarRelatorioPDF() {
    if(historicoGlobal.length === 0) return alert("Histórico vazio.");
    const win = window.open('', '_blank');
    if (!win) return alert("Por favor, permita pop-ups para visualizar o relatório.");
    win.document.write(`<html><head><title>Relatório Vaga Certa</title></head><body style="font-family:sans-serif; padding:40px;"><h2>Histórico Vaga Certa</h2><hr>`);
    historicoGlobal.forEach(h => win.document.write(`<p><strong>${h.hora}</strong> - ${h.texto}</p>`));
    win.document.write(`</body></html>`);
    win.document.close(); win.print();
  }
}

function configurarSistema() {
  if (intervaloGlobal) clearInterval(intervaloGlobal);
  
  const estacionamentoDom = document.getElementById('estacionamento');
  const listaLogsDom = document.getElementById('lista-logs');
  
  if (estacionamentoDom) estacionamentoDom.innerHTML = '';
  if (listaLogsDom) listaLogsDom.innerHTML = '';
  
  const inputVagasDom = document.getElementById('inputVagas');
  const inputLimiteDom = document.getElementById('inputLimite');
  
  const v = inputVagasDom ? parseInt(inputVagasDom.value) : 5;
  const l = inputLimiteDom ? parseInt(inputLimiteDom.value) : 50;
  
  window.sistema = new GestorEstacionamento(v, l);
  intervaloGlobal = setInterval(() => {
    if (window.sistema && window.sistema.vagas) {
        window.sistema.vagas.forEach(v => v.monitorar());
    }
  }, 2000);
}

window.onload = configurarSistema;