/**
 * server.js - API REST do sistema Vaga Certa
 *
 * Usa o módulo nativo node:sqlite (estável no Node.js >= 22.10.0).
 * Pré-requisito: Node.js >= 22.10.0  |  npm install  (apenas Express)
 *
 * Inicie com:  node server.js
 * Acesse em:   http://localhost:3000
 *
 * Endpoints:
 *   GET    /api/configuracoes         → lê configuração atual
 *   POST   /api/configuracoes         → salva nova configuração
 *   GET    /api/vagas                 → retorna estado atual de todas as vagas
 *   POST   /api/historico             → registra evento ENTRADA ou SAIDA
 *   GET    /api/historico?limit=N     → retorna últimos N eventos
 *   GET    /api/relatorio             → estatísticas + sessões para PDF
 *   DELETE /api/historico             → apaga histórico e sessões
 */

const express = require('express');
const path    = require('path');
const db      = require('./database');

const app  = express();
const PORT = 3000;

app.use(express.json());

// Serve os arquivos estáticos do projeto (index.html, config.html, scripts/, styles/)
app.use(express.static(path.join(__dirname, '..')));

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function agora() {
  return new Date().toISOString();
}

// Executa fn() dentro de uma transação SQLite
function transacao(fn) {
  db.exec('BEGIN');
  try {
    const resultado = fn();
    db.exec('COMMIT');
    return resultado;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// ─── CONFIGURAÇÕES ───────────────────────────────────────────────────────────

app.get('/api/configuracoes', (req, res) => {
  const config = db.prepare('SELECT * FROM configuracoes WHERE id = 1').get();
  res.json(config);
});

app.post('/api/configuracoes', (req, res) => {
  const { qtd_vagas, limite_cm } = req.body;

  if (
    !Number.isInteger(qtd_vagas) || qtd_vagas < 1 || qtd_vagas > 50 ||
    !Number.isInteger(limite_cm)  || limite_cm  < 1 || limite_cm  > 300
  ) {
    return res.status(400).json({ erro: 'Valores inválidos. Vagas: 1-50, Limite: 1-300 cm.' });
  }

  transacao(() => {
    db.prepare(`
      UPDATE configuracoes
      SET qtd_vagas = ?, limite_cm = ?, atualizado_em = ?
      WHERE id = 1
    `).run(qtd_vagas, limite_cm, agora());

    // Recria vagas se a quantidade mudou
    const atual = db.prepare('SELECT COUNT(*) AS c FROM vagas').get().c;
    if (atual !== qtd_vagas) {
      db.prepare('DELETE FROM vagas').run();
      const ins = db.prepare(`INSERT INTO vagas (numero, status) VALUES (?, 'VERDE')`);
      for (let i = 1; i <= qtd_vagas; i++) ins.run(i);
    }
  });

  res.json({ ok: true });
});

// ─── VAGAS ────────────────────────────────────────────────────────────────────

app.get('/api/vagas', (req, res) => {
  const config = db.prepare('SELECT qtd_vagas FROM configuracoes WHERE id = 1').get();

  // Garante que a quantidade de vagas no DB bate com a config
  const count = db.prepare('SELECT COUNT(*) AS c FROM vagas').get().c;
  if (count !== config.qtd_vagas) {
    transacao(() => {
      db.prepare('DELETE FROM vagas').run();
      const ins = db.prepare(`INSERT INTO vagas (numero, status) VALUES (?, 'VERDE')`);
      for (let i = 1; i <= config.qtd_vagas; i++) ins.run(i);
    });
  }

  const vagas = db.prepare('SELECT * FROM vagas ORDER BY numero').all();
  res.json(vagas);
});

// ─── HISTÓRICO ───────────────────────────────────────────────────────────────

app.get('/api/historico', (req, res) => {
  // Sem limit explícito → retorna tudo (útil para a tela de administrador)
  const limit   = parseInt(req.query.limit) || 1_000_000;
  const vagaNum = parseInt(req.query.vaga)  || null;

  const logs = vagaNum
    ? db.prepare(`SELECT * FROM historico WHERE vaga_numero = ? ORDER BY registrado_em DESC LIMIT ?`).all(vagaNum, limit)
    : db.prepare(`SELECT * FROM historico ORDER BY registrado_em DESC LIMIT ?`).all(limit);

  res.json(logs);
});

// Sessões com filtro opcional por vaga
app.get('/api/sessoes', (req, res) => {
  const vagaNum = parseInt(req.query.vaga) || null;
  const sessoes = vagaNum
    ? db.prepare(`SELECT * FROM sessoes WHERE vaga_numero = ? ORDER BY entrada_em DESC`).all(vagaNum)
    : db.prepare(`SELECT * FROM sessoes ORDER BY entrada_em DESC`).all();
  res.json(sessoes);
});

// Estatísticas com filtro opcional por vaga
app.get('/api/stats', (req, res) => {
  const vagaNum = parseInt(req.query.vaga) || null;

  let evStats, durStats;
  if (vagaNum) {
    evStats = db.prepare(`
      SELECT COUNT(*) AS total_eventos,
        SUM(CASE WHEN tipo = 'ENTRADA' THEN 1 ELSE 0 END) AS total_entradas,
        SUM(CASE WHEN tipo = 'SAIDA'   THEN 1 ELSE 0 END) AS total_saidas
      FROM historico WHERE vaga_numero = ?
    `).get(vagaNum);
    durStats = db.prepare(`
      SELECT ROUND(AVG(duracao_minutos), 2) AS media_minutos,
        ROUND(MAX(duracao_minutos), 2) AS max_minutos,
        COUNT(*) AS total_sessoes
      FROM sessoes WHERE duracao_minutos IS NOT NULL AND vaga_numero = ?
    `).get(vagaNum);
  } else {
    evStats = db.prepare(`
      SELECT COUNT(*) AS total_eventos,
        SUM(CASE WHEN tipo = 'ENTRADA' THEN 1 ELSE 0 END) AS total_entradas,
        SUM(CASE WHEN tipo = 'SAIDA'   THEN 1 ELSE 0 END) AS total_saidas
      FROM historico
    `).get();
    durStats = db.prepare(`
      SELECT ROUND(AVG(duracao_minutos), 2) AS media_minutos,
        ROUND(MAX(duracao_minutos), 2) AS max_minutos,
        COUNT(*) AS total_sessoes
      FROM sessoes WHERE duracao_minutos IS NOT NULL
    `).get();
  }

  res.json({ ...evStats, ...durStats });
});

app.post('/api/historico', (req, res) => {
  const { vaga_numero, tipo, distancia_cm } = req.body;

  if (!['ENTRADA', 'SAIDA'].includes(tipo) || !Number.isInteger(vaga_numero)) {
    return res.status(400).json({ erro: 'Dados inválidos.' });
  }

  const timestamp = agora();

  transacao(() => {
    // 1. Insere no histórico
    db.prepare(`
      INSERT INTO historico (vaga_numero, tipo, distancia_cm, registrado_em)
      VALUES (?, ?, ?, ?)
    `).run(vaga_numero, tipo, distancia_cm ?? null, timestamp);

    // 2. Atualiza status da vaga
    const novoStatus = tipo === 'ENTRADA' ? 'VERMELHO' : 'VERDE';
    db.prepare(`
      UPDATE vagas SET status = ?, atualizado_em = ? WHERE numero = ?
    `).run(novoStatus, timestamp, vaga_numero);

    // 3. Gerencia sessões
    if (tipo === 'ENTRADA') {
      db.prepare(`
        INSERT INTO sessoes (vaga_numero, entrada_em, distancia_entrada_cm)
        VALUES (?, ?, ?)
      `).run(vaga_numero, timestamp, distancia_cm ?? null);
    } else {
      // Fecha a sessão aberta mais recente desta vaga
      const sessao = db.prepare(`
        SELECT id, entrada_em FROM sessoes
        WHERE vaga_numero = ? AND saida_em IS NULL
        ORDER BY entrada_em DESC LIMIT 1
      `).get(vaga_numero);

      if (sessao) {
        const duracaoMin = (
          (new Date(timestamp).getTime() - new Date(sessao.entrada_em).getTime()) / 60000
        ).toFixed(2);

        db.prepare(`
          UPDATE sessoes
          SET saida_em = ?, duracao_minutos = ?, distancia_saida_cm = ?
          WHERE id = ?
        `).run(timestamp, parseFloat(duracaoMin), distancia_cm ?? null, sessao.id);
      }
    }
  });

  res.json({ ok: true });
});

app.delete('/api/historico', (req, res) => {
  transacao(() => {
    db.prepare('DELETE FROM historico').run();
    db.prepare('DELETE FROM sessoes').run();
    // Reseta todas as vagas para VERDE
    db.prepare(`UPDATE vagas SET status = 'VERDE', atualizado_em = ?`).run(agora());
  });
  res.json({ ok: true });
});

// ─── RELATÓRIO ───────────────────────────────────────────────────────────────

app.get('/api/relatorio', (req, res) => {
  const historico = db.prepare(`
    SELECT * FROM historico ORDER BY registrado_em DESC LIMIT 200
  `).all();

  const sessoes = db.prepare(`
    SELECT * FROM sessoes ORDER BY entrada_em DESC LIMIT 100
  `).all();

  const stats = db.prepare(`
    SELECT
      COUNT(*)                                                   AS total_eventos,
      SUM(CASE WHEN tipo = 'ENTRADA' THEN 1 ELSE 0 END)         AS total_entradas,
      SUM(CASE WHEN tipo = 'SAIDA'   THEN 1 ELSE 0 END)         AS total_saidas,
      COUNT(DISTINCT vaga_numero)                                AS vagas_utilizadas
    FROM historico
  `).get();

  const duracao = db.prepare(`
    SELECT
      ROUND(AVG(duracao_minutos), 2)  AS media_minutos,
      ROUND(MAX(duracao_minutos), 2)  AS max_minutos,
      ROUND(MIN(duracao_minutos), 2)  AS min_minutos,
      COUNT(*)                        AS total_sessoes
    FROM sessoes
    WHERE duracao_minutos IS NOT NULL
  `).get();

  const vagaMaisMovimentada = db.prepare(`
    SELECT vaga_numero, COUNT(*) AS total
    FROM historico WHERE tipo = 'ENTRADA'
    GROUP BY vaga_numero
    ORDER BY total DESC LIMIT 1
  `).get();

  res.json({
    historico,
    sessoes,
    stats,
    duracao,
    vagaMaisMovimentada: vagaMaisMovimentada || null
  });
});

// ─── INICIALIZAÇÃO ───────────────────────────────────────────────────────────

app.listen(PORT, () => {
  const config = db.prepare('SELECT qtd_vagas, limite_cm FROM configuracoes WHERE id = 1').get();
  const totalEventos = db.prepare('SELECT COUNT(*) AS c FROM historico').get().c;
  const totalSessoes = db.prepare('SELECT COUNT(*) AS c FROM sessoes').get().c;

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║       🚗  VAGA CERTA  — SERVIDOR          ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  URL:      http://localhost:${PORT}          ║`);
  console.log(`║  Vagas:    ${String(config.qtd_vagas).padEnd(4)}  Sensor: ${String(config.limite_cm).padEnd(5)} cm  ║`);
  console.log(`║  Eventos:  ${String(totalEventos).padEnd(6)}  Sessões: ${String(totalSessoes).padEnd(6)}      ║`);
  console.log('║  Banco:    backend/vagacerta.db           ║');
  console.log('╚══════════════════════════════════════════╝\n');
});
