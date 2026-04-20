/**
 * Variáveis Globais: Funcionam como a memória persistente do sistema.
 */
let intervaloGlobal = null;  // Armazena o "batimento cardíaco" (loop) do sistema
let historicoGlobal = [];    // O "Cofre": guarda todos os registros desde que a página abriu
let qtdAtualValida = 5;      // Guarda o último número de vagas que deu certo (para rollback)
let limiteAtualValido = 50;  // Guarda o último limite de sensor que deu certo (para rollback)

/**
 * CLASSE: SensorUltrassonico
 * Simula o comportamento de um sensor físico HC-SR04.
 */
class SensorUltrassonico {
  lerDistancia() { 
    // Gera um número aleatório para simular a variação da distância de um carro
    return Math.floor(Math.random() * (350 - 10 + 1)) + 10; 
  }
}

/**
* CLASSE: Vaga
* Gerencia a inteligência individual de cada vaga (Estado, LED e Sensor).
*/
class Vaga {
  constructor(id, limite) {
    this.id = id;
    this.sensor = new SensorUltrassonico();
    this.estaOcupada = false;
    this.limiteOcupado = limite;
    this.confirmacoes = 0; // Contador para o filtro de ruído (RF07)

    // Cria o elemento visual (o card da vaga) no HTML
    this.elemento = document.createElement('div');
    this.elemento.className = `vaga VERDE`;
    this.elemento.innerText = `Vaga ${this.id}`;
    document.getElementById('estacionamento').appendChild(this.elemento);
  }

  /**
  * Lógica de Processamento: É chamada a cada 1 segundo.
  */
  processar() {
    const distancia = this.sensor.lerDistancia();
    
    // RF07: Filtro para ignorar objetos transitórios (pedestres)
    if (distancia < this.limiteOcupado) {
      this.confirmacoes++;
    } else {
      this.confirmacoes = 0;
    }

    // Só muda para ocupado se detectar presença por 3 ciclos seguidos
    if (this.confirmacoes >= 3 && !this.estaOcupada) {
      this.mudarEstado(true);
    } 
    // Se o sensor limpar (0 confirmações), a vaga libera imediatamente
    else if (this.confirmacoes === 0 && this.estaOcupada) {
      this.mudarEstado(false);
    }
  }

  /**
  * Troca a cor da vaga e gera o log do evento.
  */
  mudarEstado(novoStatus) {
    this.estaOcupada = novoStatus;
    this.elemento.className = `vaga ${this.estaOcupada ? "VERMELHO" : "VERDE"}`;

    // Cria o objeto de registro (log)
    const registro = {
      vaga: this.id,
      status: this.estaOcupada ? "Entrada" : "Saída",
      horario: new Date().toLocaleTimeString('pt-BR'),
      timestamp: Date.now()
    };

    historicoGlobal.push(registro); // Salva no cofre global
    this.desenharLinhaTabela(registro); // Atualiza a tabela visual
  }

  /**
  * Insere uma nova linha no topo da tabela de "Últimas Atividades"
  */
  desenharLinhaTabela(reg) {
    const lista = document.getElementById('lista-logs');
    if (!lista) return;

    const linha = document.createElement('tr');
    const classeStatus = reg.status === "Entrada" ? "log-entrada" : "log-saida";
    
    linha.innerHTML = `
      <td>Vaga ${reg.vaga}</td>
      <td class="${classeStatus}">${reg.status}</td>
      <td>${reg.horario}</td>
    `;
    
    // Remove o registro mais antigo se já houver 5 na tela (para não esticar a página)
    if (lista.children.length >= 5) {
      lista.removeChild(lista.lastChild);
    }
    // Insere no topo (como o histórico do Windows ou logs de servidor)
    lista.insertBefore(linha, lista.firstChild);
  }
}

/**
 * CLASSE: SistemaEstacionamento
 * O "Gerente": controla todas as vagas e a geração de relatórios.
 */
class SistemaEstacionamento {
  constructor(qtd, limite) {
    this.vagas = [];
    // Cria as instâncias de Vaga conforme a quantidade escolhida
    for (let i = 1; i <= qtd; i++) {
      this.vagas.push(new Vaga(i, limite));
    }
  }

  /**
   * O "Super-Loop": faz o sistema pulsar a cada 1000ms (1 segundo)
   */
  executarLoop() {
    if (intervaloGlobal) clearInterval(intervaloGlobal); // Para o loop anterior antes de começar um novo
    
    intervaloGlobal = setInterval(() => {
      let contadorLivres = 0;
        this.vagas.forEach(vaga => {
          vaga.processar(); // Cada vaga verifica seu sensor
          if (!vaga.estaOcupada) contadorLivres++;
        });
        // Atualiza o painel principal de contagem
        document.getElementById('contador').innerText = contadorLivres;
    }, 1000);
  }

  /**
   * Gera um arquivo JSON para download com os dados brutos
   */
  exportarDados() {
    if (historicoGlobal.length === 0) return alert("Histórico vazio.");
      const blob = new Blob([JSON.stringify(historicoGlobal, null, 2)], {type: 'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'vaga_certa_historico.json';
      a.click();
  }

  /**
   * Processa o histórico e gera um relatório impresso (PDF/Janela)
   */
  gerarRelatorioPDF() {
    if (historicoGlobal.length === 0) return alert("Sem dados para o relatório.");
    
    const picos = {};
    historicoGlobal.forEach(r => {
      if (r.status === "Entrada") {
        const hora = new Date(r.timestamp).getHours().toString().padStart(2, '0');
        picos[hora] = (picos[hora] || 0) + 1;
      }
    });

    let html = `<body style="font-family:sans-serif; padding:40px;"><h1>Relatório de Picos</h1><hr><ul>`;
    for (let h in picos) html += `<li>Das ${h}:00 às ${h}:59: ${picos[h]} entrada(s)</li>`;
    
    const win = window.open('', '', 'width=800,height=600');
    win.document.write(html + `</ul></body>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }
}

/**
 * FUNÇÃO DE CONFIGURAÇÃO: O ponto de entrada do usuário.
 * Faz as validações de limites e reinicia a visão sem apagar a memória global.
 */
function configurarSistema() {
  const inputV = document.getElementById('inputVagas');
  const inputL = document.getElementById('inputLimite');

  let novaQtd = parseInt(inputV.value);
  let novoLimite = parseInt(inputL.value);

  // Validação de Vagas (1 a 50)
  if (isNaN(novaQtd) || novaQtd < 1) {
    alert("Mínimo de 1 vaga. Ajustando...");
    novaQtd = 1; inputV.value = 1;
  } else if (novaQtd > 50) {
    alert("Máximo de 50 vagas. Ajustando...");
    novaQtd = 50; inputV.value = 50;
  }

  // Validação de Sensor (10 a 300cm)
  if (isNaN(novoLimite) || novoLimite < 10) {
    alert("Mínimo de 10cm. Ajustando...");
    novoLimite = 10; inputL.value = 10;
  } else if (novoLimite > 300) {
    alert("Máximo de 300cm. Ajustando...");
    novoLimite = 300; inputL.value = 300;
  }

  // Guarda os novos valores válidos
  qtdAtualValida = novaQtd;
  limiteAtualValido = novoLimite;

  // Limpa apenas a representação VISUAL
  document.getElementById('estacionamento').innerHTML = "";
  const listaLogs = document.getElementById('lista-logs');
  listaLogs.innerHTML = ""; 

  // Cria um novo sistema gráfico
  window.sistema = new SistemaEstacionamento(novaQtd, novoLimite);
  window.sistema.executarLoop();

  // RECUPERAÇÃO: Mostra os últimos logs que já estavam no cofre antes do reinício
  const logsRecuperados = historicoGlobal.slice(-5).reverse();
  logsRecuperados.forEach(reg => {
    const linha = document.createElement('tr');
    const classe = reg.status === "Entrada" ? "log-entrada" : "log-saida";
    linha.innerHTML = `<td>Vaga ${reg.vaga}</td><td class="${classe}">${reg.status}</td><td>${reg.horario}</td>`;
    listaLogs.appendChild(linha);
  });
}

// Inicializa o sistema automaticamente ao abrir a página
window.onload = configurarSistema;