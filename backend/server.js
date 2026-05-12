//server.js aprimorado para separar sobrenome, cidade e ruas.

const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');

require('dotenv').config();
require('./migrations');

const app = express();

app.use(cors());
app.use(express.json());

app.use(
  express.static(
    path.join(__dirname, '../frontend')
  )
);

//--------------------------------------------------
// TOKENS
//--------------------------------------------------

async function gerarToken(tabela, prefixo) {

  const result = await pool.query(`
    SELECT COUNT(*) AS total
    FROM ${tabela}
  `);

  const total =
    parseInt(result.rows[0].total) + 1;

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

  //-----------------------------------
  // LIMPA
  //-----------------------------------

  valor = valor.trim();

  //-----------------------------------
  // BUSCA
  //-----------------------------------

  const busca = await pool.query(`
    SELECT *
    FROM ${tabela}
    WHERE LOWER(valor) = LOWER($1)
  `, [valor]);

  //-----------------------------------
  // EXISTE
  //-----------------------------------

  if (busca.rows.length > 0) {

    const registro = busca.rows[0];

    //-----------------------------------
    // SOMA FREQUÊNCIA
    //-----------------------------------

    await pool.query(`
      UPDATE ${tabela}
      SET frequencia = frequencia + 1
      WHERE id = $1
    `, [registro.id]);

    return registro.token;
  }

  //-----------------------------------
  // NOVO TOKEN
  //-----------------------------------

  const novoToken =
    await gerarToken(
      tabela,
      prefixo
    );

  //-----------------------------------
  // INSERT
  //-----------------------------------

  await pool.query(`
    INSERT INTO ${tabela}
    (
      token,
      valor
    )
    VALUES ($1, $2)
  `, [
    novoToken,
    valor
  ]);

  return novoToken;
}

//--------------------------------------------------
// TOKENIZA TEXTO EM PARTES
//--------------------------------------------------

async function tokenizarPartes(
  tabela,
  prefixo,
  texto
) {

  //-----------------------------------
  // DIVIDE EM PARTES
  //-----------------------------------

  const partes = texto
    .trim()
    .split(/\s+/);

  //-----------------------------------
  // TOKENS
  //-----------------------------------

  const tokens = [];

  //-----------------------------------
  // TOKENIZA CADA PALAVRA
  //-----------------------------------

  for (const parte of partes) {

    const token =
      await obterOuCriarToken(
        tabela,
        prefixo,
        parte
      );

    tokens.push(token);
  }

  //-----------------------------------
  // RETORNA STRING
  //-----------------------------------

  return tokens.join('|');
}

//--------------------------------------------------
// RECONSTRUIR TEXO
//--------------------------------------------------

async function reconstruirTexto(
  tabela,
  tokensString
) {

  //-----------------------------------
  // SEM TOKEN
  //-----------------------------------

  if (!tokensString) {
    return '';
  }

  //-----------------------------------
  // SPLIT TOKENS
  //-----------------------------------

  const tokens =
    tokensString.split('|');

  //-----------------------------------
  // RESULTADO
  //-----------------------------------

  const palavras = [];

  //-----------------------------------
  // RECONSTRÓI
  //-----------------------------------

  for (const token of tokens) {

    const busca = await pool.query(`
      SELECT valor
      FROM ${tabela}
      WHERE token = $1
    `, [token]);

    palavras.push(
      busca.rows[0]?.valor || ''
    );
  }

  //-----------------------------------
  // TEXTO FINAL
  //-----------------------------------

  return palavras.join(' ');
}

//--------------------------------------------------
// MNE BASE62
//--------------------------------------------------

const baseChars =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function encodeBase62(numero) {

  numero = BigInt(numero);

  if (numero === 0n) {
    return '0';
  }

  let resultado = '';

  while (numero > 0n) {

    resultado =
      baseChars[numero % 62n]
      + resultado;

    numero = numero / 62n;
  }

  return resultado;
}

function decodeBase62(texto) {

  let resultado = 0n;

  for (let char of texto) {

    resultado =
      resultado * 62n +
      BigInt(
        baseChars.indexOf(char)
      );
  }

  return resultado.toString();
}

//--------------------------------------------------
// GERA DÍGITOS CPF
//--------------------------------------------------

function gerarDigitosCPF(base) {

  base = base.padStart(9, '0');

  //-----------------------------------
  // PRIMEIRO DÍGITO
  //-----------------------------------

  let soma1 = 0;

  for (let i = 0; i < 9; i++) {

    soma1 +=
      parseInt(base[i]) *
      (10 - i);
  }

  let resto1 =
    (soma1 * 10) % 11;

  if (resto1 === 10) {
    resto1 = 0;
  }

  //-----------------------------------
  // SEGUNDO DÍGITO
  //-----------------------------------

  let soma2 = 0;

  const parcial =
    base + resto1;

  for (let i = 0; i < 10; i++) {

    soma2 +=
      parseInt(parcial[i]) *
      (11 - i);
  }

  let resto2 =
    (soma2 * 10) % 11;

  if (resto2 === 10) {
    resto2 = 0;
  }

  return `${resto1}${resto2}`;
}

//--------------------------------------------------
// RECONSTRUIR CPF
//--------------------------------------------------

function reconstruirCPF(
  cpfCompactado
) {

  //-----------------------------------
  // DECODIFICA
  //-----------------------------------

  let base =
    decodeBase62(cpfCompactado);

  //-----------------------------------
  // GARANTE 9 DÍGITOS
  //-----------------------------------

  base =
    base.padStart(9, '0');

  //-----------------------------------
  // GERA DV
  //-----------------------------------

  const dv =
    gerarDigitosCPF(base);

  //-----------------------------------
  // CPF FINAL
  //-----------------------------------

  return `${base}${dv}`;
}

//--------------------------------------------------
// REMOVE DV CPF
//--------------------------------------------------

function obterBaseCPF(cpf) {

  return cpf
    .replace(/\D/g, '')
    .substring(0, 9);
}

//--------------------------------------------------
// HOME
//--------------------------------------------------

app.get('/', (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      '../frontend/index.html'
    )
  );
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

    //-----------------------------------
    // TABELA NORMAL
    //-----------------------------------

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
      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7
      )
    `, [
      nome,
      sobrenome,
      rua,
      casa,
      cidade,
      cep,
      cpf
    ]);

    //-----------------------------------
    // TOKENIZAÇÃO COMPOSICIONAL
    //-----------------------------------

    const nomeToken =
      await tokenizarPartes(
        'lexical_nome',
        'NA',
        nome
      );

    const sobrenomeToken =
      await tokenizarPartes(
        'lexical_sobrenome',
        'SA',
        sobrenome
      );

    const ruaToken =
      await tokenizarPartes(
        'lexical_rua',
        'RA',
        rua
      );

    const cidadeToken =
      await tokenizarPartes(
        'lexical_cidade',
        'DA',
        cidade
      );

    const cepToken =
      await tokenizarPartes(
        'lexical_cep',
        'CA',
        cep
      );

    //-----------------------------------
    // MNE CPF
    //-----------------------------------

    const cpfBase =
      obterBaseCPF(cpf);

    const cpfCompactado =
      encodeBase62(cpfBase);

    //-----------------------------------
    // INSERT MIR
    //-----------------------------------

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
      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7
      )
    `, [
      nomeToken,
      sobrenomeToken,
      ruaToken,
      casa,
      cidadeToken,
      cepToken,
      cpfCompactado
    ]);

    //-----------------------------------
    // RESPOSTA
    //-----------------------------------

    res.json({

      sucesso: true,

      normal: {
        nome,
        sobrenome,
        rua,
        casa,
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

    res.status(500).json({
      erro: 'Erro interno'
    });
  }
});

//--------------------------------------------------
// LISTAR
//--------------------------------------------------

app.get('/listar', async (req, res) => {

  try {

    //-----------------------------------
    // TEMPO INICIAL
    //-----------------------------------

    const inicio = Date.now();

    //-----------------------------------
    // BUSCA
    //-----------------------------------

    const pessoas =
      await pool.query(`
        SELECT *
        FROM pessoas_mir
        ORDER BY id DESC
        LIMIT 100
      `);

    //-----------------------------------
    // RESULTADO
    //-----------------------------------

    const resultado = [];

    //-----------------------------------
    // LOOP
    //-----------------------------------

    for (const pessoa of pessoas.rows) {

      //-----------------------------------
      // RECONSTRUÇÃO
      //-----------------------------------

      const nome =
        await reconstruirTexto(
          'lexical_nome',
          pessoa.nome_token
        );

      const sobrenome =
        await reconstruirTexto(
          'lexical_sobrenome',
          pessoa.sobrenome_token
        );

      const rua =
        await reconstruirTexto(
          'lexical_rua',
          pessoa.rua_token
        );

      const cidade =
        await reconstruirTexto(
          'lexical_cidade',
          pessoa.cidade_token
        );

      const cep =
        await reconstruirTexto(
          'lexical_cep',
          pessoa.cep_token
        );

      //-----------------------------------
      // CPF
      //-----------------------------------

      const cpf =
        reconstruirCPF(
          pessoa.cpf_mne
        );

      //-----------------------------------
      // PUSH
      //-----------------------------------

      resultado.push({

        id: pessoa.id,

        nome,

        sobrenome,

        rua,

        casa: pessoa.casa,

        cidade,

        cep,

        cpf
      });
    }

    //-----------------------------------
    // TEMPO FINAL
    //-----------------------------------

    const fim = Date.now();

    //-----------------------------------
    // RESPOSTA
    //-----------------------------------

    res.json({

      total_registros:
        resultado.length,

      tempo_execucao_ms:
        fim - inicio,

      dados: resultado
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      erro: 'Erro ao listar'
    });
  }
});

//--------------------------------------------------
// ESTATÍSTICAS
//--------------------------------------------------

app.get('/estatisticas', async (req, res) => {

  try {

    const normal =
      await pool.query(`
        SELECT COALESCE(
          SUM(
            OCTET_LENGTH(nome) +
            OCTET_LENGTH(sobrenome) +
            OCTET_LENGTH(rua) +
            OCTET_LENGTH(casa) +
            OCTET_LENGTH(cidade) +
            OCTET_LENGTH(cep) +
            OCTET_LENGTH(cpf)
          ),
          0
        ) AS bytes
        FROM pessoas_normal
      `);

    const mir =
      await pool.query(`
        SELECT COALESCE(
          SUM(
            OCTET_LENGTH(nome_token) +
            OCTET_LENGTH(sobrenome_token) +
            OCTET_LENGTH(rua_token) +
            OCTET_LENGTH(casa) +
            OCTET_LENGTH(cidade_token) +
            OCTET_LENGTH(cep_token) +
            OCTET_LENGTH(cpf_mne)
          ),
          0
        ) AS bytes
        FROM pessoas_mir
      `);

    const lexical =
      await pool.query(`
        SELECT
        (
          (
            SELECT COALESCE(
              SUM(
                OCTET_LENGTH(token)
                +
                OCTET_LENGTH(valor)
              ),
              0
            )
            FROM lexical_nome
          )
          +
          (
            SELECT COALESCE(
              SUM(
                OCTET_LENGTH(token)
                +
                OCTET_LENGTH(valor)
              ),
              0
            )
            FROM lexical_sobrenome
          )
          +
          (
            SELECT COALESCE(
              SUM(
                OCTET_LENGTH(token)
                +
                OCTET_LENGTH(valor)
              ),
              0
            )
            FROM lexical_rua
          )
          +
          (
            SELECT COALESCE(
              SUM(
                OCTET_LENGTH(token)
                +
                OCTET_LENGTH(valor)
              ),
              0
            )
            FROM lexical_cidade
          )
          +
          (
            SELECT COALESCE(
              SUM(
                OCTET_LENGTH(token)
                +
                OCTET_LENGTH(valor)
              ),
              0
            )
            FROM lexical_cep
          )
        ) AS bytes
      `);

    //-----------------------------------
    // CÁLCULOS
    //-----------------------------------

    const normalBytes =
      parseInt(normal.rows[0].bytes);

    const mirBytes =
      parseInt(mir.rows[0].bytes);

    const lexicalBytes =
      parseInt(lexical.rows[0].bytes);

    const totalMir =
      mirBytes + lexicalBytes;

    let economia = 0;

    if (normalBytes > 0) {

      economia = (
        100 -
        (
          (totalMir / normalBytes)
          * 100
        )
      ).toFixed(2);
    }

    //-----------------------------------
    // RESPOSTA
    //-----------------------------------

    res.json({

      normal_bytes:
        normalBytes,

      mir_bytes:
        mirBytes,

      lexical_bytes:
        lexicalBytes,

      total_mir:
        totalMir,

      economia_percentual:
        economia
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      erro: 'Erro estatísticas'
    });
  }
});

//--------------------------------------------------
// EXCLUIR
//--------------------------------------------------

app.delete('/excluir/:id', async (req, res) => {

  try {

    const id =
      req.params.id;

    //-----------------------------------
    // REMOVE MIR
    //-----------------------------------

    await pool.query(`
      DELETE FROM pessoas_mir
      WHERE id = $1
    `, [id]);

    //-----------------------------------
    // REMOVE NORMAL
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

      mensagem:
        'Registro excluído'
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      erro: 'Erro exclusão'
    });
  }
});

//--------------------------------------------------
// SERVER
//--------------------------------------------------

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(`
Servidor rodando na porta ${PORT}
  `);
});
