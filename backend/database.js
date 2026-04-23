/**
 * database.js - Configuração e inicialização do banco de dados SQLite
 * Banco: vagacerta.db
 *
 * Usa o módulo nativo node:sqlite (estável no Node.js >= 22.10.0).
 * Nenhuma dependência externa necessária.
 *
 * Tabelas:
 *  - configuracoes : parâmetros do sistema (qtd de vagas, limite do sensor)
 *  - vagas         : estado atual de cada vaga (VERDE = livre, VERMELHO = ocupada)
 *  - historico     : registro de todos os eventos de ENTRADA e SAIDA
 *  - sessoes       : períodos completos de ocupação (entrada até saída + duração)
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'vagacerta.db'));

// WAL melhora performance em leituras concorrentes
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ─── CRIAÇÃO DAS TABELAS ─────────────────────────────────────────────────────

db.exec(`
  -- Configurações do sistema (sempre 1 linha, id=1)
  CREATE TABLE IF NOT EXISTS configuracoes (
    id          INTEGER PRIMARY KEY CHECK(id = 1),
    qtd_vagas   INTEGER NOT NULL DEFAULT 5  CHECK(qtd_vagas  BETWEEN 1 AND 50),
    limite_cm   INTEGER NOT NULL DEFAULT 50 CHECK(limite_cm  BETWEEN 1 AND 300),
    atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  -- Estado atual de cada vaga
  CREATE TABLE IF NOT EXISTS vagas (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    numero        INTEGER NOT NULL UNIQUE,
    status        TEXT    NOT NULL DEFAULT 'VERDE'
                          CHECK(status IN ('VERDE', 'VERMELHO')),
    atualizado_em TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  -- Histórico de eventos individuais (ENTRADA / SAIDA)
  CREATE TABLE IF NOT EXISTS historico (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    vaga_numero   INTEGER NOT NULL,
    tipo          TEXT    NOT NULL CHECK(tipo IN ('ENTRADA', 'SAIDA')),
    distancia_cm  INTEGER,
    registrado_em TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  -- Sessões completas de ocupação (do estacionamento ao desembarque)
  CREATE TABLE IF NOT EXISTS sessoes (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    vaga_numero          INTEGER NOT NULL,
    entrada_em           TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    saida_em             TEXT,
    duracao_minutos      REAL,
    distancia_entrada_cm INTEGER,
    distancia_saida_cm   INTEGER
  );

  -- Índices para consultas comuns
  CREATE INDEX IF NOT EXISTS idx_historico_vaga    ON historico (vaga_numero);
  CREATE INDEX IF NOT EXISTS idx_historico_tipo    ON historico (tipo);
  CREATE INDEX IF NOT EXISTS idx_historico_data    ON historico (registrado_em);
  CREATE INDEX IF NOT EXISTS idx_sessoes_vaga      ON sessoes   (vaga_numero);
  CREATE INDEX IF NOT EXISTS idx_sessoes_aberta    ON sessoes   (vaga_numero, saida_em);
`);

// ─── SEMENTE INICIAL ─────────────────────────────────────────────────────────

// Configuração padrão (apenas se nunca foi criada)
const configExiste = db.prepare('SELECT COUNT(*) AS c FROM configuracoes').get();
if (configExiste.c === 0) {
  db.prepare(`
    INSERT INTO configuracoes (id, qtd_vagas, limite_cm)
    VALUES (1, 5, 50)
  `).run();
}

// Cria vagas conforme a config atual (se a tabela estiver vazia)
const vagasExistem = db.prepare('SELECT COUNT(*) AS c FROM vagas').get();
if (vagasExistem.c === 0) {
  const cfg = db.prepare('SELECT qtd_vagas FROM configuracoes WHERE id = 1').get();
  const insert = db.prepare(`INSERT INTO vagas (numero, status) VALUES (?, 'VERDE')`);
  db.exec('BEGIN');
  for (let i = 1; i <= cfg.qtd_vagas; i++) insert.run(i);
  db.exec('COMMIT');
}

module.exports = db;
