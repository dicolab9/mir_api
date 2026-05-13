//--------------------------------------------------
// GERAR CPF VÁLIDO
//--------------------------------------------------

function gerarCPF() {
  let numeros = '';
  
  for (let i = 0; i < 9; i++) {
    numeros += Math.floor(Math.random() * 10);
  }
  
  let soma1 = 0;
  for (let i = 0; i < 9; i++) {
    soma1 += parseInt(numeros[i]) * (10 - i);
  }
  
  let resto1 = (soma1 * 10) % 11;
  if (resto1 === 10) resto1 = 0;
  
  let soma2 = 0;
  const parcial = numeros + resto1;
  for (let i = 0; i < 10; i++) {
    soma2 += parseInt(parcial[i]) * (11 - i);
  }
  
  let resto2 = (soma2 * 10) % 11;
  if (resto2 === 10) resto2 = 0;
  
  const cpfFinal = numeros + resto1.toString() + resto2.toString();
  document.getElementById('cpf').value = cpfFinal;
}

//--------------------------------------------------
// BUSCAR CEP VIA VIACEP
//--------------------------------------------------

async function buscarCEP() {
  let cep = document.getElementById('cep').value.replace(/\D/g, '');
  
  if (cep.length !== 8) {
    return;
  }
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();
    
    if (data.erro) {
      alert('CEP não encontrado');
      return;
    }
    
    document.getElementById('rua').value = data.logradouro || '';
    document.getElementById('cidade').value = data.localidade || '';
  } catch (error) {
    console.error(error);
    alert('Erro ao consultar CEP');
  }
}

//--------------------------------------------------
// CADASTRO
//--------------------------------------------------

async function cadastrar() {
  const body = {
    nome: document.getElementById('nome').value,
    sobrenome: document.getElementById('sobrenome').value,
    rua: document.getElementById('rua').value,
    casa: document.getElementById('casa').value,
    cidade: document.getElementById('cidade').value,
    cep: document.getElementById('cep').value,
    cpf: document.getElementById('cpf').value
  };
  
  try {
    const response = await fetch('/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.erro || 'Erro no cadastro');
    }
    
    document.getElementById('resultado').innerHTML = `
      <div style="background: #1a1a1a; padding: 15px; border-radius: 8px; margin-top: 20px;">
        <h2 style="color: #4caf50;">✅ Cadastro Realizado com Sucesso!</h2>
        <h3>📝 Modo Tradicional</h3>
        <pre style="background: #0d0d0d; padding: 10px; border-radius: 4px;">${JSON.stringify(data.normal, null, 2)}</pre>
        <h3>🔐 MIR + MNE</h3>
        <pre style="background: #0d0d0d; padding: 10px; border-radius: 4px;">${JSON.stringify(data.mir, null, 2)}</pre>
      </div>
    `;
    
    // Limpar formulário
    document.getElementById('nome').value = '';
    document.getElementById('sobrenome').value = '';
    document.getElementById('rua').value = '';
    document.getElementById('casa').value = '';
    document.getElementById('cidade').value = '';
    document.getElementById('cep').value = '';
    document.getElementById('cpf').value = '';
    
    document.getElementById('nome').focus();
    
    // Atualizar listagem e estatísticas
    await listar();
    await estatisticas();
    
  } catch (error) {
    console.error('Erro no cadastro:', error);
    document.getElementById('resultado').innerHTML = `
      <div style="background: #2a1a1a; padding: 15px; border-radius: 8px; margin-top: 20px;">
        <h2 style="color: #f44336;">❌ Erro no Cadastro</h2>
        <p>${error.message}</p>
      </div>
    `;
  }
}

//--------------------------------------------------
// ESTATÍSTICAS - VERSÃO CORRIGIDA
//--------------------------------------------------

let graficoBytes;
let graficoEconomia;

async function estatisticas() {
  try {
    const response = await fetch('/estatisticas');
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.erro || 'Erro nas estatísticas');
    }
    
    if (graficoBytes) graficoBytes.destroy();
    if (graficoEconomia) graficoEconomia.destroy();
    
    // Gráfico de Bytes (Barras)
    const ctxBytes = document.getElementById('graficoBytes').getContext('2d');
    graficoBytes = new Chart(ctxBytes, {
      type: 'bar',
      data: {
        labels: ['Normal', 'MIR', 'Lexical', 'Total MIR'],
        datasets: [{
          label: 'Bytes',
          data: [
            data.normal_bytes || 0,
            data.mir_bytes || 0,
            data.lexical_bytes || 0,
            data.total_mir || 0
          ],
          backgroundColor: [
            'rgba(124, 111, 255, 0.25)',
            'rgba(124, 111, 255, 0.50)',
            'rgba(124, 111, 255, 0.75)',
            'rgba(124, 111, 255, 1.00)'
          ],
          borderColor: 'rgba(124, 111, 255, 1)',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { 
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) label += ': ';
                label += context.raw.toLocaleString() + ' bytes';
                return label;
              }
            }
          }
        },
        scales: {
          x: { 
            ticks: { color: '#888' }, 
            grid: { color: 'rgba(255,255,255,0.05)' } 
          },
          y: { 
            ticks: { color: '#888' }, 
            grid: { color: 'rgba(255,255,255,0.05)' },
            title: {
              display: true,
              text: 'Bytes',
              color: '#888'
            }
          }
        }
      }
    });
    
    // Gráfico de Economia (Doughnut/Rosca) - VERSÃO CORRIGIDA
    const economiaPerc = data.economia_percentual || 0;
    const ctxEconomia = document.getElementById('graficoEconomia').getContext('2d');
    
    graficoEconomia = new Chart(ctxEconomia, {
      type: 'doughnut',
      data: {
        labels: ['Economia MIR', 'Tamanho restante'],
        datasets: [{
          data: [economiaPerc, 100 - economiaPerc],
          backgroundColor: [
            'rgba(62, 207, 142, 0.85)',
            'rgba(255, 255, 255, 0.06)'
          ],
          borderColor: [
            'rgba(62, 207, 142, 1)',
            'rgba(255, 255, 255, 0.08)'
          ],
          borderWidth: 1,
          borderRadius: 8,
          spacing: 2
        }]
      },
      options: {
        cutout: '65%',  // Reduzido de 72% para 65% (mais centralizado)
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { 
            display: true,
            position: 'bottom',
            labels: {
              color: '#888',
              font: { size: 11, family: "'DM Sans', sans-serif" },
              boxWidth: 10,
              padding: 8
            }
          },
          tooltip: { 
            callbacks: {
              label: function(context) {
                return `${context.label}: ${context.raw.toFixed(1)}%`;
              }
            }
          }
        },
        layout: {
          padding: {
            top: 10,
            bottom: 10,
            left: 10,
            right: 10
          }
        }
      },
      plugins: [{
        id: 'centroEconomia',
        afterDraw(chart) {
          const { ctx, chartArea: { top, left, width, height } } = chart;
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const cx = left + width / 2;
          const cy = top + height / 2;
          
          // Percentual central (maior)
          ctx.font = 'bold 20px "DM Sans", sans-serif';
          ctx.fillStyle = '#3ecf8e';
          ctx.fillText(economiaPerc.toFixed(1) + '%', cx, cy - 8);
          
          // Label "economia" abaixo
          ctx.font = '11px "DM Sans", sans-serif';
          ctx.fillStyle = '#888';
          ctx.fillText('de economia', cx, cy + 14);
          
          ctx.restore();
        }
      }]
    });

    // Exibir estatísticas em texto
    document.getElementById('stats').innerHTML = `
📊 ESTATÍSTICAS DO BANCO DE DADOS

📝 Tabela Normal:
   • Registros: ${data.normal.toLocaleString()}
   • Tamanho: ${formatarBytes(data.normal_bytes)}

🔐 Tabela MIR:
   • Registros: ${data.mir.toLocaleString()}
   • Tamanho: ${formatarBytes(data.mir_bytes)}

📚 Tabelas Lexicais:
   • Tamanho total: ${formatarBytes(data.lexical_bytes)}

💾 Total MIR + Lexical:
   • Tamanho: ${formatarBytes(data.total_mir)}

📈 Economia: ${economiaPerc.toFixed(2)}%
    `;
    
  } catch (error) {
    console.error('Erro nas estatísticas:', error);
    document.getElementById('stats').innerHTML = `
      ❌ Erro ao carregar estatísticas: ${error.message}
    `;
  }
}

function formatarBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// //--------------------------------------------------
// // ESTATÍSTICAS
// //--------------------------------------------------

// let graficoBytes;
// let graficoEconomia;

// async function estatisticas() {
//   try {
//     const response = await fetch('/estatisticas');
//     const data = await response.json();
    
//     if (!response.ok) {
//       throw new Error(data.erro || 'Erro nas estatísticas');
//     }
    
//     if (graficoBytes) graficoBytes.destroy();
//     if (graficoEconomia) graficoEconomia.destroy();
    
//     // Gráfico de Bytes
//     const ctxBytes = document.getElementById('graficoBytes').getContext('2d');
//     graficoBytes = new Chart(ctxBytes, {
//       type: 'bar',
//       data: {
//         labels: ['Normal', 'MIR', 'Lexical', 'Total MIR'],
//         datasets: [{
//           label: 'Bytes',
//           data: [
//             data.normal_bytes || 0,
//             data.mir_bytes || 0,
//             data.lexical_bytes || 0,
//             data.total_mir || 0
//           ],
//           backgroundColor: [
//             'rgba(124, 111, 255, 0.25)',
//             'rgba(124, 111, 255, 0.50)',
//             'rgba(124, 111, 255, 0.75)',
//             'rgba(124, 111, 255, 1.00)'
//           ],
//           borderColor: 'rgba(124, 111, 255, 1)',
//           borderWidth: 1,
//           borderRadius: 6
//         }]
//       },
//       options: {
//         responsive: true,
//         maintainAspectRatio: true,
//         plugins: { 
//           legend: { display: false },
//           tooltip: {
//             callbacks: {
//               label: function(context) {
//                 let label = context.dataset.label || '';
//                 if (label) label += ': ';
//                 label += context.raw.toLocaleString() + ' bytes';
//                 return label;
//               }
//             }
//           }
//         },
//         scales: {
//           x: { 
//             ticks: { color: '#888' }, 
//             grid: { color: 'rgba(255,255,255,0.05)' } 
//           },
//           y: { 
//             ticks: { color: '#888' }, 
//             grid: { color: 'rgba(255,255,255,0.05)' },
//             title: {
//               display: true,
//               text: 'Bytes',
//               color: '#888'
//             }
//           }
//         }
//       }
//     });
    
//     // Gráfico de Economia
//     const economiaPerc = data.economia_percentual || 0;
//     const ctxEconomia = document.getElementById('graficoEconomia').getContext('2d');
    
//     graficoEconomia = new Chart(ctxEconomia, {
//       type: 'doughnut',
//       data: {
//         labels: ['Economia MIR', 'Tamanho restante'],
//         datasets: [{
//           data: [economiaPerc, 100 - economiaPerc],
//           backgroundColor: [
//             'rgba(62, 207, 142, 0.85)',
//             'rgba(255, 255, 255, 0.06)'
//           ],
//           borderColor: [
//             'rgba(62, 207, 142, 1)',
//             'rgba(255, 255, 255, 0.08)'
//           ],
//           borderWidth: 1
//         }]
//       },
//       options: {
//         cutout: '72%',
//         maintainAspectRatio: true,
//         plugins: {
//           legend: { display: false },
//           tooltip: { 
//             callbacks: {
//               label: function(context) {
//                 return `${context.label}: ${context.raw.toFixed(1)}%`;
//               }
//             }
//           }
//         }
//       },
//       plugins: [{
//         id: 'centroEconomia',
//         afterDraw(chart) {
//           const { ctx, chartArea: { top, left, width, height } } = chart;
//           ctx.save();
//           ctx.textAlign = 'center';
//           ctx.textBaseline = 'middle';
//           const cx = left + width / 2;
//           const cy = top + height / 2;
          
//           ctx.font = 'bold 22px DM Sans, sans-serif';
//           ctx.fillStyle = '#3ecf8e';
//           ctx.fillText(economiaPerc.toFixed(1) + '%', cx, cy - 10);
          
//           ctx.font = '12px DM Sans, sans-serif';
//           ctx.fillStyle = '#888';
//           ctx.fillText('economia', cx, cy + 14);
          
//           ctx.restore();
//         }
//       }]
//     });
    
//     // Exibir estatísticas em texto
//     document.getElementById('stats').innerHTML = `
// 📊 ESTATÍSTICAS DO BANCO DE DADOS

// 📝 Tabela Normal:
//    • Registros: ${data.normal.toLocaleString()}
//    • Tamanho: ${formatarBytes(data.normal_bytes)}

// 🔐 Tabela MIR:
//    • Registros: ${data.mir.toLocaleString()}
//    • Tamanho: ${formatarBytes(data.mir_bytes)}

// 📚 Tabelas Lexicais:
//    • Tamanho total: ${formatarBytes(data.lexical_bytes)}

// 💾 Total MIR + Lexical:
//    • Tamanho: ${formatarBytes(data.total_mir)}

// 📈 Economia: ${economiaPerc.toFixed(1)}%
//     `;
    
//   } catch (error) {
//     console.error('Erro nas estatísticas:', error);
//     document.getElementById('stats').innerHTML = `
//       ❌ Erro ao carregar estatísticas: ${error.message}
//     `;
//   }
// }

// function formatarBytes(bytes) {
//   if (bytes === 0) return '0 Bytes';
//   const k = 1024;
//   const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//   const i = Math.floor(Math.log(bytes) / Math.log(k));
//   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
// }

//--------------------------------------------------
// LISTAR
//--------------------------------------------------

async function listar() {
  try {
    const response = await fetch('/listar');
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.erro || 'Erro na listagem');
    }
    
    const container = document.getElementById('lista');
    container.innerHTML = '';
    
    if (data.dados.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #888;">Nenhum registro encontrado</p>';
      document.getElementById('tempo').innerHTML = '';
      return;
    }
    
    data.dados.forEach(pessoa => {
      container.innerHTML += `
        <div class="card" style="
          background: #1a1a1a;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
          border-left: 4px solid #7c6fff;
        ">
          <h3 style="margin: 0 0 10px 0; color: #7c6fff;">
            ${escapeHtml(pessoa.nome)} ${escapeHtml(pessoa.sobrenome)}
          </h3>
          <p><strong>🏠 Rua:</strong> ${escapeHtml(pessoa.rua)}, ${escapeHtml(pessoa.casa)}</p>
          <p><strong>🌆 Cidade:</strong> ${escapeHtml(pessoa.cidade)}</p>
          <p><strong>📮 CEP:</strong> ${escapeHtml(pessoa.cep)}</p>
          <p><strong>📄 CPF:</strong> ${escapeHtml(pessoa.cpf)}</p>
          <button 
            class="danger" 
            onclick="excluir(${pessoa.id})"
            style="
              background: #d32f2f;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 4px;
              cursor: pointer;
              margin-top: 10px;
            "
            onmouseover="this.style.background='#f44336'"
            onmouseout="this.style.background='#d32f2f'"
          >
            🗑️ Excluir
          </button>
        </div>
      `;
    });
    
    document.getElementById('tempo').innerHTML = `
      <p style="text-align: right; color: #888; font-size: 12px;">
        ⏱️ Tempo de execução: ${data.tempo_execucao_ms} ms
      </p>
    `;
    
  } catch (error) {
    console.error('Erro na listagem:', error);
    document.getElementById('lista').innerHTML = `
      <p style="color: #f44336;">❌ Erro ao listar registros: ${error.message}</p>
    `;
  }
}

// Função para escapar HTML e prevenir XSS
function escapeHtml(texto) {
  if (!texto) return '';
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

//--------------------------------------------------
// EXCLUIR
//--------------------------------------------------

async function excluir(id) {
  const confirmar = confirm('⚠️ Deseja realmente excluir este registro?\n\nEsta ação não pode ser desfeita!');
  
  if (!confirmar) return;
  
  try {
    const response = await fetch(`/excluir/${id}`, { 
      method: 'DELETE' 
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.erro || 'Erro na exclusão');
    }
    
    alert('✅ Registro excluído com sucesso!');
    await listar();
    await estatisticas();
    
  } catch (error) {
    console.error('Erro na exclusão:', error);
    alert(`❌ Erro ao excluir: ${error.message}`);
  }
}

//--------------------------------------------------
// FUNÇÕES DE LIMPEZA SEGURA
//--------------------------------------------------

function abrirModalLimpeza() {
  const modal = document.getElementById('modalLimpeza');
  modal.style.display = 'flex';
  document.getElementById('senhaLimpeza').value = '';
  document.getElementById('statusLimpeza').innerHTML = '';
}

function fecharModalLimpeza() {
  const modal = document.getElementById('modalLimpeza');
  modal.style.display = 'none';
}

async function confirmarLimpeza() {
  const senha = document.getElementById('senhaLimpeza').value;
  const statusDiv = document.getElementById('statusLimpeza');
  
  if (!senha) {
    statusDiv.innerHTML = '<p style="color: #ff6b6b;">❌ Digite a senha de administrador!</p>';
    return;
  }
  
  // Mostrar loading
  statusDiv.innerHTML = '<div class="loading-spinner"></div><p style="margin-top: 10px;">Processando limpeza...</p>';
  
  try {
    const response = await fetch('/admin/limpar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha: senha })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.erro || 'Erro na limpeza');
    }
    
    // Sucesso na limpeza - mostrar detalhes
    statusDiv.innerHTML = `
      <div style="background: #4caf50; padding: 15px; border-radius: 8px; color: white;">
        <strong>✅ ${data.mensagem}</strong>
      </div>
      <div style="margin-top: 15px; font-size: 13px; background: #1a1a1a; padding: 12px; border-radius: 6px;">
        <strong>📊 Registros removidos:</strong><br>
        <span style="color: #ff6b6b;">🗑️ pessoas_normal:</span> ${(data.registrosRemovidos.pessoas_normal || 0).toLocaleString()}<br>
        <span style="color: #ff6b6b;">🗑️ pessoas_mir:</span> ${(data.registrosRemovidos.pessoas_mir || 0).toLocaleString()}<br>
        <span style="color: #ff6b6b;">🗑️ lexical_nome:</span> ${(data.registrosRemovidos.lexical_nome || 0).toLocaleString()}<br>
        <span style="color: #ff6b6b;">🗑️ lexical_sobrenome:</span> ${(data.registrosRemovidos.lexical_sobrenome || 0).toLocaleString()}<br>
        <span style="color: #ff6b6b;">🗑️ lexical_rua:</span> ${(data.registrosRemovidos.lexical_rua || 0).toLocaleString()}<br>
        <span style="color: #ff6b6b;">🗑️ lexical_cidade:</span> ${(data.registrosRemovidos.lexical_cidade || 0).toLocaleString()}<br>
        <span style="color: #ff6b6b;">🗑️ lexical_cep:</span> ${(data.registrosRemovidos.lexical_cep || 0).toLocaleString()}<br>
        <hr style="margin: 8px 0; border-color: #333;">
        <strong>✅ TOTAL:</strong> ${Object.values(data.registrosRemovidos).reduce((a,b) => a + (b || 0), 0).toLocaleString()} registros
      </div>
      <div style="margin-top: 10px; font-size: 12px; color: #4caf50;">
        <strong>✓ Verificação pós-limpeza:</strong> Todas as tabelas estão vazias
      </div>
    `;
    
    // Fechar modal após 3 segundos
    setTimeout(() => {
      fecharModalLimpeza();
      // Atualizar listagem e estatísticas
      listar();
      estatisticas();
      
      // Mostrar mensagem de sucesso
      const resultadoDiv = document.getElementById('resultado');
      resultadoDiv.innerHTML = `
        <div style="background: #4caf50; padding: 20px; border-radius: 8px; color: white; text-align: center;">
          <h3>✅ Banco de Dados Totalmente Limpo!</h3>
          <p>Todas as tabelas (normal, MIR e lexicais) foram zeradas.</p>
          <p>Os IDs foram resetados e você pode começar a cadastrar novos dados.</p>
        </div>
      `;
      
      // Limpar resultado após 5 segundos
      setTimeout(() => {
        if (resultadoDiv.innerHTML.includes('Banco de Dados Totalmente Limpo')) {
          resultadoDiv.innerHTML = '';
        }
      }, 5000);
    }, 3000);
    
  } catch (error) {
    console.error('Erro na limpeza:', error);
    statusDiv.innerHTML = `<p style="color: #ff6b6b;">❌ ${error.message}</p>`;
  }
}

// Fechar modal clicando fora
window.onclick = function(event) {
  const modal = document.getElementById('modalLimpeza');
  if (event.target === modal) {
    fecharModalLimpeza();
  }
}

//--------------------------------------------------
// INICIALIZAÇÃO
//--------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  listar();
  estatisticas();
});