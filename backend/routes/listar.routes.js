const router = require('express').Router();
const pool = require('../config/db');
const { decodeBase62 } = require('../utils/base62');
const { calcularDigitosVerificadores, formatarCPF } = require('../services/cpf.service');
const { reconstruirSobrenome } = require('../services/mir.service');

// GET /listar?page=1&limit=20
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Parâmetros de paginação
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Limitar máximo de itens por página
    const maxLimit = 100;
    const finalLimit = Math.min(limit, maxLimit);
    
    // Buscar total de registros
    const totalResult = await pool.query('SELECT COUNT(*) FROM pessoas_mir');
    const totalRegistros = Number.parseInt(totalResult.rows[0].count);
    const totalPaginas = Math.ceil(totalRegistros / finalLimit);
    
    // Buscar registros paginados
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
      LIMIT $1 OFFSET $2
    `, [finalLimit, offset]);

    const dados = [];

    for (const pessoa of pessoas.rows) {
      // Buscar nome
      const nomeResult = await pool.query(`
        SELECT valor FROM lexical_nome WHERE token = $1
      `, [pessoa.nome_token]);
      
      // Buscar rua
      const ruaResult = await pool.query(`
        SELECT valor FROM lexical_rua WHERE token = $1
      `, [pessoa.rua_token]);
      
      // Buscar cidade
      const cidadeResult = await pool.query(`
        SELECT valor FROM lexical_cidade WHERE token = $1
      `, [pessoa.cidade_token]);
      
      // Buscar CEP
      const cepResult = await pool.query(`
        SELECT valor FROM lexical_cep WHERE token = $1
      `, [pessoa.cep_token]);
      
      // Reconstruir sobrenome
      const sobrenomeCompleto = pessoa.sobrenome_token
        ? await reconstruirSobrenome(pessoa.sobrenome_token)
        : '';
      
      // Decodificar e reconstruir CPF
      let cpfFormatado = 'Não informado';
      if (pessoa.cpf_mne) {
        try {
          const baseCPF = decodeBase62(pessoa.cpf_mne);
          const basePadded = baseCPF.padStart(9, '0');
          const cpfCompleto = calcularDigitosVerificadores(basePadded);
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
      paginacao: {
        pagina_atual: page,
        limite_por_pagina: finalLimit,
        total_registros: totalRegistros,
        total_paginas: totalPaginas,
        tem_proxima: page < totalPaginas,
        tem_anterior: page > 1,
        primeiro_registro: offset + 1,
        ultimo_registro: Math.min(offset + finalLimit, totalRegistros)
      },
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
