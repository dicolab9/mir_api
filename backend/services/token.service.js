const pool = require('../config/db');
const gerarToken = require('../utils/tokenGenerator');

// Mapeamento de tabelas permitidas (whitelist)
const TABELAS_PERMITIDAS = {
  'lexical_nome': 'lexical_nome',
  'lexical_sobrenome': 'lexical_sobrenome',
  'lexical_rua': 'lexical_rua',
  'lexical_cidade': 'lexical_cidade',
  'lexical_cep': 'lexical_cep'
};

async function obterOuCriarToken(tabela, prefixo, valor) {
  // Validar tabela contra whitelist
  const tabelaValidada = TABELAS_PERMITIDAS[tabela];
  if (!tabelaValidada) {
    throw new Error(`Tabela não permitida: ${tabela}`);
  }
  
  valor = valor.trim();
  if (!valor) {
    throw new Error('Valor não pode ser vazio');
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Buscar token existente (usando query com escape)
    const busca = await client.query(`
      SELECT id, token, frequencia
      FROM ${tabelaValidada}
      WHERE LOWER(valor) = LOWER($1)
    `, [valor]);

    if (busca.rows.length > 0) {
      const registro = busca.rows[0];
      
      // Atualizar frequência
      await client.query(`
        UPDATE ${tabelaValidada}
        SET frequencia = frequencia + 1
        WHERE id = $1
      `, [registro.id]);
      
      await client.query('COMMIT');
      return registro.token;
    }

    // Gerar novo token usando SEQUENCE ou MAX(id)
    const maxId = await client.query(`
      SELECT COALESCE(MAX(id), 0) + 1 AS proximo_id
      FROM ${tabelaValidada}
    `);
    
    const token = gerarToken(prefixo, maxId.rows[0].proximo_id);

    await client.query(`
      INSERT INTO ${tabelaValidada}
      (token, valor, frequencia)
      VALUES ($1, $2, 1)
    `, [token, valor]);
    
    await client.query('COMMIT');
    return token;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  obterOuCriarToken
};