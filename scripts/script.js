/**
 * script.js - Sistema Vaga Certa
 * Persistência via API REST → SQLite (backend/vagacerta.db)
 */

// --- CONFIGURAÇÕES E ESTADO GLOBAL ---
const API_URL = 'http://localhost:3000/api';

let config = { qtdVagas: 5, limite: 50 };

// Estado em memória — carregado do banco na inicialização
let vagasGlobais = [];

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('estacionamento')) {
        const ok = await carregarConfig();
        if (!ok) return; // servidor offline: banner já exibido
        await inicializarVagas();
        renderizarVagas();
        atualizarContador();
        await carregarLogs();

        // Loop principal: usa setTimeout recursivo para não sobrepor chamadas async
        loopSensores();
    }

    if (document.getElementById('inputVagas')) {
        await carregarConfig();
        document.getElementById('inputVagas').value = config.qtdVagas;
        document.getElementById('inputLimite').value = config.limite;
    }
});

// Carrega configuração do banco
async function carregarConfig() {
    try {
        const res = await fetch(`${API_URL}/configuracoes`);
        if (!res.ok) throw new Error('Resposta inválida');
        const data = await res.json();
        config = { qtdVagas: data.qtd_vagas, limite: data.limite_cm };
        return true;
    } catch {
        mostrarErroConexao();
        return false;
    }
}

// Inicializa vagasGlobais a partir do banco (estado persistido)
async function inicializarVagas() {
    try {
        const res = await fetch(`${API_URL}/vagas`);
        const data = await res.json();
        vagasGlobais = data.map(v => ({
            id: v.numero,
            status: v.status,         // VERDE | VERMELHO — vindo do banco
            leiturasPresenca: 0       // contador em memória, reseta a cada reload
        }));
    } catch {
        console.error('[DB] Falha ao carregar vagas.');
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

// --- LOOP PRINCIPAL (async, sem sobreposição) ---
async function loopSensores() {
    await processarSensores();
    setTimeout(loopSensores, 1000);
}

// --- LÓGICA DOS SENSORES ---
async function processarSensores() {
    let houveMudancaEstado = false;

    for (const vaga of vagasGlobais) {
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
            // LÓGICA DE ENTRADA (Filtro de 3 leituras)
            if (detectouPresenca) {
                vaga.leiturasPresenca++;
                console.log(`[SENSOR] Vaga ${vaga.id}: ${Math.floor(distanciaLida)}cm | Confirmação: ${vaga.leiturasPresenca}/3`);

                if (vaga.leiturasPresenca >= 3) {
                    vaga.status = "VERMELHO";
                    vaga.leiturasPresenca = 0;
                    await registrarLog("ENTRADA", vaga.id, Math.floor(distanciaLida));
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
                await registrarLog("SAIDA", vaga.id, Math.floor(distanciaLida));
                houveMudancaEstado = true;
            }
        }
    }

    // Atualiza o visual apenas se uma vaga mudou de cor (estado já foi salvo no DB pelo registrarLog)
    if (houveMudancaEstado) {
        renderizarVagas();
        atualizarContador();
        await carregarLogs();
    }
}

// --- UTILITÁRIOS E INTERFACE ---

// Registra evento no banco (histórico + sessão + atualiza status da vaga no DB)
async function registrarLog(tipo, vagaId, distancia) {
    try {
        await fetch(`${API_URL}/historico`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vaga_numero: vagaId, tipo, distancia_cm: distancia })
        });
    } catch {
        console.error('[DB] Falha ao registrar evento no banco.');
    }

    const cor = tipo === 'ENTRADA' ? 'color: #ff4757' : 'color: #2ed573';
    console.log(
        `%c[SISTEMA] %c${tipo} EFETIVADA %cVaga ${vagaId.toString().padStart(2, '0')}`,
        'font-weight:bold; color:orange', `font-weight:bold; ${cor}`, 'color:white'
    );
}

// Carrega os últimos 10 eventos do banco e atualiza o painel
async function carregarLogs() {
    const lista = document.getElementById('lista-logs');
    if (!lista) return;
    try {
        const res = await fetch(`${API_URL}/historico?limit=10`);
        const logs = await res.json();
        lista.innerHTML = logs.map(log => {
            const horario = new Date(log.registrado_em).toLocaleTimeString('pt-BR');
            const vagaNum = log.vaga_numero.toString().padStart(2, '0');
            return `
            <li class="log-${log.tipo.toLowerCase()}" style="display:flex; justify-content:space-between; padding:10px 20px; border-bottom:1px solid rgba(255,255,255,0.05); list-style:none;">
                <span>${log.tipo === 'ENTRADA' ? '⬆️' : '⬇️'} Vaga ${vagaNum}</span>
                <strong style="color:#94a3b8;">${horario}</strong>
            </li>`;
        }).join('');
    } catch {
        console.error('[DB] Falha ao carregar logs.');
    }
}

// Salva configurações no banco e redireciona para o dashboard
async function salvarConfiguracoes() {
    const novaQtd   = parseInt(document.getElementById('inputVagas').value);
    const novoLimite = parseInt(document.getElementById('inputLimite').value);

    if (novaQtd >= 1 && novaQtd <= 50 && novoLimite >= 1 && novoLimite <= 300) {
        try {
            const res = await fetch(`${API_URL}/configuracoes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qtd_vagas: novaQtd, limite_cm: novoLimite })
            });
            if (!res.ok) throw new Error();
            alert("✅ Configurações salvas!");
            location.href = 'index.html';
        } catch {
            alert("❌ Erro ao salvar. Verifique se o servidor está rodando.");
        }
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

// Exibe banner de erro quando o servidor está offline
function mostrarErroConexao() {
    if (document.getElementById('_banner-offline')) return;
    const banner = document.createElement('div');
    banner.id = '_banner-offline';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ef4444;color:#fff;text-align:center;padding:14px;font-weight:700;font-size:0.9rem;z-index:9999;letter-spacing:.3px;';
    banner.textContent = '⚠️  Servidor offline — execute: cd backend  →  node server.js  |  Acesse: http://localhost:3000';
    document.body.prepend(banner);
}

window.sistema = {
    // Exporta todo o histórico de eventos como JSON
    exportarDados: async () => {
        try {
            const res  = await fetch(`${API_URL}/historico?limit=10000`);
            const logs = await res.json();
            const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `historico_vagacerta_${new Date().toISOString().slice(0,10)}.json`;
            a.click();
        } catch {
            alert('❌ Erro ao exportar. Verifique se o servidor está rodando.');
        }
    },

    // Gera relatório PDF com estatísticas, histórico e sessões completas
    gerarRelatorioPDF: async () => {
        if (!window.jspdf) { alert('Biblioteca PDF não carregada.'); return; }
        try {
            const res  = await fetch(`${API_URL}/relatorio`);
            const data = await res.json();
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const agora = new Date().toLocaleString('pt-BR');

            // Cabeçalho
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('VAGA CERTA — RELATÓRIO DE MONITORAMENTO', 14, 18);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Gerado em: ${agora}`, 14, 25);

            // Estatísticas gerais
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Resumo Geral', 14, 35);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const s = data.stats;
            const d = data.duracao;
            doc.text(`Total de eventos: ${s.total_eventos}  |  Entradas: ${s.total_entradas}  |  Saídas: ${s.total_saidas}  |  Vagas utilizadas: ${s.vagas_utilizadas}`, 14, 42);
            if (d && d.total_sessoes > 0) {
                doc.text(`Sessões concluídas: ${d.total_sessoes}  |  Duração média: ${d.media_minutos} min  |  Máx: ${d.max_minutos} min  |  Mín: ${d.min_minutos} min`, 14, 49);
            }
            if (data.vagaMaisMovimentada) {
                doc.text(`Vaga mais movimentada: Vaga ${String(data.vagaMaisMovimentada.vaga_numero).padStart(2,'0')} (${data.vagaMaisMovimentada.total} entradas)`, 14, 56);
            }

            // Histórico de eventos
            let y = 66;
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Histórico de Eventos (últimos 200)', 14, y);
            y += 7;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text('Data/Hora                  Tipo       Vaga   Distância', 14, y);
            y += 5;
            doc.line(14, y, 196, y);
            y += 4;

            for (const l of data.historico) {
                const dt   = new Date(l.registrado_em).toLocaleString('pt-BR');
                const vaga = String(l.vaga_numero).padStart(2, '0');
                const dist = l.distancia_cm != null ? `${l.distancia_cm} cm` : '—';
                doc.text(`${dt.padEnd(22)} ${l.tipo.padEnd(10)} ${vaga.padEnd(6)} ${dist}`, 14, y);
                y += 6;
                if (y > 270) { doc.addPage(); y = 14; }
            }

            // Sessões completas
            if (data.sessoes && data.sessoes.length > 0) {
                doc.addPage();
                y = 14;
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text('Sessões de Ocupação (últimas 100)', 14, y);
                y += 7;
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text('Vaga   Entrada                  Saída                    Duração', 14, y);
                y += 5;
                doc.line(14, y, 196, y);
                y += 4;

                for (const sess of data.sessoes) {
                    const vaga    = String(sess.vaga_numero).padStart(2, '0');
                    const entrada = new Date(sess.entrada_em).toLocaleString('pt-BR');
                    const saida   = sess.saida_em ? new Date(sess.saida_em).toLocaleString('pt-BR') : 'Em aberto';
                    const dur     = sess.duracao_minutos != null ? `${sess.duracao_minutos} min` : '—';
                    doc.text(`${vaga.padEnd(6)} ${entrada.padEnd(24)} ${saida.padEnd(24)} ${dur}`, 14, y);
                    y += 6;
                    if (y > 270) { doc.addPage(); y = 14; }
                }
            }

            doc.save(`Relatorio_VagaCerta_${new Date().toISOString().slice(0,10)}.pdf`);
        } catch {
            alert('❌ Erro ao gerar PDF. Verifique se o servidor está rodando.');
        }
    }
};

// Limpa histórico e sessões do banco (vagas são resetadas para VERDE pelo servidor)
async function limparHistorico() {
    if (confirm("⚠️  Isso apagará todo o histórico de eventos e sessões. Confirmar?")) {
        try {
            await fetch(`${API_URL}/historico`, { method: 'DELETE' });
            location.reload();
        } catch {
            alert('❌ Erro ao limpar. Verifique se o servidor está rodando.');
        }
    }
}