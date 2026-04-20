let intervaloGlobal = null; 
let historicoGlobal = []; 

class SensorUltrassonico {
  constructor(pino) { this.pino = pino; }
  lerDistancia() {
    return Math.floor(Math.random() * (300 - 10 + 1)) + 10;
  }
}

class Vaga {
  constructor(id, pinoSensor, limite) {
    this.id = id;
    this.sensor = new SensorUltrassonico(pinoSensor);
    this.estaOcupada = false;
    this.corLed = "VERDE";
    this.limiteOcupado = limite;
    this.confirmacoes = 0;

    this.elemento = document.createElement('div');
    this.elemento.className = `vaga ${this.corLed}`;
    this.elemento.innerText = `Vaga ${this.id}`;
    document.getElementById('estacionamento').appendChild(this.elemento);
  }

  processar() {
    const distancia = this.sensor.lerDistancia();
    const ciclosParaConfirmar = 3;

    if (distancia < this.limiteOcupado) {
      this.confirmacoes++;
    } else {
      this.confirmacoes = 0; 
    }

    if (this.confirmacoes >= ciclosParaConfirmar && !this.estaOcupada) {
      this.mudarEstado(true);
    } else if (this.confirmacoes === 0 && this.estaOcupada) {
      this.mudarEstado(false);
    }
  }

  mudarEstado(novoStatus) {
    this.estaOcupada = novoStatus;
    this.corLed = this.estaOcupada ? "VERMELHO" : "VERDE";
    this.elemento.className = `vaga ${this.corLed}`;

    const registro = {
      vaga: this.id,
      status: this.estaOcupada ? "Entrada" : "Saída",
      horario: new Date().toLocaleString('pt-BR'),
      timestamp: Date.now()
    };

    historicoGlobal.push(registro);
    console.log("Novo Registro (Salvo no Global):", registro);
  }
}

class SistemaEstacionamento {
  constructor(quantidadeVagas, limite) {
    this.vagas = [];
    for (let i = 1; i <= quantidadeVagas; i++) {
      this.vagas.push(new Vaga(i, 10 + i, limite));
    }
  }

  executarLoop() {
    if (intervaloGlobal) clearInterval(intervaloGlobal);
    intervaloGlobal = setInterval(() => {
      let contadorLivres = 0;
      this.vagas.forEach(vaga => {
        vaga.processar();
        if (!vaga.estaOcupada) contadorLivres++;
      });
      document.getElementById('contador').innerText = contadorLivres;
    }, 1000);
  }

  exportarDados() {
    if (historicoGlobal.length === 0) return alert("Histórico global está vazio.");
    
    const blob = new Blob([JSON.stringify(historicoGlobal, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historico_acumulado_vaga_certa.json';
    a.click();
  }

  analisarPicos() {
    const contagemPorHora = {};
    historicoGlobal.forEach(reg => {
      if (reg.status === "Entrada") {
        const data = new Date(reg.timestamp);
        const hora = data.getHours().toString().padStart(2, '0');
        contagemPorHora[hora] = (contagemPorHora[hora] || 0) + 1;
      }
    });
    return contagemPorHora;
  }

  gerarRelatorioPDF() {
    const picos = this.analisarPicos();

    if (historicoGlobal.length === 0) {
      return alert("Sem dados acumulados no histórico global.");
    }

    let conteudo = "<html><head><title>Relatório Vaga Certa</title></head><body style='font-family:sans-serif; padding:20px;'>";
    conteudo += "<h1>Relatório de Ocupação ACUMULADO</h1>";
    conteudo += `<p>Total de registros desde a abertura da página: ${historicoGlobal.length}</p><hr>`;
    
    if (Object.keys(picos).length === 0) {
      conteudo += "<p>Nenhuma entrada registrada ainda (apenas saídas ou sistema recém iniciado).</p>";
    } else {
        conteudo += "<h3>Entradas por Hora (Histórico Total):</h3><ul>";
        for (const hora in picos) {
          conteudo += `<li>Das ${hora}:00 às ${hora}:59 — ${picos[hora]} veículo(s)</li>`;
        }
      conteudo += "</ul>";
    }
    
    conteudo += "</body></html>";
    
    const janelaRelatorio = window.open('', '', 'width=800,height=600');
    janelaRelatorio.document.write(conteudo);
    janelaRelatorio.document.close();
    setTimeout(() => { janelaRelatorio.print(); }, 500);
}
}

function configurarSistema() {
  const qtd = parseInt(document.getElementById('inputVagas').value) || 5;
  const limite = parseInt(document.getElementById('inputLimite').value) || 50;
  const patio = document.getElementById('estacionamento');
  if (patio) patio.innerHTML = "";
  
  window.sistema = new SistemaEstacionamento(qtd, limite);
  window.sistema.executarLoop();
}

window.onload = () => {
  configurarSistema();
};