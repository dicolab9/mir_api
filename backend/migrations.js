const pool = require('./db');
require('dotenv').config();

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
    // LEXICAL NOME
    //--------------------------------------------------

    await pool.query(`
      CREATE TABLE IF NOT EXISTS lexical_nome (
          id SERIAL PRIMARY KEY,
          token VARCHAR(10) UNIQUE,
          valor VARCHAR(100) UNIQUE,
          frequencia INT DEFAULT 1
      );
    `);

    console.log('✓ lexical_nome criada');

    //--------------------------------------------------
    // LEXICAL SOBRENOME
    //--------------------------------------------------

    await pool.query(`
      CREATE TABLE IF NOT EXISTS lexical_sobrenome (
          id SERIAL PRIMARY KEY,
          token VARCHAR(10) UNIQUE,
          valor VARCHAR(100) UNIQUE,
          frequencia INT DEFAULT 1
      );
    `);

    console.log('✓ lexical_sobrenome criada');

    //--------------------------------------------------
    // LEXICAL RUA
    //--------------------------------------------------

    await pool.query(`
      CREATE TABLE IF NOT EXISTS lexical_rua (
          id SERIAL PRIMARY KEY,
          token VARCHAR(10) UNIQUE,
          valor VARCHAR(150) UNIQUE,
          frequencia INT DEFAULT 1
      );
    `);

    console.log('✓ lexical_rua criada');

    //--------------------------------------------------
    // LEXICAL CIDADE
    //--------------------------------------------------

    await pool.query(`
      CREATE TABLE IF NOT EXISTS lexical_cidade (
          id SERIAL PRIMARY KEY,
          token VARCHAR(10) UNIQUE,
          valor VARCHAR(100) UNIQUE,
          frequencia INT DEFAULT 1
      );
    `);

    console.log('✓ lexical_cidade criada');

    //--------------------------------------------------
    // LEXICAL CEP
    //--------------------------------------------------

    await pool.query(`
      CREATE TABLE IF NOT EXISTS lexical_cep (
          id SERIAL PRIMARY KEY,
          token VARCHAR(10) UNIQUE,
          valor VARCHAR(20) UNIQUE,
          frequencia INT DEFAULT 1
      );
    `);

    console.log('✓ lexical_cep criada');

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

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_nome_token
      ON pessoas_mir(nome_token);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sobrenome_token
      ON pessoas_mir(sobrenome_token);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_rua_token
      ON pessoas_mir(rua_token);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_cidade_token
      ON pessoas_mir(cidade_token);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_cep_token
      ON pessoas_mir(cep_token);
    `);

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
