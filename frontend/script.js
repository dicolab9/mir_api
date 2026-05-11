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
    soma1 += Number.parseInt(numeros[i]) * (10 - i);
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
    soma2 += Number.parseInt(parcial[i]) * (11 - i);
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

  //-----------------------------------
  // PEGA CEP
  //-----------------------------------

  let cep = document
    .getElementById('cep')
    .value
    .replace(/\D/g, '');

  //-----------------------------------
  // VALIDA
  //-----------------------------------

  if (cep.length !== 8) {
    return;
  }

  try {

    //-----------------------------------
    // CONSULTA API
    //-----------------------------------

    const response = await fetch(
      `https://viacep.com.br/ws/${cep}/json/`
    );

    const data = await response.json();

    //-----------------------------------
    // CEP NÃO ENCONTRADO
    //-----------------------------------

    if (data.erro) {
      alert('CEP não encontrado');
      return;
    }

    //-----------------------------------
    // PREENCHE CAMPOS
    //-----------------------------------

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
    nome: document.getElementById('nome').value,
    sobrenome: document.getElementById('sobrenome').value,
    rua: document.getElementById('rua').value,
    casa: document.getElementById('casa').value,
    cidade: document.getElementById('cidade').value,
    cep: document.getElementById('cep').value,
    cpf: document.getElementById('cpf').value
  };

  const response = await fetch('/cadastro', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
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

  //-----------------------------------
  // LIMPA CAMPOS
  //-----------------------------------

  document.getElementById('nome').value = '';

  document.getElementById('sobrenome').value = '';

  document.getElementById('rua').value = '';

  document.getElementById('casa').value = '';

  document.getElementById('cidade').value = '';

  document.getElementById('cep').value = '';

  document.getElementById('cpf').value = '';

  //-----------------------------------
  // FOCO NO PRIMEIRO INPUT
  //-----------------------------------

  document.getElementById('nome').focus();

  //-----------------------------------
  // ATUALIZA LISTAGEM
  //-----------------------------------

  listar();
}

//--------------------------------------------------
// ESTATÍSTICAS
//--------------------------------------------------

async function estatisticas() {

  const response = await fetch('/estatisticas');

  const data = await response.json();

  document.getElementById('stats').textContent =
    JSON.stringify(data, null, 2);
}

//--------------------------------------------------
// LISTAR
//--------------------------------------------------

async function listar() {

  const response = await fetch('/listar');

  const data = await response.json();

  const container =
    document.getElementById('lista');

  container.innerHTML = '';

  data.dados.forEach(pessoa => {

    container.innerHTML += `
      <div class="card">

        <h3>
          ${pessoa.nome}
          ${pessoa.sobrenome}
        </h3>

        <p>
          <b>Rua:</b>
          ${pessoa.rua}, ${pessoa.casa}
        </p>

        <p>
          <b>Cidade:</b>
          ${pessoa.cidade}
        </p>

        <p>
          <b>CEP:</b>
          ${pessoa.cep}
        </p>

        <p>
          <b>CPF:</b>
          ${pessoa.cpf}
        </p>

        <button onclick="excluir(${pessoa.id})">
          Excluir
        </button>

      </div>
    `;
  });

  document.getElementById('tempo').innerHTML = `
    Tempo de execução:
    ${data.tempo_execucao_ms} ms
  `;
}

//--------------------------------------------------
// EXCLUIR
//--------------------------------------------------

async function excluir(id) {

  const confirmar = confirm(
    'Deseja realmente excluir este registro?'
  );

  if (!confirmar) {
    return;
  }

  await fetch(`/excluir/${id}`, {
    method: 'DELETE'
  });

  listar();
}
