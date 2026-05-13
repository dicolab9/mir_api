const router = require('express').Router();
const pool = require('../config/db');
const { decodeBase62 } = require('../utils/base62');
const { calcularDigitosVerificadores, formatarCPF } = require('../services/cpf.service');
const { reconstruirSobrenome } = require('../services/mir.service');

router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const pessoas = await pool.query(`
      SELECT 
        pm.id,
        pm.casa,
        pm.cpf_mne,
        pm.nome_token,
        pm.sobrenome_token,
        pm.rua_token,
        pm.cidade_token,
        pm.cep_token
      FROM pessoas_mir pm
      ORDER BY pm.id DESC
      LIMIT 100
    `);

    const dados = [];

    for (const pessoa of pessoas.rows) {
      // Buscar nome
      const nomeResult = await pool.query(`
        SELECT valor 
        FROM lexical_nome 
        WHERE token = $1
      `, [pessoa.nome_token]);
      
      // Buscar rua
      const ruaResult = await pool.query(`
        SELECT valor 
        FROM lexical_rua 
        WHERE token = $1
      `, [pessoa.rua_token]);
      
      // Buscar cidade
      const cidadeResult = await pool.query(`
        SELECT valor 
        FROM lexical_cidade 
        WHERE token = $1
      `, [pessoa.cidade_token]);
      
      // Buscar CEP
      const cepResult = await pool.query(`
        SELECT valor 
        FROM lexical_cep 
        WHERE token = $1
      `, [pessoa.cep_token]);
      
      // Reconstruir sobrenome
      const sobrenomeCompleto = pessoa.sobrenome_token
        ? await reconstruirSobrenome(pessoa.sobrenome_token)
        : '';
      
      // CORREÇÃO: Decodificar CPF e reconstruir com dígitos verificadores
      let cpfFormatado = 'Não informado';
      if (pessoa.cpf_mne) {
        try {
          // Decodificar base62 para obter a base (9 dígitos)
          const baseCPF = decodeBase62(pessoa.cpf_mne);
          // Adicionar padding se necessário (base pode ter menos de 9 dígitos)
          const basePadded = baseCPF.padStart(9, '0');
          // Recalcular dígitos verificadores
          const cpfCompleto = calcularDigitosVerificadores(basePadded);
          // Formatar para exibição
          cpfFormatado = formatarCPF(cpfCompleto);
        } catch (error) {
          console.error(`Erro ao decodificar CPF para ID ${pessoa.id}:`, error);
        }
      }

      dados.push({
        id: pessoa.id,
        nome: nomeResult.rows[0]?.valor || 'Não informado',
        sobrenome: sobrenomeCompleto || 'Não informado',
        rua: ruaResult.rows[0]?.valor || 'Não informado',
        casa: pessoa.casa || 'S/N',
        cidade: cidadeResult.rows[0]?.valor || 'Não informado',
        cep: cepResult.rows[0]?.valor || 'Não informado',
        cpf: cpfFormatado
      });
    }

    const endTime = Date.now();
    const tempoExecucao = endTime - startTime;

    res.json({
      dados,
      tempo_execucao_ms: tempoExecucao
    });

  } catch (error) {
    console.error('Erro na listagem:', error);
    res.status(500).json({
      erro: 'Erro ao listar registros',
      detalhe: error.message
    });
  }
});

module.exports = router;

// const router = require('express').Router();
// const pool = require('../config/db');

// const {
//   reconstruirSobrenome
// } = require('../services/mir.service');

// const {
//   decodeBase62
// } = require('../utils/base62');

// router.get('/', async (req, res) => {
//   const startTime = Date.now();
  
//   try {
//     // Buscar registros MIR com JOIN nas tabelas lexicais
//     const query = `
//       SELECT 
//         pm.id,
//         pm.casa,
//         pm.cpf_mne,
//         pm.sobrenome_token,
//         COALESCE(ln.valor, 'Não informado') AS nome,
//         COALESCE(lr.valor, 'Não informado') AS rua,
//         COALESCE(lc.valor, 'Não informado') AS cidade,
//         COALESCE(lcep.valor, 'Não informado') AS cep
//       FROM pessoas_mir pm
//       LEFT JOIN lexical_nome ln ON pm.nome_token = ln.token
//       LEFT JOIN lexical_rua lr ON pm.rua_token = lr.token
//       LEFT JOIN lexical_cidade lc ON pm.cidade_token = lc.token
//       LEFT JOIN lexical_cep lcep ON pm.cep_token = lcep.token
//       ORDER BY pm.id DESC
//       LIMIT 100
//     `;
    
//     const pessoas = await pool.query(query);
//     const dados = [];

//     for (const pessoa of pessoas.rows) {
//       // Reconstruir sobrenome a partir dos tokens
//       const sobrenomeCompleto = pessoa.sobrenome_token
//         ? await reconstruirSobrenome(pessoa.sobrenome_token)
//         : 'Não informado';
      
//       // Decodificar CPF
//       const cpfDecodificado = pessoa.cpf_mne 
//         ? decodeBase62(pessoa.cpf_mne)
//         : '';
      
//       // Formatar CPF (XXX.XXX.XXX-XX)
//       const cpfFormatado = cpfDecodificado.length === 11
//         ? `${cpfDecodificado.substring(0,3)}.${cpfDecodificado.substring(3,6)}.${cpfDecodificado.substring(6,9)}-${cpfDecodificado.substring(9,11)}`
//         : (cpfDecodificado || 'Não informado');

//       dados.push({
//         id: pessoa.id,
//         nome: pessoa.nome,
//         sobrenome: sobrenomeCompleto,
//         rua: pessoa.rua,
//         casa: pessoa.casa || 'S/N',
//         cidade: pessoa.cidade,
//         cep: pessoa.cep,
//         cpf: cpfFormatado
//       });
//     }

//     const endTime = Date.now();
//     const tempoExecucao = endTime - startTime;

//     res.json({
//       dados,
//       tempo_execucao_ms: tempoExecucao
//     });

//   } catch (error) {
//     console.error('Erro na listagem:', error);
//     res.status(500).json({
//       erro: 'Erro ao listar registros',
//       detalhe: error.message
//     });
//   }
// });

// module.exports = router;