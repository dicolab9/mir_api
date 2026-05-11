//--------------------------------------------------
// CADASTRAR
//--------------------------------------------------

async function cadastrar() {

  const body = {

    nome:
      document.getElementById('nome').value,

    sobrenome:
      document.getElementById('sobrenome').value,

    rua:
      document.getElementById('rua').value,

    casa:
      document.getElementById('casa').value,

    cidade:
      document.getElementById('cidade').value,

    cep:
      document.getElementById('cep').value,

    cpf:
      document.getElementById('cpf').value
  };

  //-----------------------------------
  // CADASTRO
  //-----------------------------------

  const response = await fetch('/cadastro', {

    method: 'POST',

    headers: {
      'Content-Type': 'application/json'
    },

    body: JSON.stringify(body)
  });

  const data = await response.json();

  //-----------------------------------
  // RESULTADO
  //-----------------------------------

  document.getElementById('resultado').innerHTML = `

    <h2>Cadastro Realizado</h2>

    <h3>Modo Tradicional</h3>

    <pre>
${JSON.stringify(data.normal, null, 2)}
    </pre>

    <h3>MIR + MNE</h3>

    <pre>
${JSON.stringify(data.mir, null, 2)}
    </pre>
  `;

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

  //-----------------------------------
  // LIMPA CONTAINER
  //-----------------------------------

  container.innerHTML = '';

  //-----------------------------------
  // MONTA CARDS
  //-----------------------------------

  data.dados.forEach(pessoa => {

    container.innerHTML += `

      <div class="card">

        <h3>
          ${pessoa.nome} ${pessoa.sobrenome}
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

  //-----------------------------------
  // TEMPO
  //-----------------------------------

  document.getElementById('tempo').innerHTML = `

    <p>
      <b>Total:</b>
      ${data.total_registros}
    </p>

    <p>
      <b>Tempo de execução:</b>
      ${data.tempo_execucao_ms} ms
    </p>

    <hr>
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

  //-----------------------------------
  // DELETE
  //-----------------------------------

  await fetch(`/excluir/${id}`, {
    method: 'DELETE'
  });

  //-----------------------------------
  // RECARREGA LISTA
  //-----------------------------------

  listar();
}

//--------------------------------------------------
// GERAR CPF VÁLIDO
//--------------------------------------------------

function gerarCPF() {

  //-----------------------------------
  // GERA 9 DÍGITOS
  //-----------------------------------

  let base = '';

  for (let i = 0; i < 9; i++) {

    base += Math.floor(Math.random() * 10);
  }

  //-----------------------------------
  // PRIMEIRO DÍGITO
  //-----------------------------------

  let soma1 = 0;

  for (let i = 0; i < 9; i++) {

    soma1 +=
      parseInt(base[i]) * (10 - i);
  }

  let dv1 = (soma1 * 10) % 11;

  if (dv1 === 10) {
    dv1 = 0;
  }

  //-----------------------------------
  // SEGUNDO DÍGITO
  //-----------------------------------

  let soma2 = 0;

  const parcial = base + dv1;

  for (let i = 0; i < 10; i++) {

    soma2 +=
      parseInt(parcial[i]) * (11 - i);
  }

  let dv2 = (soma2 * 10) % 11;

  if (dv2 === 10) {
    dv2 = 0;
  }

  //-----------------------------------
  // CPF FINAL
  //-----------------------------------

  const cpf =
    `${base}${dv1}${dv2}`;

  //-----------------------------------
  // FORMATA
  //-----------------------------------

  const formatado =
    cpf.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      '$1.$2.$3-$4'
    );

  //-----------------------------------
  // PREENCHE INPUT
  //-----------------------------------

  document.getElementById('cpf').value =
    formatado;
}
