const express = require('express');
const cors = require('cors');
const path = require('node:path');
const pool = require('./db');
require('dotenv').config();
require('./migrations');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

//--------------------------------------------------
// TOKENS
//--------------------------------------------------

async function gerarToken(tabela, prefixo) {

  const result = await pool.query(`
    SELECT COUNT(*) AS total
    FROM ${tabela}
  `);

  const total = Number.parseInt(result.rows[0].total) + 1;

  return `${prefixo}${total}`;
}

//--------------------------------------------------
// BUSCA OU CRIA TOKEN
//--------------------------------------------------

async function obterOuCriarToken(
  tabela,
  prefixo,
  valor
) {

  const busca = await pool.query(`
    SELECT *
    FROM ${tabela}
    WHERE LOWER(valor) = LOWER($1)
  `, [valor]);

  if (busca.rows.length > 0) {

    const registro = busca.rows[0];

    await pool.query(`
      UPDATE ${tabela}
      SET frequencia = frequencia + 1
      WHERE id = $1
    `, [registro.id]);

    return registro.token;
  }

  const novoToken = await gerarToken(tabela, prefixo);

  await pool.query(`
    INSERT INTO ${tabela}
    (token, valor)
    VALUES ($1, $2)
  `, [novoToken, valor]);

  return novoToken;
}

//--------------------------------------------------
// MNE - ENCODING CPF
//--------------------------------------------------

const baseChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function encodeBase62(numero) {

  numero = BigInt(numero);

  if (numero === 0n) return '0';

  let resultado = '';

  while (numero > 0n) {
    resultado = baseChars[numero % 62n] + resultado;
    numero = numero / 62n;
  }

  return resultado;
}

function decodeBase62(texto) {

  let resultado = 0n;

  for (let char of texto) {
    resultado = resultado * 62n + BigInt(baseChars.indexOf(char));
  }

  return resultado.toString();
}

function gerarDigitosCPF(base) {

  //-----------------------------------
  // GARANTE 9 DÍGITOS
  //-----------------------------------

  base = base.padStart(9, '0');

  //-----------------------------------
  // PRIMEIRO DÍGITO
  //-----------------------------------

  let soma1 = 0;

  for (let i = 0; i < 9; i++) {
    soma1 += Number.parseInt(base[i]) * (10 - i);
  }

  let resto1 = (soma1 * 10) % 11;

  if (resto1 === 10) {
    resto1 = 0;
  }

  //-----------------------------------
  // SEGUNDO DÍGITO
  //-----------------------------------

  let soma2 = 0;

  const cpfParcial = base + resto1;

  for (let i = 0; i < 10; i++) {
    soma2 += Number.parseInt(cpfParcial[i]) * (11 - i);
  }

  let resto2 = (soma2 * 10) % 11;

  if (resto2 === 10) {
    resto2 = 0;
  }

  //-----------------------------------
  // RETORNA DV
  //-----------------------------------

  return `${resto1}${resto2}`;
}

function reconstruirCPF(cpfCompactado) {

  //-----------------------------------
  // DECODIFICA BASE62
  //-----------------------------------

  let base = decodeBase62(cpfCompactado);

  //-----------------------------------
  // GARANTE 9 DÍGITOS
  //-----------------------------------

  base = base.padStart(9, '0');

  //-----------------------------------
  // GERA VERIFICADORES
  //-----------------------------------

  const dv = gerarDigitosCPF(base);

  //-----------------------------------
  // CPF COMPLETO
  //-----------------------------------

  return `${base}${dv}`;
}

//--------------------------------------------------
// REMOVE VERIFICADORES CPF
//--------------------------------------------------

function obterBaseCPF(cpf) {

  return cpf
    .replace(/\D/g, '')
    .substring(0, 9);
}

//--------------------------------------------------
// ROTA HOME
//--------------------------------------------------

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

//--------------------------------------------------
// CADASTRO
//--------------------------------------------------

app.post('/cadastro', async (req, res) => {

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

    //---------------------------------------------
    // SALVA NORMAL
    //---------------------------------------------

    await pool.query(`
      INSERT INTO pessoas_normal
      (
        nome,
        sobrenome,
        rua,
        casa,
        cidade,
        cep,
        cpf
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
    `, [
      nome,
      sobrenome,
      rua,
      casa,
      cidade,
      cep,
      cpf
    ]);

    //---------------------------------------------
    // TOKENS MIR
    //---------------------------------------------

    const nomeToken = await obterOuCriarToken(
      'lexical_nome',
      'NA',
      nome
    );

    const sobrenomeToken = await obterOuCriarToken(
      'lexical_sobrenome',
      'SA',
      sobrenome
    );

    const ruaToken = await obterOuCriarToken(
      'lexical_rua',
      'RA',
      rua
    );

    const cidadeToken = await obterOuCriarToken(
      'lexical_cidade',
      'DA',
      cidade
    );

    const cepToken = await obterOuCriarToken(
      'lexical_cep',
      'CA',
      cep
    );

    //---------------------------------------------
    // MNE CPF
    //---------------------------------------------

    const cpfBase = obterBaseCPF(cpf);

    const cpfCompactado = encodeBase62(cpfBase);

    //---------------------------------------------
    // SALVA MIR
    //---------------------------------------------

    await pool.query(`
      INSERT INTO pessoas_mir
      (
        nome_token,
        sobrenome_token,
        rua_token,
        casa,
        cidade_token,
        cep_token,
        cpf_mne
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
    `, [
      nomeToken,
      sobrenomeToken,
      ruaToken,
      casa,
      cidadeToken,
      cepToken,
      cpfCompactado
    ]);

    //---------------------------------------------
    // RESPOSTA
    //---------------------------------------------

    res.json({
      sucesso: true,
      normal: {
        nome,
        sobrenome,
        rua,
        cidade,
        cep,
        cpf
      },
      mir: {
        nomeToken,
        sobrenomeToken,
        ruaToken,
        cidadeToken,
        cepToken,
        cpfCompactado
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

//--------------------------------------------------
// ESTATÍSTICAS
//--------------------------------------------------

app.get('/estatisticas', async (req, res) => {

  try {

    const normal = await pool.query(`
      SELECT COALESCE(
        SUM(
          OCTET_LENGTH(nome) +
          OCTET_LENGTH(sobrenome) +
          OCTET_LENGTH(rua) +
          OCTET_LENGTH(casa) +
          OCTET_LENGTH(cidade) +
          OCTET_LENGTH(cep) +
          OCTET_LENGTH(cpf)
        ), 0
      ) AS bytes
      FROM pessoas_normal
    `);

    const mir = await pool.query(`
      SELECT COALESCE(
        SUM(
          OCTET_LENGTH(nome_token) +
          OCTET_LENGTH(sobrenome_token) +
          OCTET_LENGTH(rua_token) +
          OCTET_LENGTH(casa) +
          OCTET_LENGTH(cidade_token) +
          OCTET_LENGTH(cep_token) +
          OCTET_LENGTH(cpf_mne)
        ), 0
      ) AS bytes
      FROM pessoas_mir
    `);

    const lexical = await pool.query(`
      SELECT
      (
        (
          SELECT COALESCE(SUM(OCTET_LENGTH(token)+OCTET_LENGTH(valor)),0)
          FROM lexical_nome
        )
        +
        (
          SELECT COALESCE(SUM(OCTET_LENGTH(token)+OCTET_LENGTH(valor)),0)
          FROM lexical_sobrenome
        )
        +
        (
          SELECT COALESCE(SUM(OCTET_LENGTH(token)+OCTET_LENGTH(valor)),0)
          FROM lexical_rua
        )
        +
        (
          SELECT COALESCE(SUM(OCTET_LENGTH(token)+OCTET_LENGTH(valor)),0)
          FROM lexical_cidade
        )
        +
        (
          SELECT COALESCE(SUM(OCTET_LENGTH(token)+OCTET_LENGTH(valor)),0)
          FROM lexical_cep
        )
      ) AS bytes
    `);

    const normalBytes = Number.parseInt(normal.rows[0].bytes);
    const mirBytes = Number.parseInt(mir.rows[0].bytes);
    const lexicalBytes = Number.parseInt(lexical.rows[0].bytes);

    const totalMir = mirBytes + lexicalBytes;

    let economia = 0;

    if (normalBytes > 0) {
      economia = (
        100 - ((totalMir / normalBytes) * 100)
      ).toFixed(2);
    }

    res.json({
      normal_bytes: normalBytes,
      mir_bytes: mirBytes,
      lexical_bytes: lexicalBytes,
      total_mir: totalMir,
      economia_percentual: economia
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

//--------------------------------------------------
// DECODE CPF
//--------------------------------------------------

app.get('/decode/:valor', (req, res) => {

  const valor = req.params.valor;

  const cpf = decodeBase62(valor);

  res.json({
    compactado: valor,
    cpf_base: cpf
  });
});

//--------------------------------------------------
// LISTAR REGISTROS
//--------------------------------------------------
app.get('/listar', async (req, res) => {

  try {

    //-----------------------------------
    // INÍCIO DO TEMPO
    //-----------------------------------

    const inicio = Date.now();

    //-----------------------------------
    // BUSCA REGISTROS MIR
    //-----------------------------------

    const pessoas = await pool.query(`
      SELECT *
      FROM pessoas_mir
      ORDER BY id DESC
      LIMIT 100
    `);

    //-----------------------------------
    // RECONSTRUÇÃO
    //-----------------------------------

    const resultado = [];

    for (const pessoa of pessoas.rows) {

      //-----------------------------------
      // NOME
      //-----------------------------------

      const nome = await pool.query(`
        SELECT valor
        FROM lexical_nome
        WHERE token = $1
      `, [pessoa.nome_token]);

      //-----------------------------------
      // SOBRENOME
      //-----------------------------------

      const sobrenome = await pool.query(`
        SELECT valor
        FROM lexical_sobrenome
        WHERE token = $1
      `, [pessoa.sobrenome_token]);

      //-----------------------------------
      // RUA
      //-----------------------------------

      const rua = await pool.query(`
        SELECT valor
        FROM lexical_rua
        WHERE token = $1
      `, [pessoa.rua_token]);

      //-----------------------------------
      // CIDADE
      //-----------------------------------

      const cidade = await pool.query(`
        SELECT valor
        FROM lexical_cidade
        WHERE token = $1
      `, [pessoa.cidade_token]);

      //-----------------------------------
      // CEP
      //-----------------------------------

      const cep = await pool.query(`
        SELECT valor
        FROM lexical_cep
        WHERE token = $1
      `, [pessoa.cep_token]);

      //-----------------------------------
      // MONTA OBJETO
      //-----------------------------------

      resultado.push({

        id: pessoa.id,

        nome:
          nome.rows[0]?.valor || '',

        sobrenome:
          sobrenome.rows[0]?.valor || '',

        rua:
          rua.rows[0]?.valor || '',

        casa:
          pessoa.casa,

        cidade:
          cidade.rows[0]?.valor || '',

        cep:
          cep.rows[0]?.valor || '',

        cpf:
          reconstruirCPF(pessoa.cpf_mne)
      });
    }

    //-----------------------------------
    // TEMPO FINAL
    //-----------------------------------

    const fim = Date.now();

    const tempoExecucao = fim - inicio;

    //-----------------------------------
    // RESPOSTA
    //-----------------------------------

    res.json({
      total_registros: resultado.length,
      tempo_execucao_ms: tempoExecucao,
      dados: resultado
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      erro: 'Erro ao listar registros'
    });
  }
});

//--------------------------------------------------
// EXCLUIR REGISTRO
//--------------------------------------------------

app.delete('/excluir/:id', async (req, res) => {

  try {

    const id = req.params.id;

    //-----------------------------------
    // REMOVE DA TABELA MIR
    //-----------------------------------

    await pool.query(`
      DELETE FROM pessoas_mir
      WHERE id = $1
    `, [id]);

    //-----------------------------------
    // OPCIONAL:
    // remover também da tabela normal
    //-----------------------------------

    await pool.query(`
      DELETE FROM pessoas_normal
      WHERE id = $1
    `, [id]);

    //-----------------------------------
    // RESPOSTA
    //-----------------------------------

    res.json({
      sucesso: true,
      mensagem: 'Registro excluído'
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      erro: 'Erro ao excluir registro'
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

