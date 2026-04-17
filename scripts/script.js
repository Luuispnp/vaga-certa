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

    this.estaOcupada = distancia < limiteOcupado;
    this.corLed = this.estaOcupada ? "VERMELHO" : "VERDE";
    this.elemento.className = `vaga ${this.corLed}`;
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
    }, 2000);
  }
}

const sistema = new SistemaEstacionamento(5);
sistema.executarLoop();