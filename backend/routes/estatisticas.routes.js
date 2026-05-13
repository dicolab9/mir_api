const router = require('express').Router();
const pool = require('../config/db');

// Função auxiliar para calcular bytes aproximados
async function calcularBytesTabela(tabela) {
  const result = await pool.query(`
    SELECT 
      COALESCE(SUM(
        pg_column_size(tabela.*)
      ), 0) AS bytes
    FROM ${tabela} tabela
  `);
  return parseInt(result.rows[0].bytes);
}

router.get('/', async (req, res) => {
  try {
    // Contagem de registros
    const normalCount = await pool.query(`
      SELECT COUNT(*) AS total FROM pessoas_normal
    `);
    
    const mirCount = await pool.query(`
      SELECT COUNT(*) AS total FROM pessoas_mir
    `);

    // Calcular bytes por tabela
    const normalBytes = await calcularBytesTabela('pessoas_normal');
    const mirBytes = await calcularBytesTabela('pessoas_mir');
    
    // Bytes das tabelas lexicais
    const lexicalBytes = await calcularBytesTabela('lexical_nome') +
                         await calcularBytesTabela('lexical_sobrenome') +
                         await calcularBytesTabela('lexical_rua') +
                         await calcularBytesTabela('lexical_cidade') +
                         await calcularBytesTabela('lexical_cep');
    
    const totalMirBytes = mirBytes + lexicalBytes;
    
    // Calcular economia percentual
    const economiaPerc = normalBytes > 0
      ? ((normalBytes - totalMirBytes) / normalBytes * 100).toFixed(1)
      : 0;

    res.json({
      normal: parseInt(normalCount.rows[0].total),
      mir: parseInt(mirCount.rows[0].total),
      normal_bytes: normalBytes,
      mir_bytes: mirBytes,
      lexical_bytes: lexicalBytes,
      total_mir: totalMirBytes,
      economia_percentual: parseFloat(economiaPerc)
    });

  } catch (error) {
    console.error('Erro nas estatísticas:', error);
    res.status(500).json({
      erro: 'Erro ao buscar estatísticas',
      detalhe: error.message
    });
  }
});

module.exports = router;