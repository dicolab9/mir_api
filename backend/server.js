const express = require('express');
const cors = require('cors');
const path = require('path');
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

  const total = parseInt(result.rows[0].total) + 1;

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

    const normalBytes = parseInt(normal.rows[0].bytes);
    const mirBytes = parseInt(mir.rows[0].bytes);
    const lexicalBytes = parseInt(lexical.rows[0].bytes);

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});



// const express = require('express');
// const cors = require('cors');
// const path = require('path');
// const pool = require('./db');

// const app = express();

// app.use(cors());
// app.use(express.json());
// app.use(express.static(path.join(__dirname, '../frontend')));

// //--------------------------------------------------
// // TOKENS
// //--------------------------------------------------

// async function gerarToken(tabela, prefixo) {

//   const result = await pool.query(`
//     SELECT COUNT(*) AS total
//     FROM ${tabela}
//   `);

//   const total = parseInt(result.rows[0].total) + 1;

//   return `${prefixo}${total}`;
// }

// //--------------------------------------------------
// // BUSCA OU CRIA TOKEN
// //--------------------------------------------------

// async function obterOuCriarToken(
//   tabela,
//   prefixo,
//   valor
// ) {

//   const busca = await pool.query(`
//     SELECT *
//     FROM ${tabela}
//     WHERE LOWER(valor) = LOWER($1)
//   `, [valor]);

//   if (busca.rows.length > 0) {

//     const registro = busca.rows[0];

//     await pool.query(`
//       UPDATE ${tabela}
//       SET frequencia = frequencia + 1
//       WHERE id = $1
//     `, [registro.id]);

//     return registro.token;
//   }

//   const novoToken = await gerarToken(tabela, prefixo);

//   await pool.query(`
//     INSERT INTO ${tabela}
//     (token, valor)
//     VALUES ($1, $2)
//   `, [novoToken, valor]);

//   return novoToken;
// }

// //--------------------------------------------------
// // MNE - ENCODING CPF
// //--------------------------------------------------

// const baseChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// function encodeBase62(numero) {

//   numero = BigInt(numero);

//   if (numero === 0n) return '0';

//   let resultado = '';

//   while (numero > 0n) {
//     resultado = baseChars[numero % 62n] + resultado;
//     numero = numero / 62n;
//   }

//   return resultado;
// }

// function decodeBase62(texto) {

//   let resultado = 0n;

//   for (let char of texto) {
//     resultado = resultado * 62n + BigInt(baseChars.indexOf(char));
//   }

//   return resultado.toString();
// }

// //--------------------------------------------------
// // REMOVE VERIFICADORES CPF
// //--------------------------------------------------

// function obterBaseCPF(cpf) {

//   return cpf
//     .replace(/\D/g, '')
//     .substring(0, 9);
// }

// //--------------------------------------------------
// // ROTA HOME
// //--------------------------------------------------

// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, '../frontend/index.html'));
// });

// //--------------------------------------------------
// // CADASTRO
// //--------------------------------------------------

// app.post('/cadastro', async (req, res) => {

//   try {

//     const {
//       nome,
//       sobrenome,
//       rua,
//       cidade,
//       cep,
//       cpf
//     } = req.body;

//     //---------------------------------------------
//     // SALVA NORMAL
//     //---------------------------------------------

//     await pool.query(`
//       INSERT INTO pessoas_normal
//       (
//         nome,
//         sobrenome,
//         rua,
//         cidade,
//         cep,
//         cpf
//       )
//       VALUES ($1,$2,$3,$4,$5,$6)
//     `, [
//       nome,
//       sobrenome,
//       rua,
//       cidade,
//       cep,
//       cpf
//     ]);

//     //---------------------------------------------
//     // TOKENS MIR
//     //---------------------------------------------

//     const nomeToken = await obterOuCriarToken(
//       'lexical_nome',
//       'NA',
//       nome
//     );

//     const sobrenomeToken = await obterOuCriarToken(
//       'lexical_sobrenome',
//       'SA',
//       sobrenome
//     );

//     const ruaToken = await obterOuCriarToken(
//       'lexical_rua',
//       'RA',
//       rua
//     );

//     const cidadeToken = await obterOuCriarToken(
//       'lexical_cidade',
//       'DA',
//       cidade
//     );

//     const cepToken = await obterOuCriarToken(
//       'lexical_cep',
//       'CA',
//       cep
//     );

//     //---------------------------------------------
//     // MNE CPF
//     //---------------------------------------------

//     const cpfBase = obterBaseCPF(cpf);

//     const cpfCompactado = encodeBase62(cpfBase);

//     //---------------------------------------------
//     // SALVA MIR
//     //---------------------------------------------

//     await pool.query(`
//       INSERT INTO pessoas_mir
//       (
//         nome_token,
//         sobrenome_token,
//         rua_token,
//         cidade_token,
//         cep_token,
//         cpf_mne
//       )
//       VALUES ($1,$2,$3,$4,$5,$6)
//     `, [
//       nomeToken,
//       sobrenomeToken,
//       ruaToken,
//       cidadeToken,
//       cepToken,
//       cpfCompactado
//     ]);

//     //---------------------------------------------
//     // RESPOSTA
//     //---------------------------------------------

//     res.json({
//       sucesso: true,
//       normal: {
//         nome,
//         sobrenome,
//         rua,
//         cidade,
//         cep,
//         cpf
//       },
//       mir: {
//         nomeToken,
//         sobrenomeToken,
//         ruaToken,
//         cidadeToken,
//         cepToken,
//         cpfCompactado
//       }
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ erro: 'Erro interno' });
//   }
// });

// //--------------------------------------------------
// // ESTATÍSTICAS
// //--------------------------------------------------

// app.get('/estatisticas', async (req, res) => {

//   try {

//     const normal = await pool.query(`
//       SELECT COALESCE(
//         SUM(
//           OCTET_LENGTH(nome) +
//           OCTET_LENGTH(sobrenome) +
//           OCTET_LENGTH(rua) +
//           OCTET_LENGTH(cidade) +
//           OCTET_LENGTH(cep) +
//           OCTET_LENGTH(cpf)
//         ), 0
//       ) AS bytes
//       FROM pessoas_normal
//     `);

//     const mir = await pool.query(`
//       SELECT COALESCE(
//         SUM(
//           OCTET_LENGTH(nome_token) +
//           OCTET_LENGTH(sobrenome_token) +
//           OCTET_LENGTH(rua_token) +
//           OCTET_LENGTH(cidade_token) +
//           OCTET_LENGTH(cep_token) +
//           OCTET_LENGTH(cpf_mne)
//         ), 0
//       ) AS bytes
//       FROM pessoas_mir
//     `);

//     const lexical = await pool.query(`
//       SELECT
//       (
//         (
//           SELECT COALESCE(SUM(OCTET_LENGTH(token)+OCTET_LENGTH(valor)),0)
//           FROM lexical_nome
//         )
//         +
//         (
//           SELECT COALESCE(SUM(OCTET_LENGTH(token)+OCTET_LENGTH(valor)),0)
//           FROM lexical_sobrenome
//         )
//         +
//         (
//           SELECT COALESCE(SUM(OCTET_LENGTH(token)+OCTET_LENGTH(valor)),0)
//           FROM lexical_rua
//         )
//         +
//         (
//           SELECT COALESCE(SUM(OCTET_LENGTH(token)+OCTET_LENGTH(valor)),0)
//           FROM lexical_cidade
//         )
//         +
//         (
//           SELECT COALESCE(SUM(OCTET_LENGTH(token)+OCTET_LENGTH(valor)),0)
//           FROM lexical_cep
//         )
//       ) AS bytes
//     `);

//     const normalBytes = parseInt(normal.rows[0].bytes);
//     const mirBytes = parseInt(mir.rows[0].bytes);
//     const lexicalBytes = parseInt(lexical.rows[0].bytes);

//     const totalMir = mirBytes + lexicalBytes;

//     let economia = 0;

//     if (normalBytes > 0) {
//       economia = (
//         100 - ((totalMir / normalBytes) * 100)
//       ).toFixed(2);
//     }

//     res.json({
//       normal_bytes: normalBytes,
//       mir_bytes: mirBytes,
//       lexical_bytes: lexicalBytes,
//       total_mir: totalMir,
//       economia_percentual: economia
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ erro: 'Erro interno' });
//   }
// });

// //--------------------------------------------------
// // DECODE CPF
// //--------------------------------------------------

// app.get('/decode/:valor', (req, res) => {

//   const valor = req.params.valor;

//   const cpf = decodeBase62(valor);

//   res.json({
//     compactado: valor,
//     cpf_base: cpf
//   });
// });

// app.listen(3000, () => {
//   console.log('Servidor rodando na porta 3000');
// });

