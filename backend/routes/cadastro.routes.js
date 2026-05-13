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

    // Inserir na tabela normal
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

    // CPF completo em Base62
    const cpfCompactado = encodeBase62(cpf.replace(/\D/g, ''));

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

    // Retornar dados completos para o frontend
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
        cpf_mne: cpfCompactado
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