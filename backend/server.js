const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./config/db');

require('dotenv').config();

const cadastroRoutes = require('./routes/cadastro.routes');
const listarRoutes = require('./routes/listar.routes');
const estatisticasRoutes = require('./routes/estatisticas.routes');
const excluirRoutes = require('./routes/excluir.routes');

const app = express();

app.disable('x-powered-by');

const allowedOrigins = new Set([
  'http://localhost:3000',
  'https://mir-api-6cip.onrender.com'
]);

app.use(cors({
  origin: function (origin, callback) {

    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origem não permitida pelo CORS'));
  }
}));

app.use(express.json());

app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/cadastro', cadastroRoutes);
app.use('/listar', listarRoutes);
app.use('/estatisticas', estatisticasRoutes);
app.use('/excluir', excluirRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ============================================================
// 🔒 ENDPOINT SEGURO DE LIMPEZA - LIMPA TODAS AS TABELAS
// ============================================================
app.post('/admin/limpar', async (req, res) => {
  const { senha } = req.body;
  const chaveSecreta = process.env.ADMIN_CLEAN_KEY;
  
  // Verificar se a chave está configurada
  if (!chaveSecreta) {
    console.error('❌ ADMIN_CLEAN_KEY não configurada no .env');
    return res.status(500).json({ 
      erro: 'Sistema de limpeza não configurado. Contate o administrador.' 
    });
  }
  
  // Validar senha
  if (senha !== chaveSecreta) {
    return res.status(403).json({ 
      erro: 'Senha de administrador inválida. Acesso negado.' 
    });
  }
  
  const client = await pool.connect();
  
  try {
    console.log('⚠️ INICIANDO LIMPEZA TOTAL DO BANCO DE DADOS...');
    console.log(`👤 Autorizado por: ${req.ip} em ${new Date().toISOString()}`);
    
    // Iniciar transação
    await client.query('BEGIN');
    
    // Contar registros antes da limpeza
    const statsAntes = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM pessoas_normal) as pessoas_normal,
        (SELECT COUNT(*) FROM pessoas_mir) as pessoas_mir,
        (SELECT COUNT(*) FROM lexical_nome) as lexical_nome,
        (SELECT COUNT(*) FROM lexical_sobrenome) as lexical_sobrenome,
        (SELECT COUNT(*) FROM lexical_rua) as lexical_rua,
        (SELECT COUNT(*) FROM lexical_cidade) as lexical_cidade,
        (SELECT COUNT(*) FROM lexical_cep) as lexical_cep
    `);
    
    // Limpar TODAS as tabelas usando TRUNCATE (mais rápido e reseta sequências)
    await client.query('TRUNCATE TABLE pessoas_mir CASCADE');
    await client.query('TRUNCATE TABLE pessoas_normal CASCADE');
    await client.query('TRUNCATE TABLE lexical_nome CASCADE');
    await client.query('TRUNCATE TABLE lexical_sobrenome CASCADE');
    await client.query('TRUNCATE TABLE lexical_rua CASCADE');
    await client.query('TRUNCATE TABLE lexical_cidade CASCADE');
    await client.query('TRUNCATE TABLE lexical_cep CASCADE');
    
    // Resetar sequências (garantia extra)
    await client.query("SELECT setval('pessoas_normal_id_seq', 1, false)");
    await client.query("SELECT setval('lexical_nome_id_seq', 1, false)");
    await client.query("SELECT setval('lexical_sobrenome_id_seq', 1, false)");
    await client.query("SELECT setval('lexical_rua_id_seq', 1, false)");
    await client.query("SELECT setval('lexical_cidade_id_seq', 1, false)");
    await client.query("SELECT setval('lexical_cep_id_seq', 1, false)");
    
    // Commit da transação
    await client.query('COMMIT');
    
    // Preparar objeto de retorno
    const registrosRemovidos = {
      pessoas_normal: Number.parseInt(statsAntes.rows[0].pessoas_normal || 0),
      pessoas_mir: Number.parseInt(statsAntes.rows[0].pessoas_mir || 0),
      lexical_nome: Number.parseInt(statsAntes.rows[0].lexical_nome || 0),
      lexical_sobrenome: Number.parseInt(statsAntes.rows[0].lexical_sobrenome || 0),
      lexical_rua: Number.parseInt(statsAntes.rows[0].lexical_rua || 0),
      lexical_cidade: Number.parseInt(statsAntes.rows[0].lexical_cidade || 0),
      lexical_cep: Number.parseInt(statsAntes.rows[0].lexical_cep || 0)
    };
    
    console.log('✅ LIMPEZA TOTAL CONCLUÍDA!');
    console.log('📊 Registros removidos:', registrosRemovidos);
    
    res.json({ 
      sucesso: true, 
      mensagem: 'Todas as tabelas foram limpas com sucesso! Os IDs foram resetados.',
      registrosRemovidos: registrosRemovidos,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na limpeza:', error);
    res.status(500).json({ 
      erro: 'Erro ao limpar banco de dados', 
      detalhe: error.message 
    });
  } finally {
    client.release();
  }
});

// ============================================================
// 🌱 ENDPOINT SEGURO PARA POPULAR TABELAS (SEED)
// ============================================================
app.post('/admin/seed', async (req, res) => {
  const { senha } = req.body;
  const chaveSecreta = process.env.ADMIN_CLEAN_KEY;
  
  // Verificar se a chave está configurada
  if (!chaveSecreta) {
    return res.status(500).json({ 
      erro: 'Sistema de seed não configurado. Contate o administrador.' 
    });
  }
  
  // Validar senha (mesma chave da limpeza)
  if (senha !== chaveSecreta) {
    return res.status(403).json({ 
      erro: 'Senha de administrador inválida. Acesso negado.' 
    });
  }
  
  const { quantidade = 100 } = req.body; // Padrão 100 registros
  
  if (quantidade > 10000) {
    return res.status(400).json({ 
      erro: 'Quantidade máxima permitida é 10.000 registros por vez.' 
    });
  }
  
  const client = await pool.connect();
  
  try {
    console.log(`🌱 INICIANDO POPULAÇÃO DE ${quantidade} REGISTROS...`);
    console.log(`👤 Autorizado por: ${req.ip} em ${new Date().toISOString()}`);
    
    await client.query('BEGIN');
    
    // Massas de dados
    const nomes = [
      'José', 'Maria', 'João', 'Ana', 'Carlos', 'Lucas', 'Fernanda', 'Paulo', 
      'Juliana', 'Ricardo', 'Patrícia', 'Roberto', 'Cristina', 'André', 'Camila',
      'Beatriz', 'Rafael', 'Amanda', 'Diego', 'Larissa', 'Thiago', 'Vanessa'
    ];
    
    const sobrenomesLista = [
      'Silva', 'Souza', 'Oliveira', 'Alencar', 'Batista', 'Costa', 'Pereira', 
      'Rodrigues', 'Amorim', 'Lacerda', 'Ferreira', 'Almeida', 'Nascimento', 'Lima'
    ];
    
    const ruas = [
      'Rua das Flores', 'Rua Carlos Lacerda', 'Rua Central', 'Rua A', 'Rua B', 
      'Rua das Palmeiras', 'Avenida Brasil', 'Rua 1', 'Rua 2', 'Rua 3'
    ];
    
    const cidades = [
      'Volta Redonda', 'Barra Mansa', 'Resende', 'Rio de Janeiro', 'São Paulo'
    ];
    
    const ceps = ['27220110', '27255120', '20040002', '27500000', '01001000'];
    
    // Funções auxiliares
    const random = (arr) => arr[Math.floor(Math.random() * arr.length)];
    
    const encodeBase62 = (numero) => {
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      if (numero === 0) return '0';
      let resultado = '';
      let n = numero;
      while (n > 0) {
        resultado = chars[n % 62] + resultado;
        n = Math.floor(n / 62);
      }
      return resultado;
    };
    
    const gerarCPF = () => {
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
    };
    
    const tokenProgressivo = (prefixo, numero) => {
      return `${prefixo}${encodeBase62(numero)}`;
    };
    
    // Buscar ou criar token
    const obterOuCriarToken = async (tabela, prefixo, valor, contadores) => {
      if (!valor || valor.trim() === '') return null;
      valor = valor.trim();
      
      const busca = await client.query(`
        SELECT token FROM ${tabela} WHERE LOWER(valor) = LOWER($1)
      `, [valor]);
      
      if (busca.rows.length > 0) {
        return busca.rows[0].token;
      }
      
      const token = tokenProgressivo(prefixo, contadores[tabela]);
      await client.query(`
        INSERT INTO ${tabela} (token, valor, frequencia)
        VALUES ($1, $2, 1)
      `, [token, valor]);
      
      contadores[tabela]++;
      return token;
    };
    
    // Contadores
    const contadores = {
      'lexical_nome': 0,
      'lexical_sobrenome': 0,
      'lexical_rua': 0,
      'lexical_cidade': 0,
      'lexical_cep': 0
    };
    
    // Buscar contadores atuais
    for (const tabela of Object.keys(contadores)) {
      const result = await client.query(`SELECT COUNT(*) FROM ${tabela}`);
      contadores[tabela] = Number.parseInt(result.rows[0].count);
    }
    
    let inseridos = 0;
    
    for (let i = 0; i < quantidade; i++) {
      // Gerar dados
      const nome = random(nomes);
      const sobrenome = `${random(sobrenomesLista)} ${random(sobrenomesLista)}`;
      const rua = random(ruas);
      const cidade = random(cidades);
      const cep = random(ceps);
      const casa = Math.floor(Math.random() * 9999) + 1;
      const cpf = gerarCPF();
      
      // Inserir na tabela normal
      const normalResult = await client.query(`
        INSERT INTO pessoas_normal (nome, sobrenome, rua, casa, cidade, cep, cpf)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [nome, sobrenome, rua, casa, cidade, cep, cpf]);
      
      const pessoaId = normalResult.rows[0].id;
      
      // Tokenização
      const nomeToken = await obterOuCriarToken('lexical_nome', 'N', nome, contadores);
      const sobrenomeToken = await obterOuCriarToken('lexical_sobrenome', 'S', sobrenome, contadores);
      const ruaToken = await obterOuCriarToken('lexical_rua', 'R', rua, contadores);
      const cidadeToken = await obterOuCriarToken('lexical_cidade', 'C', cidade, contadores);
      const cepToken = await obterOuCriarToken('lexical_cep', 'E', cep, contadores);
      
      // CPF compactado (apenas 9 primeiros dígitos)
      const cpfBase = cpf.substring(0, 9);
      const cpfCompactado = encodeBase62(Number.parseInt(cpfBase, 10));
      
      // Inserir na tabela MIR
      await client.query(`
        INSERT INTO pessoas_mir (id, nome_token, sobrenome_token, rua_token, casa, cidade_token, cep_token, cpf_mne)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [pessoaId, nomeToken, sobrenomeToken, ruaToken, casa, cidadeToken, cepToken, cpfCompactado]);
      
      inseridos++;
      
      if ((i + 1) % 100 === 0) {
        console.log(`   ${i + 1} registros inseridos...`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`✅ POPULAÇÃO CONCLUÍDA! ${inseridos} registros inseridos.`);
    
    res.json({ 
      sucesso: true, 
      mensagem: `${inseridos} registros inseridos com sucesso!`,
      registrosInseridos: inseridos,
      tokensUtilizados: contadores,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na população:', error);
    res.status(500).json({ 
      erro: 'Erro ao popular banco de dados', 
      detalhe: error.message 
    });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor MIR/MNE rodando na porta ${PORT}`);
  console.log(`🔒 Modo seguro: Limpeza requer senha administrativa`);
});
