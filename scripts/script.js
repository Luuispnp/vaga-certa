/**
 * script.js - Sistema Vaga Certa
 * VERSÃO FINAL: Sincronização em Memória e Filtro de 3 Estágios
 */

// --- CONFIGURAÇÕES E ESTADO GLOBAL ---
let config = JSON.parse(localStorage.getItem('config_estacionamento')) || {
    qtdVagas: 5,
    limite: 50
};

// Variável em memória para garantir que o contador de confirmações não resete
let vagasGlobais = [];

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('estacionamento')) {
        inicializarVagas();
        renderizarVagas();
        atualizarContador();
        carregarLogs();
        
        // Loop principal: Processa todos os sensores a cada 1 segundo
        setInterval(processarSensores, 1000);
    }

    if (document.getElementById('inputVagas')) {
        document.getElementById('inputVagas').value = config.qtdVagas;
        document.getElementById('inputLimite').value = config.limite;
    }
});

// Inicializa o array de vagas na memória do navegador
function inicializarVagas() {
    const salvo = JSON.parse(localStorage.getItem('estado_vagas')) || [];
    
    // Se o que está salvo bate com a config atual, usamos o salvo, senão criamos novo
    if (salvo.length === config.qtdVagas) {
        vagasGlobais = salvo;
    } else {
        vagasGlobais = Array.from({ length: config.qtdVagas }, (_, i) => ({
            id: i + 1,
            status: "VERDE", // VERDE = Livre, VERMELHO = Ocupado
            leiturasPresenca: 0
        }));
        localStorage.setItem('estado_vagas', JSON.stringify(vagasGlobais));
    }
}

// Desenha as vagas na tela
function renderizarVagas() {
    const container = document.getElementById('estacionamento');
    if (!container) return;

    container.innerHTML = "";
    vagasGlobais.forEach(vaga => {
        const textoStatus = vaga.status === "VERDE" ? "Livre" : "Ocupada";
        const vagaElement = document.createElement('div');
        vagaElement.className = `vaga ${vaga.status}`;
        vagaElement.innerHTML = `
            <strong>${vaga.id.toString().padStart(2, '0')}</strong>
            <small>${textoStatus}</small>
        `;
        container.appendChild(vagaElement);
    });
}

// --- LÓGICA DOS SENSORES ---
function processarSensores() {
    let houveMudancaEstado = false;

    vagasGlobais.forEach(vaga => {
        let distanciaLida;

        // Simulação inteligente: se começou a detectar, força a manter o objeto lá para teste
        if (vaga.leiturasPresenca > 0 || vaga.status === "VERMELHO") {
            // 90% de chance de manter o carro (distância baixa), 10% de chance de sair (distância alta)
            distanciaLida = Math.random() > 0.1 ? (Math.random() * (config.limite - 5)) : (config.limite + 20);
        } else {
            // Se está livre, 10% de chance de um carro tentar entrar
            distanciaLida = Math.random() < 0.1 ? (Math.random() * (config.limite - 5)) : (Math.random() * 200 + config.limite);
        }
        
        const detectouPresenca = distanciaLida <= config.limite;

        if (vaga.status === "VERDE") {
            // LÓGICA DE ENTRADA (Filtro de 3 segundos)
            if (detectouPresenca) {
                vaga.leiturasPresenca++;
                console.log(`[SENSOR] Vaga ${vaga.id}: ${Math.floor(distanciaLida)}cm | Confirmação: ${vaga.leiturasPresenca}/3`);
                
                if (vaga.leiturasPresenca >= 3) {
                    vaga.status = "VERMELHO";
                    vaga.leiturasPresenca = 0;
                    registrarLog("ENTRADA", vaga.id, Math.floor(distanciaLida));
                    houveMudancaEstado = true;
                }
            } else {
                // Se o sensor der leitura alta, reseta o contador de confirmação imediatamente
                vaga.leiturasPresenca = 0;
            }
        } else {
            // LÓGICA DE SAÍDA (Imediata se distância > limite)
            if (!detectouPresenca) {
                vaga.status = "VERDE";
                vaga.leiturasPresenca = 0;
                registrarLog("SAIDA", vaga.id, Math.floor(distanciaLida));
                houveMudancaEstado = true;
            }
        }
    });

    // Atualiza o visual e o banco de dados apenas se uma vaga mudou de cor
    if (houveMudancaEstado) {
        localStorage.setItem('estado_vagas', JSON.stringify(vagasGlobais));
        renderizarVagas();
        atualizarContador();
        carregarLogs();
    }
}

// --- UTILITÁRIOS E INTERFACE ---

function registrarLog(tipo, vagaId, distancia) {
    const logs = JSON.parse(localStorage.getItem('logs_vagas')) || [];
    const novoRegistro = {
        tipo: tipo,
        vaga: vagaId.toString().padStart(2, '0'),
        horario: new Date().toLocaleTimeString('pt-BR'),
        distancia: distancia
    };
    logs.push(novoRegistro);
    if (logs.length > 100) logs.shift();
    localStorage.setItem('logs_vagas', JSON.stringify(logs));

    // Console log colorido para validação
    const cor = tipo === 'ENTRADA' ? 'color: #ff4757' : 'color: #2ed573';
    console.log(`%c[SISTEMA] %c${tipo} EFETIVADA %cVaga ${novoRegistro.vaga}`, 'font-weight:bold; color:orange', `font-weight:bold; ${cor}`, 'color:white');
}

function carregarLogs() {
    const lista = document.getElementById('lista-logs');
    if (!lista) return;
    const logs = JSON.parse(localStorage.getItem('logs_vagas')) || [];
    lista.innerHTML = logs.slice(-10).reverse().map(log => `
        <li class="log-${log.tipo.toLowerCase()}" style="display:flex; justify-content:space-between; padding:10px 20px; border-bottom:1px solid rgba(255,255,255,0.05); list-style:none;">
            <span>${log.tipo === 'ENTRADA' ? '⬆️' : '⬇️'} Vaga ${log.vaga}</span>
            <strong style="color:#94a3b8;">${log.horario}</strong>
        </li>
    `).join('');
}

function salvarConfiguracoes() {
    const inputVagas = document.getElementById('inputVagas');
    const inputLimite = document.getElementById('inputLimite');
    
    const novaQtd = parseInt(inputVagas.value);
    const novoLimite = parseInt(inputLimite.value);

    if (novaQtd >= 1 && novaQtd <= 50 && novoLimite >= 1 && novoLimite <= 300) {
        config = { qtdVagas: novaQtd, limite: novoLimite };
        localStorage.setItem('config_estacionamento', JSON.stringify(config));
        localStorage.removeItem('estado_vagas'); // Força a reinicialização
        alert("✅ Configurações salvas!");
        location.href = 'index.html';
    } else {
        alert("Valores inválidos! Vagas (1-50), Limite (1-300)");
    }
}

function atualizarContador() {
    const contador = document.getElementById('contador');
    if (contador) {
        const livres = vagasGlobais.filter(v => v.status === "VERDE").length;
        contador.innerText = livres;
    }
}

window.sistema = {
    exportarDados: () => {
        const logs = localStorage.getItem('logs_vagas') || "[]";
        const blob = new Blob([logs], { type: "application/json" });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = "historico_estacionamento.json";
        a.click();
    },
    gerarRelatorioPDF: () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const logs = JSON.parse(localStorage.getItem('logs_vagas')) || [];
        doc.text("VAGA CERTA - RELATÓRIO DE MONITORAMENTO", 20, 20);
        let y = 40;
        logs.slice(-20).reverse().forEach(l => {
            doc.text(`${l.horario} | ${l.tipo} | Vaga ${l.vaga} | Dist: ${l.distancia}cm`, 20, y);
            y += 10;
        });
        doc.save("Relatorio.pdf");
    }
};

function limparHistorico() {
    if (confirm("Isso apagará todas as configurações e logs. Confirmar?")) {
        localStorage.clear();
        location.reload();
    }
}