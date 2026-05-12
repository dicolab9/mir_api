//--------------------------------------------------
// GERAR CPF VÁLIDO
//--------------------------------------------------

function gerarCPF() {

  let numeros = '';

  //-----------------------------------
  // GERA 9 DÍGITOS
  //-----------------------------------

  for (let i = 0; i < 9; i++) {
    numeros += Math.floor(Math.random() * 10);
  }

  //-----------------------------------
  // PRIMEIRO DÍGITO
  //-----------------------------------

  let soma1 = 0;

  for (let i = 0; i < 9; i++) {
    soma1 += parseInt(numeros[i]) * (10 - i);
  }

  let resto1 = (soma1 * 10) % 11;

  if (resto1 === 10) {
    resto1 = 0;
  }

  //-----------------------------------
  // SEGUNDO DÍGITO
  //-----------------------------------

  let soma2 = 0;

  const parcial = numeros + resto1;

  for (let i = 0; i < 10; i++) {
    soma2 += parseInt(parcial[i]) * (11 - i);
  }

  let resto2 = (soma2 * 10) % 11;

  if (resto2 === 10) {
    resto2 = 0;
  }

  //-----------------------------------
  // CPF FINAL
  //-----------------------------------

  const cpfFinal =
    numeros +
    resto1.toString() +
    resto2.toString();

  //-----------------------------------
  // PREENCHE INPUT
  //-----------------------------------

  document.getElementById('cpf').value = cpfFinal;
}

//--------------------------------------------------
// BUSCAR CEP VIA VIACEP
//--------------------------------------------------

async function buscarCEP() {

  let cep = document
    .getElementById('cep')
    .value
    .replace(/\D/g, '');

  if (cep.length !== 8) {
    return;
  }

  try {

    const response = await fetch(
      `https://viacep.com.br/ws/${cep}/json/`
    );

    const data = await response.json();

    if (data.erro) {
      alert('CEP não encontrado');
      return;
    }

    document.getElementById('rua').value =
      data.logradouro || '';

    document.getElementById('cidade').value =
      data.localidade || '';

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
    nome:      document.getElementById('nome').value,
    sobrenome: document.getElementById('sobrenome').value,
    rua:       document.getElementById('rua').value,
    casa:      document.getElementById('casa').value,
    cidade:    document.getElementById('cidade').value,
    cep:       document.getElementById('cep').value,
    cpf:       document.getElementById('cpf').value
  };

  const response = await fetch('/cadastro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  document.getElementById('resultado').innerHTML = `
    <h2>Cadastro Realizado</h2>
    <h3>Modo Tradicional</h3>
    <pre>${JSON.stringify(data.normal, null, 2)}</pre>
    <h3>MIR + MNE</h3>
    <pre>${JSON.stringify(data.mir, null, 2)}</pre>
  `;

  document.getElementById('nome').value      = '';
  document.getElementById('sobrenome').value = '';
  document.getElementById('rua').value       = '';
  document.getElementById('casa').value      = '';
  document.getElementById('cidade').value    = '';
  document.getElementById('cep').value       = '';
  document.getElementById('cpf').value       = '';

  document.getElementById('nome').focus();

  listar();
}

//--------------------------------------------------
// ESTATÍSTICAS — bytes + economia
//--------------------------------------------------

let graficoBytes;
let graficoEconomia;

async function estatisticas() {

  const response = await fetch('/estatisticas');
  const data     = await response.json();

  //-----------------------------------
  // DESTRÓI GRÁFICOS ANTIGOS
  //-----------------------------------

  if (graficoBytes)   graficoBytes.destroy();
  if (graficoEconomia) graficoEconomia.destroy();

  //-----------------------------------
  // CALCULA ECONOMIA EM %
  // Assumindo que data.normal_bytes é a
  // base e data.total_mir é o resultado
  // MIR. Ajuste os campos conforme sua API.
  //-----------------------------------

  const economiaPerc = data.normal_bytes > 0
    ? (((data.normal_bytes - data.total_mir) / data.normal_bytes) * 100).toFixed(1)
    : 0;

  //-----------------------------------
  // GRÁFICO DE BYTES
  //-----------------------------------

  graficoBytes = new Chart(
    document.getElementById('graficoBytes'),
    {
      type: 'bar',
      data: {
        labels: ['Normal', 'MIR', 'Lexical', 'Total MIR'],
        datasets: [{
          label: 'Bytes',
          data: [
            data.normal_bytes,
            data.mir_bytes,
            data.lexical_bytes,
            data.total_mir
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
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    }
  );

  //-----------------------------------
  // GRÁFICO DE ECONOMIA (doughnut)
  //-----------------------------------

  graficoEconomia = new Chart(
    document.getElementById('graficoEconomia'),
    {
      type: 'doughnut',
      data: {
        labels: ['Economia MIR', 'Tamanho restante'],
        datasets: [{
          data: [parseFloat(economiaPerc), 100 - parseFloat(economiaPerc)],
          backgroundColor: [
            'rgba(62, 207, 142, 0.85)',
            'rgba(255, 255, 255, 0.06)'
          ],
          borderColor: [
            'rgba(62, 207, 142, 1)',
            'rgba(255, 255, 255, 0.08)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        cutout: '72%',
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        }
      },
      plugins: [{
        id: 'centroEconomia',
        afterDraw(chart) {
          const { ctx, chartArea: { top, left, width, height } } = chart;
          ctx.save();
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'middle';
          const cx = left + width  / 2;
          const cy = top  + height / 2;

          // Percentual
          ctx.font      = 'bold 22px DM Sans, sans-serif';
          ctx.fillStyle = '#3ecf8e';
          ctx.fillText(economiaPerc + '%', cx, cy - 10);

          // Label
          ctx.font      = '12px DM Sans, sans-serif';
          ctx.fillStyle = '#888';
          ctx.fillText('economia', cx, cy + 14);

          ctx.restore();
        }
      }]
    }
  );
}

//--------------------------------------------------
// LISTAR
//--------------------------------------------------

async function listar() {

  const response = await fetch('/listar');
  const data     = await response.json();

  const container = document.getElementById('lista');
  container.innerHTML = '';

  data.dados.forEach(pessoa => {
    container.innerHTML += `
      <div class="card">
        <h3>${pessoa.nome} ${pessoa.sobrenome}</h3>
        <p><b>Rua:</b> ${pessoa.rua}, ${pessoa.casa}</p>
        <p><b>Cidade:</b> ${pessoa.cidade}</p>
        <p><b>CEP:</b> ${pessoa.cep}</p>
        <p><b>CPF:</b> ${pessoa.cpf}</p>
        <button class="danger" onclick="excluir(${pessoa.id})">Excluir</button>
      </div>
    `;
  });

  document.getElementById('tempo').innerHTML =
    `Tempo de execução: ${data.tempo_execucao_ms} ms`;
}

//--------------------------------------------------
// EXCLUIR
//--------------------------------------------------

async function excluir(id) {

  const confirmar = confirm(
    'Deseja realmente excluir este registro?'
  );

  if (!confirmar) return;

  await fetch(`/excluir/${id}`, { method: 'DELETE' });

  listar();
}
