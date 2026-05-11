const pool = require('./db');
require('dotenv').config();

const lexicalTables = [
  { name: 'lexical_nome', size: 100 },
  { name: 'lexical_sobrenome', size: 100 },
  { name: 'lexical_rua', size: 150 },
  { name: 'lexical_cidade', size: 100 },
  { name: 'lexical_cep', size: 20 }
];

const indexes = [
  'nome_token',
  'sobrenome_token',
  'rua_token',
  'cidade_token',
  'cep_token'
];

async function createLexicalTable(tableName, size) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id SERIAL PRIMARY KEY,
      token VARCHAR(10) UNIQUE,
      valor VARCHAR(${size}) UNIQUE,
      frequencia INT DEFAULT 1
    );
  `);

  console.log(`✓ ${tableName} criada`);
}

async function createIndex(column) {
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_${column}
    ON pessoas_mir(${column});
  `);
}

async function migrate() {
  try {
    console.log('------------------------------------');
    console.log('INICIANDO MIGRATIONS MIR + MNE');
    console.log('------------------------------------');

    //--------------------------------------------------
    // TABELA NORMAL
    //--------------------------------------------------
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pessoas_normal (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100),
        sobrenome VARCHAR(100),
        rua VARCHAR(150),
        casa VARCHAR(20),
        cidade VARCHAR(100),
        cep VARCHAR(20),
        cpf VARCHAR(14)
      );
    `);

    console.log('✓ pessoas_normal criada');

    //--------------------------------------------------
    // TABELAS LEXICAIS
    //--------------------------------------------------
    for (const table of lexicalTables) {
      await createLexicalTable(table.name, table.size);
    }

    //--------------------------------------------------
    // TABELA MIR
    //--------------------------------------------------
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pessoas_mir (
        id SERIAL PRIMARY KEY,
        nome_token VARCHAR(10),
        sobrenome_token VARCHAR(10),
        rua_token VARCHAR(10),
        casa VARCHAR(20),
        cidade_token VARCHAR(10),
        cep_token VARCHAR(10),
        cpf_mne VARCHAR(20)
      );
    `);

    console.log('✓ pessoas_mir criada');

    //--------------------------------------------------
    // ÍNDICES
    //--------------------------------------------------
    for (const column of indexes) {
      await createIndex(column);
    }

    console.log('✓ índices criados');

    //--------------------------------------------------
    // FINALIZAÇÃO
    //--------------------------------------------------
    console.log('------------------------------------');
    console.log('MIGRATIONS FINALIZADAS');
    console.log('------------------------------------');

  } catch (error) {
    console.error('ERRO NAS MIGRATIONS');
    console.error(error);
  }
}

migrate();

module.exports = migrate;
