// seed/seed_mir.js
const path = require('path');

// Carregar .env da PASTA RAIZ
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = require('../config/db');

//--------------------------------------------------
// MASSAS DE DADOS
//--------------------------------------------------

const nomes = [
  'José', 'Maria', 'João', 'Ana', 'Carlos',
  'Lucas', 'Fernanda', 'Paulo', 'Juliana', 'Ricardo',
  'Patrícia', 'Roberto', 'Cristina', 'André', 'Camila'
];

const sobrenomesLista = [
  'Silva', 'Souza', 'Oliveira', 'Alencar', 'Batista',
  'Costa', 'Pereira', 'Rodrigues', 'Amorim', 'Lacerda',
  'Ferreira', 'Almeida', 'Nascimento', 'Lima', 'Araújo'
];

const ruas = [
  'Rua das Flores', 'Rua Carlos Lacerda', 'Rua Central',
  'Rua A', 'Rua B', 'Rua das Palmeiras', 'Avenida Brasil',
  'Rua 1', 'Rua 2', 'Rua 3'
];

const cidades = [
  'Volta Redonda', 'Barra Mansa', 'Resende', 'Rio de Janeiro',
  'São Paulo', 'Belo Horizonte', 'Curitiba', 'Porto Alegre'
];

const ceps = [
  '27220110', '27255120', '20040002', '27500000',
  '01001000', '30130000', '80010000', '90010000'
];

//--------------------------------------------------
// UTILITÁRIOS
//--------------------------------------------------

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function encodeBase62(numero) {
  if (numero === 0) return '0';
  
  let resultado = '';
  let n = numero;
  
  while (n > 0) {
    resultado = BASE62[n % 62] + resultado;
    n = Math.floor(n / 62);
  }
  
  return resultado;
}

function gerarCPF() {
  let numeros = '';
  for (let i = 0; i < 9; i++) {
    numeros += Math.floor(Math.random() * 10);
  }
  
  let soma1 = 0;
  for (let i = 0; i < 9; i++) {
    soma1 += Number.parseInt(numeros[i]) * (10 - i);
  }
  
  let resto1 = (soma1 * 10) % 11;
  if (resto1 === 10) resto1 = 0;
  
  let soma2 = 0;
  const parcial = numeros + resto1;
  for (let i = 0; i < 10; i++) {
    soma2 += Number.parseInt(parcial[i]) * (11 - i);
  }
  
  let resto2 = (soma2 * 10) % 11;
  if (resto2 === 10) resto2 = 0;
  
  return numeros + resto1 + resto2;
}

function random(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

//--------------------------------------------------
// GERADOR DE TOKEN PROGRESSIVO
//--------------------------------------------------

function tokenProgressivo(prefixo, numero) {
  const base62 = encodeBase62(numero);
  return `${prefixo}${base62}`;
}

//--------------------------------------------------
// LIMPEZA DAS TABELAS
//--------------------------------------------------

async function limparTabelas() {
  console.log('🗑️  LIMPANDO TABELAS...');
  
  const queries = [
    'DELETE FROM pessoas_mir',
    'DELETE FROM pessoas_normal',
    'DELETE FROM lexical_nome',
    'DELETE FROM lexical_sobrenome',
    'DELETE FROM lexical_rua',
    'DELETE FROM lexical_cidade',
    'DELETE FROM lexical_cep',
    'ALTER SEQUENCE lexical_nome_id_seq RESTART WITH 1',
    'ALTER SEQUENCE lexical_sobrenome_id_seq RESTART WITH 1',
    'ALTER SEQUENCE lexical_rua_id_seq RESTART WITH 1',
    'ALTER SEQUENCE lexical_cidade_id_seq RESTART WITH 1',
    'ALTER SEQUENCE lexical_cep_id_seq RESTART WITH 1',
    'ALTER SEQUENCE pessoas_normal_id_seq RESTART WITH 1'
  ];
  
  for (const query of queries) {
    await pool.query(query);
  }
  
  console.log('✅ TABELAS LIMPAS');
}

//--------------------------------------------------
// BUSCA OU CRIA TOKEN (CORRIGIDO - USANDO CONTADOR)
//--------------------------------------------------

async function obterOuCriarToken(tabela, prefixo, valor, client, contadorRef) {
  if (!valor || valor.trim() === '') return null;
  
  valor = valor.trim();
  
  // Buscar token existente
  const busca = await client.query(`
    SELECT token FROM ${tabela} WHERE LOWER(valor) = LOWER($1)
  `, [valor]);
  
  if (busca.rows.length > 0) {
    return busca.rows[0].token;
  }
  
  // Criar novo token progressivo usando o contador atual
  const token = tokenProgressivo(prefixo, contadorRef.value);
  
  await client.query(`
    INSERT INTO ${tabela} (token, valor, frequencia)
    VALUES ($1, $2, 1)
  `, [token, valor]);
  
  // Incrementar o contador
  contadorRef.value++;
  
  return token;
}

//--------------------------------------------------
// POPULAR
//--------------------------------------------------

async function popular() {
  const TOTAL_REGISTROS = 100000;
  const BATCH_SIZE = 1000;
  
  console.log(`🚀 POPULANDO ${TOTAL_REGISTROS} REGISTROS MIR/MNE`);
  console.log(`📦 BATCH SIZE: ${BATCH_SIZE}`);
  console.log('\n🎯 METODOLOGIA MIR:');
  console.log('   ✅ Tokens PROGRESSIVOS: N0, N1, N2... N9, NA, NB...');
  console.log('   ✅ Mínimo de bytes possível');
  console.log('   ✅ Compressão máxima\n');
  
  const startTime = Date.now();
  
  // Contadores para tokens progressivos (usando objetos para passagem por referência)
  const contadores = {
    nomes: { value: 0 },
    sobrenomes: { value: 0 },
    ruas: { value: 0 },
    cidades: { value: 0 },
    ceps: { value: 0 }
  };
  
  for (let batch = 0; batch < TOTAL_REGISTROS / BATCH_SIZE; batch++) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (let i = 0; i < BATCH_SIZE; i++) {
        const index = batch * BATCH_SIZE + i + 1;
        if (index > TOTAL_REGISTROS) break;
        
        // Gerar dados aleatórios
        const nome = random(nomes);
        const sobrenome = `${random(sobrenomesLista)} ${random(sobrenomesLista)}`;
        const rua = random(ruas);
        const cidade = random(cidades);
        const cep = random(ceps);
        const casa = Math.floor(Math.random() * 9999) + 1;
        const cpf = gerarCPF();
        
        // Inserir na tabela normal
        const normalResult = await client.query(`
          INSERT INTO pessoas_normal
          (nome, sobrenome, rua, casa, cidade, cep, cpf)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [nome, sobrenome, rua, casa, cidade, cep, cpf]);
        
        const pessoaId = normalResult.rows[0].id;
        
        // Tokenização MIR
        const nomeToken = await obterOuCriarToken('lexical_nome', 'N', nome, client, contadores.nomes);
        const sobrenomeToken = await obterOuCriarToken('lexical_sobrenome', 'S', sobrenome, client, contadores.sobrenomes);
        const ruaToken = await obterOuCriarToken('lexical_rua', 'R', rua, client, contadores.ruas);
        const cidadeToken = await obterOuCriarToken('lexical_cidade', 'C', cidade, client, contadores.cidades);
        const cepToken = await obterOuCriarToken('lexical_cep', 'E', cep, client, contadores.ceps);
        
        // CPF MNE: 9 primeiros dígitos em Base62
        const cpfBase = cpf.substring(0, 9);
        const cpfCompactado = encodeBase62(Number.parseInt(cpfBase, 10));
        
        // Inserir na tabela MIR
        await client.query(`
          INSERT INTO pessoas_mir
          (id, nome_token, sobrenome_token, rua_token, casa, 
           cidade_token, cep_token, cpf_mne)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          pessoaId, nomeToken, sobrenomeToken, ruaToken,
          casa, cidadeToken, cepToken, cpfCompactado
        ]);
        
        // Progresso
        if (index % 5000 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`📊 ${index.toLocaleString()} registros inseridos (${elapsed}s)`);
          console.log(`   Tokens: N=${contadores.nomes.value} S=${contadores.sobrenomes.value} R=${contadores.ruas.value} C=${contadores.cidades.value} E=${contadores.ceps.value}`);
        }
      }
      
      await client.query('COMMIT');
      console.log(`✅ Batch ${batch + 1}/${Math.ceil(TOTAL_REGISTROS / BATCH_SIZE)} concluído`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Erro no batch ${batch + 1}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  const endTime = Date.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n🎉 FINALIZADO COM SUCESSO!');
  console.log(`⏱️  Tempo total: ${totalTime} segundos`);
  console.log(`📈 Média: ${(TOTAL_REGISTROS / totalTime).toFixed(2)} registros/segundo`);
  
  // Exibir estatísticas finais
  await exibirEstatisticas();
  
  process.exit(0);
}

//--------------------------------------------------
// ESTATÍSTICAS FINAIS
//--------------------------------------------------

async function exibirEstatisticas() {
  console.log('\n📊 ESTATÍSTICAS FINAIS:');
  
  try {
    // Contagem de registros
    const totalNormal = await pool.query('SELECT COUNT(*) FROM pessoas_normal');
    const totalMir = await pool.query('SELECT COUNT(*) FROM pessoas_mir');
    const totalNomes = await pool.query('SELECT COUNT(*) FROM lexical_nome');
    const totalSobrenomes = await pool.query('SELECT COUNT(*) FROM lexical_sobrenome');
    const totalRuas = await pool.query('SELECT COUNT(*) FROM lexical_rua');
    const totalCidades = await pool.query('SELECT COUNT(*) FROM lexical_cidade');
    const totalCeps = await pool.query('SELECT COUNT(*) FROM lexical_cep');
    
    console.log(`📝 Registros Normal: ${Number.parseInt(totalNormal.rows[0].count).toLocaleString()}`);
    console.log(`🔐 Registros MIR: ${Number.parseInt(totalMir.rows[0].count).toLocaleString()}`);
    console.log(`📚 Tokens Nomes: ${NUmber.parseInt(totalNomes.rows[0].count).toLocaleString()}`);
    console.log(`📚 Tokens Sobrenomes: ${Number.parseInt(totalSobrenomes.rows[0].count).toLocaleString()}`);
    console.log(`📚 Tokens Ruas: ${Number.parseInt(totalRuas.rows[0].count).toLocaleString()}`);
    console.log(`📚 Tokens Cidades: ${Number.parseInt(totalCidades.rows[0].count).toLocaleString()}`);
    console.log(`📚 Tokens CEPs: ${Number.parseInt(totalCeps.rows[0].count).toLocaleString()}`);
    
    // Mostrar exemplos de tokens
    console.log('\n📌 EXEMPLOS DE TOKENS PROGRESSIVOS:');
    
    const exemplosNomes = await pool.query('SELECT token, valor FROM lexical_nome LIMIT 5');
    if (exemplosNomes.rows.length > 0) {
      console.log('   📛 Nomes:');
      exemplosNomes.rows.forEach(ex => {
        console.log(`      ${ex.token} → "${ex.valor}"`);
      });
    }
    
    const exemplosSobrenomes = await pool.query('SELECT token, valor FROM lexical_sobrenome LIMIT 5');
    if (exemplosSobrenomes.rows.length > 0) {
      console.log('   👨‍👩‍👧 Sobrenomes:');
      exemplosSobrenomes.rows.forEach(ex => {
        console.log(`      ${ex.token} → "${ex.valor}"`);
      });
    }
    
    // Calcular economia
    const tamanhoNormal = await pool.query(`
      SELECT SUM(LENGTH(nome) + LENGTH(sobrenome) + LENGTH(rua) + 
                 LENGTH(cidade) + LENGTH(cep) + LENGTH(cpf)) as total
      FROM pessoas_normal
    `);
    
    const tamanhoMir = await pool.query(`
      SELECT SUM(LENGTH(nome_token) + LENGTH(sobrenome_token) + 
                 LENGTH(rua_token) + LENGTH(cidade_token) + 
                 LENGTH(cep_token) + LENGTH(cpf_mne)) as total
      FROM pessoas_mir
    `);
    
    const normalBytes = tamanhoNormal.rows[0].total || 0;
    const mirBytes = tamanhoMir.rows[0].total || 0;
    const economia = normalBytes > 0 ? ((normalBytes - mirBytes) / normalBytes * 100).toFixed(2) : 0;
    
    console.log('\n💾 COMPARAÇÃO DE ESPAÇO (caracteres):');
    console.log(`   Normal: ${normalBytes.toLocaleString()} caracteres`);
    console.log(`   MIR: ${mirBytes.toLocaleString()} caracteres`);
    console.log(`   📈 Economia: ${economia}%`);
    
  } catch (error) {
    console.error('Erro ao exibir estatísticas:', error.message);
  }
}

//--------------------------------------------------
// MAIN - FUNÇÃO PRINCIPAL
//--------------------------------------------------

async function main() {
  try {
    console.log('🔌 CONECTANDO AO BANCO DE DADOS...');
    
    const testResult = await pool.query('SELECT NOW() as now');
    console.log(`✅ CONEXÃO ESTABELECIDA - ${testResult.rows[0].now}\n`);
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('⚠️  Deseja limpar todas as tabelas antes de popular? (s/N): ', async (answer) => {
      if (answer.toLowerCase() === 's') {
        await limparTabelas();
      }
      readline.close();
      await popular();
    });
    
  } catch (error) {
    console.error('❌ ERRO DE CONEXÃO:', error);
    process.exit(1);
  }
}

// Executar
main();
