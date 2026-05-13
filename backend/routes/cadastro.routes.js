const router = require('express').Router();
const pool = require('../config/db');

const {
  obterOuCriarToken
} = require('../services/token.service');

const {
  tokenizarSobrenome
} = require('../services/mir.service');

const {
  encodeBase62
} = require('../utils/base62');

// Função para extrair apenas a base do CPF (9 primeiros dígitos)
function extrairBaseCPF(cpf) {
  // Remove tudo que não é número
  const numeros = cpf.replace(/\D/g, '');
  // Retorna apenas os 9 primeiros dígitos (base)
  return numeros.substring(0, 9);
}

router.post('/', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      nome,
      sobrenome,
      rua,
      casa,
      cidade,
      cep,
      cpf
    } = req.body;

    // Iniciar transação
    await client.query('BEGIN');

    // Inserir na tabela normal (com CPF completo para referência)
    const normalResult = await client.query(`
      INSERT INTO pessoas_normal
      (nome, sobrenome, rua, casa, cidade, cep, cpf)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id
    `, [nome, sobrenome, rua, casa, cidade, cep, cpf]);

    const pessoaId = normalResult.rows[0].id;

    // Gerar tokens
    const nomeToken = await obterOuCriarToken(
      'lexical_nome',
      'N',
      nome
    );

    const sobrenomeToken = await tokenizarSobrenome(sobrenome);

    const ruaToken = await obterOuCriarToken(
      'lexical_rua',
      'R',
      rua
    );

    const cidadeToken = await obterOuCriarToken(
      'lexical_cidade',
      'D',
      cidade
    );

    const cepToken = await obterOuCriarToken(
      'lexical_cep',
      'C',
      cep
    );

    // CORREÇÃO: Extrair apenas a base do CPF (9 dígitos)
    const baseCPF = extrairBaseCPF(cpf);
    const cpfCompactado = encodeBase62(parseInt(baseCPF, 10));

    console.log(`CPF Original: ${cpf}`);
    console.log(`Base CPF (9 dígitos): ${baseCPF}`);
    console.log(`Base62 (${baseCPF.length} dígitos → ${cpfCompactado.length} chars): ${cpfCompactado}`);

    // Inserir na tabela MIR
    await client.query(`
      INSERT INTO pessoas_mir
      (id, nome_token, sobrenome_token, rua_token, casa, 
       cidade_token, cep_token, cpf_mne)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      pessoaId,
      nomeToken,
      sobrenomeToken,
      ruaToken,
      casa,
      cidadeToken,
      cepToken,
      cpfCompactado
    ]);

    // Commit da transação
    await client.query('COMMIT');

    res.json({
      sucesso: true,
      normal: {
        id: pessoaId,
        nome,
        sobrenome,
        rua,
        casa,
        cidade,
        cep,
        cpf
      },
      mir: {
        id: pessoaId,
        nome_token: nomeToken,
        sobrenome_token: sobrenomeToken,
        rua_token: ruaToken,
        casa,
        cidade_token: cidadeToken,
        cep_token: cepToken,
        cpf_mne: cpfCompactado,
        // Informação de debug
        _debug: {
          base_cpf: baseCPF,
          compactacao_ratio: `${cpf.length} → ${cpfCompactado.length} caracteres (${((1 - cpfCompactado.length / cpf.length) * 100).toFixed(0)}% menor)`
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro no cadastro:', error);
    res.status(500).json({
      erro: 'Erro no cadastro',
      detalhe: error.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;

// const router = require('express').Router();
// const pool = require('../config/db');

// const {
//   obterOuCriarToken
// } = require('../services/token.service');

// const {
//   tokenizarSobrenome
// } = require('../services/mir.service');

// const {
//   encodeBase62
// } = require('../utils/base62');

// router.post('/', async (req, res) => {
//   const client = await pool.connect();
  
//   try {
//     const {
//       nome,
//       sobrenome,
//       rua,
//       casa,
//       cidade,
//       cep,
//       cpf
//     } = req.body;

//     // Iniciar transação
//     await client.query('BEGIN');

//     // Inserir na tabela normal
//     const normalResult = await client.query(`
//       INSERT INTO pessoas_normal
//       (nome, sobrenome, rua, casa, cidade, cep, cpf)
//       VALUES ($1,$2,$3,$4,$5,$6,$7)
//       RETURNING id
//     `, [nome, sobrenome, rua, casa, cidade, cep, cpf]);

//     const pessoaId = normalResult.rows[0].id;

//     // Gerar tokens
//     const nomeToken = await obterOuCriarToken(
//       'lexical_nome',
//       'N',
//       nome
//     );

//     const sobrenomeToken = await tokenizarSobrenome(sobrenome);

//     const ruaToken = await obterOuCriarToken(
//       'lexical_rua',
//       'R',
//       rua
//     );

//     const cidadeToken = await obterOuCriarToken(
//       'lexical_cidade',
//       'D',
//       cidade
//     );

//     const cepToken = await obterOuCriarToken(
//       'lexical_cep',
//       'C',
//       cep
//     );

//     // CPF completo em Base62
//     const cpfCompactado = encodeBase62(cpf.replace(/\D/g, ''));

//     // Inserir na tabela MIR
//     await client.query(`
//       INSERT INTO pessoas_mir
//       (id, nome_token, sobrenome_token, rua_token, casa, 
//        cidade_token, cep_token, cpf_mne)
//       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
//     `, [
//       pessoaId,
//       nomeToken,
//       sobrenomeToken,
//       ruaToken,
//       casa,
//       cidadeToken,
//       cepToken,
//       cpfCompactado
//     ]);

//     // Commit da transação
//     await client.query('COMMIT');

//     // Retornar dados completos para o frontend
//     res.json({
//       sucesso: true,
//       normal: {
//         id: pessoaId,
//         nome,
//         sobrenome,
//         rua,
//         casa,
//         cidade,
//         cep,
//         cpf
//       },
//       mir: {
//         id: pessoaId,
//         nome_token: nomeToken,
//         sobrenome_token: sobrenomeToken,
//         rua_token: ruaToken,
//         casa,
//         cidade_token: cidadeToken,
//         cep_token: cepToken,
//         cpf_mne: cpfCompactado
//       }
//     });

//   } catch (error) {
//     await client.query('ROLLBACK');
//     console.error('Erro no cadastro:', error);
//     res.status(500).json({
//       erro: 'Erro no cadastro',
//       detalhe: error.message
//     });
//   } finally {
//     client.release();
//   }
// });

// module.exports = router;