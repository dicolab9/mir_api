const router = require('express').Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
  try {
    // Contagem de registros
    const normalCount = await pool.query(`SELECT COUNT(*) FROM pessoas_normal`);
    const mirCount = await pool.query(`SELECT COUNT(*) FROM pessoas_mir`);
    
    // Contagem de tokens únicos
    const tokensCount = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM lexical_nome) as nomes,
        (SELECT COUNT(*) FROM lexical_sobrenome) as sobrenomes,
        (SELECT COUNT(*) FROM lexical_rua) as ruas,
        (SELECT COUNT(*) FROM lexical_cidade) as cidades,
        (SELECT COUNT(*) FROM lexical_cep) as ceps
    `);
    
    // Estimativa de bytes baseada em caracteres (1 caractere = 1 byte aproximado)
    // Tamanho médio dos campos (estimativa conservadora)
    const TAMANHO_MEDIO_NORMAL = {
      nome: 15,
      sobrenome: 20,
      rua: 25,
      cidade: 18,
      cep: 8,
      cpf: 11
    };
    
    const TAMANHO_MEDIO_TOKEN = {
      nome: 3,
      sobrenome: 5,  // composto pode ter pipe
      rua: 3,
      cidade: 3,
      cep: 3,
      cpf_mne: 6
    };
    
    const totalRegistros = parseInt(normalCount.rows[0].count);
    
    // Calcular bytes estimados
    const normalBytes = totalRegistros * (
      TAMANHO_MEDIO_NORMAL.nome +
      TAMANHO_MEDIO_NORMAL.sobrenome +
      TAMANHO_MEDIO_NORMAL.rua +
      TAMANHO_MEDIO_NORMAL.cidade +
      TAMANHO_MEDIO_NORMAL.cep +
      TAMANHO_MEDIO_NORMAL.cpf
    );
    
    const mirBytes = totalRegistros * (
      TAMANHO_MEDIO_TOKEN.nome +
      TAMANHO_MEDIO_TOKEN.sobrenome +
      TAMANHO_MEDIO_TOKEN.rua +
      TAMANHO_MEDIO_TOKEN.cidade +
      TAMANHO_MEDIO_TOKEN.cep +
      TAMANHO_MEDIO_TOKEN.cpf_mne
    );
    
    // Overhead das tabelas lexicais (estimativa: ~50 bytes por token)
    const totalTokens = 
      parseInt(tokensCount.rows[0].nomes || 0) +
      parseInt(tokensCount.rows[0].sobrenomes || 0) +
      parseInt(tokensCount.rows[0].ruas || 0) +
      parseInt(tokensCount.rows[0].cidades || 0) +
      parseInt(tokensCount.rows[0].ceps || 0);
    
    const lexicalBytes = totalTokens * 50;
    const totalMirBytes = mirBytes + lexicalBytes;
    
    // Economia percentual
    const economia = normalBytes > 0
      ? ((normalBytes - totalMirBytes) / normalBytes * 100).toFixed(2)
      : 0;
    
    res.json({
      normal: totalRegistros,
      mir: totalRegistros,
      normal_bytes: normalBytes,
      mir_bytes: mirBytes,
      lexical_bytes: lexicalBytes,
      total_mir: totalMirBytes,
      economia_percentual: parseFloat(economia),
      detalhes: {
        registros: totalRegistros,
        tokens_unicos: totalTokens,
        explicacao: totalRegistros < 1000 
          ? "Com poucos registros, o overhead das tabelas lexicais pode não ter sido compensado ainda."
          : "Com muitos registros, o MIR/MNE começa a mostrar economia real."
      }
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

// const router = require('express').Router();
// const pool = require('../config/db');

// router.get('/', async (req, res) => {
//   try {
//     // Contagem de registros
//     const normalCount = await pool.query(`SELECT COUNT(*) FROM pessoas_normal`);
//     const mirCount = await pool.query(`SELECT COUNT(*) FROM pessoas_mir`);
    
//     // Contagem de registros nas tabelas lexicais
//     const lexicalNomesCount = await pool.query(`SELECT COUNT(*) FROM lexical_nome`);
//     const lexicalSobrenomesCount = await pool.query(`SELECT COUNT(*) FROM lexical_sobrenome`);
//     const lexicalRuasCount = await pool.query(`SELECT COUNT(*) FROM lexical_rua`);
//     const lexicalCidadesCount = await pool.query(`SELECT COUNT(*) FROM lexical_cidade`);
//     const lexicalCepsCount = await pool.query(`SELECT COUNT(*) FROM lexical_cep`);
    
//     // Calcular tamanho aproximado usando LENGTH (caracteres) em vez de bytes
//     // Para uma estimativa confiável, consideramos que 1 caractere = 1 byte (UTF-8 para ASCII)
    
//     // Tamanho dos dados normais
//     const normalData = await pool.query(`
//       SELECT 
//         COALESCE(SUM(LENGTH(nome) + LENGTH(sobrenome) + LENGTH(rua) + 
//                LENGTH(cidade) + LENGTH(cep) + LENGTH(cpf)), 0) as total
//       FROM pessoas_normal
//     `);
    
//     // Tamanho dos dados MIR (apenas tokens)
//     const mirData = await pool.query(`
//       SELECT 
//         COALESCE(SUM(LENGTH(nome_token) + LENGTH(sobrenome_token) + LENGTH(rua_token) + 
//                LENGTH(cidade_token) + LENGTH(cep_token) + LENGTH(cpf_mne)), 0) as total
//       FROM pessoas_mir
//     `);
    
//     // Calcular overhead das tabelas lexicais
//     // Estimativa conservadora: cada registro lexical ocupa ~50 bytes (token + valor + metadados)
//     const LEXICAL_OVERHEAD_ESTIMADO = 50;
    
//     const totalTokensLexicais = 
//       (lexicalNomesCount.rows[0].count || 0) +
//       (lexicalSobrenomesCount.rows[0].count || 0) +
//       (lexicalRuasCount.rows[0].count || 0) +
//       (lexicalCidadesCount.rows[0].count || 0) +
//       (lexicalCepsCount.rows[0].count || 0);
    
//     const lexicalBytes = totalTokensLexicais * LEXICAL_OVERHEAD_ESTIMADO;
    
//     const normalBytes = parseInt(normalData.rows[0].total || 0);
//     const mirBytes = parseInt(mirData.rows[0].total || 0);
//     const totalMirBytes = mirBytes + lexicalBytes;
    
//     // Cálculo da economia
//     const economia = normalBytes > 0
//       ? ((normalBytes - totalMirBytes) / normalBytes * 100).toFixed(2)
//       : 0;
    
//     res.json({
//       normal: parseInt(normalCount.rows[0].count),
//       mir: parseInt(mirCount.rows[0].count),
//       normal_bytes: normalBytes,
//       mir_bytes: mirBytes,
//       lexical_bytes: lexicalBytes,
//       total_mir: totalMirBytes,
//       economia_percentual: parseFloat(economia),
//       tokens_unicos: {
//         nomes: parseInt(lexicalNomesCount.rows[0].count),
//         sobrenomes: parseInt(lexicalSobrenomesCount.rows[0].count),
//         ruas: parseInt(lexicalRuasCount.rows[0].count),
//         cidades: parseInt(lexicalCidadesCount.rows[0].count),
//         ceps: parseInt(lexicalCepsCount.rows[0].count),
//         total: totalTokensLexicais
//       }
//     });
    
//   } catch (error) {
//     console.error('Erro nas estatísticas:', error);
//     res.status(500).json({ 
//       erro: 'Erro ao buscar estatísticas', 
//       detalhe: error.message 
//     });
//   }
// });

// module.exports = router;

// // const router = require('express').Router();
// // const pool = require('../config/db');

// // // Função auxiliar para calcular bytes aproximados
// // async function calcularBytesTabela(tabela) {
// //   const result = await pool.query(`
// //     SELECT 
// //       COALESCE(SUM(
// //         pg_column_size(tabela.*)
// //       ), 0) AS bytes
// //     FROM ${tabela} tabela
// //   `);
// //   return parseInt(result.rows[0].bytes);
// // }

// // router.get('/', async (req, res) => {
// //   try {
// //     // Contagem de registros
// //     const normalCount = await pool.query(`
// //       SELECT COUNT(*) AS total FROM pessoas_normal
// //     `);
    
// //     const mirCount = await pool.query(`
// //       SELECT COUNT(*) AS total FROM pessoas_mir
// //     `);

// //     // Calcular bytes por tabela
// //     const normalBytes = await calcularBytesTabela('pessoas_normal');
// //     const mirBytes = await calcularBytesTabela('pessoas_mir');
    
// //     // Bytes das tabelas lexicais
// //     const lexicalBytes = await calcularBytesTabela('lexical_nome') +
// //                          await calcularBytesTabela('lexical_sobrenome') +
// //                          await calcularBytesTabela('lexical_rua') +
// //                          await calcularBytesTabela('lexical_cidade') +
// //                          await calcularBytesTabela('lexical_cep');
    
// //     const totalMirBytes = mirBytes + lexicalBytes;
    
// //     // Calcular economia percentual
// //     const economiaPerc = normalBytes > 0
// //       ? ((normalBytes - totalMirBytes) / normalBytes * 100).toFixed(1)
// //       : 0;

// //     res.json({
// //       normal: parseInt(normalCount.rows[0].total),
// //       mir: parseInt(mirCount.rows[0].total),
// //       normal_bytes: normalBytes,
// //       mir_bytes: mirBytes,
// //       lexical_bytes: lexicalBytes,
// //       total_mir: totalMirBytes,
// //       economia_percentual: parseFloat(economiaPerc)
// //     });

// //   } catch (error) {
// //     console.error('Erro nas estatísticas:', error);
// //     res.status(500).json({
// //       erro: 'Erro ao buscar estatísticas',
// //       detalhe: error.message
// //     });
// //   }
// // });

// // module.exports = router;