/**
 * Abstração do Hardware
 * Representa os componentes físicos que o software vai gerenciar
 */
class SensorUltrassonico {
  constructor(pino) { this.pino = pino; }
  // Simula a leitura de distância em centímetros
  lerDistancia() {
    // Simulando que o hardware gera um valor entre 10cm e 300cm
    return Math.floor(Math.random() * (300 - 10 + 1)) + 10;
  }
}

/**
 * Objeto de Négocio
 * Representa a unidade lógica: a Vaga
 */
class Vaga {
  constructor(id, pinoSensor) {
    this.id = id;
    this.sensor = new SensorUltrassonico(pinoSensor);
    this.estaOcupada = false;
    this.corLed = "VERDE";

    // Filtro de ruídos
    this.confirmacoes = 0; // Contador para filtrar pedestres
    this.historico = [];

    // Criação do Elemento no HTML
    this.elemento = document.createElement('div');
    this.elemento.className = `vaga ${this.corLed}`;
    this.elemento.innerText = `Vaga ${this.id}`;
    document.getElementById('estacionamento').appendChild(this.elemento);
  }

  // Lógica para processar os dados do sensor
  processar() {
    const distancia = this.sensor.lerDistancia();
    const limiteOcupado = 50;
    const ciclosParaConfirmar = 3; // O objeto precisa ficar 3 ciclos para ser um veículo

    // Lógica de Filtro (diferenciar pedestre de veículo)
    if (distancia < limiteOcupado) {
      this.confirmacoes++;
    } else {
      this.confirmacoes = 0; // Reset imediato se o sensor liberar
    }

    // Só altera o estado se confirmar a presença contínua
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

    // Registro do Histórico (Data e Hora)
    const registro = {
      vaga: this.id,
      status: this.estaOcupada ? "Entrada" : "Saída",
      horario: new Date().toLocaleString(),
      timestamp: Date.now()
    };

    this.historico.push(registro);
    console.log("Novo Registro: ", registro);
  }
}

class SistemaEstacionamento {
  constructor(quantidadeVagas) {
    this.vagas = []; // Array que armazenará todos os objetos do tipo Vaga
    for (let i = 1; i <= quantidadeVagas; i++) {
      this.vagas.push(new Vaga(i, 10 + i)) // Cria a vaga e adiciona ao array
    }
  }

  /**
   * MÉTODO: executarLoop
   * Implementa o conceito de 'Super-loop' de sistemas embarcados.
   */
  executarLoop() {
    // setInterval executa o bloco de código repetidamente a cada 2000ms (2 segundos)
    setInterval(() => {
      let contadorLivres = 0; // Renicia o contador a cada ciclo
      
      this.vagas.forEach(vaga => {
        vaga.processar(); // Executa a lógica interna da vaga
        if (!vaga.estaOcupada) contadorLivres++;
      });

      document.getElementById('contador').innerText = contadorLivres;
    }, 1000);
  }

  /**
   * Novos Métodos e Análise de Dados
   */
  exportarDados() {
    const todosDados = this.vagas.flatMap(v => v.historico);
    const blob = new Blob([JSON.stringify(todosDados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historico_vaga_certa.json';
    a.click();
  }

  getHorariosPico() {
    const todosDados = this.vagas.flatMap(v => v.historico);
    const entradas = todosDados.filter(d => d.status === "Entrada");
    console.log("Análise de Pico baseada em", entradas.length, "entradas.");
  }
}

const sistema = new SistemaEstacionamento(10);
sistema.executarLoop();