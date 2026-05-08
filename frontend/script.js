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

  //-----------------------------------
  // FETCH RELATIVO
  //-----------------------------------

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
}

async function estatisticas() {

  //-----------------------------------
  // FETCH RELATIVO
  //-----------------------------------

  const response = await fetch('/estatisticas');

  const data = await response.json();

  document.getElementById('stats').textContent =
    JSON.stringify(data, null, 2);
}

//--------------------------------------------------
// LISTAR REGISTROS
//--------------------------------------------------
async function listar() {

  const response = await fetch('/listar');

  const data = await response.json();

  let html = `
    <h2>Listagem MIR</h2>

    <p>
      <b>Total:</b>
      ${data.total_registros}
    </p>

    <p>
      <b>Tempo:</b>
      ${data.tempo_execucao_ms} ms
    </p>

    <hr>
  `;

  data.dados.forEach(pessoa => {

    html += `
      <div style="
        border:1px solid #ccc;
        padding:10px;
        margin-bottom:10px;
      ">

        <p>
          <b>Nome:</b>
          ${pessoa.nome} ${pessoa.sobrenome}
        </p>

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

      </div>
    `;
  });

  document.getElementById('listagem')
    .innerHTML = html;
}

// async function cadastrar() {

//   const body = {
//     nome: document.getElementById('nome').value,
//     sobrenome: document.getElementById('sobrenome').value,
//     rua: document.getElementById('rua').value,
//     casa: document.getElementById('casa').value,
//     cidade: document.getElementById('cidade').value,
//     cep: document.getElementById('cep').value,
//     cpf: document.getElementById('cpf').value
//   };

//   const response = await fetch('http://localhost:3000/cadastro', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify(body)
//   });

//   const data = await response.json();

//   document.getElementById('resultado').innerHTML = `
//     <h2>Cadastro Realizado</h2>

//     <h3>Modo Tradicional</h3>
//     <pre>${JSON.stringify(data.normal, null, 2)}</pre>

//     <h3>MIR + MNE</h3>
//     <pre>${JSON.stringify(data.mir, null, 2)}</pre>
//   `;
// }

// async function estatisticas() {

//   const response = await fetch(
//     'http://localhost:3000/estatisticas'
//   );

//   const data = await response.json();

//   document.getElementById('stats').textContent =
//     JSON.stringify(data, null, 2);
// }