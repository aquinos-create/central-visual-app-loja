"use strict";

const CAMINHO_DADOS = "progresso.json";

const estadoRotulo = {
  validado: "Concluído",
  em_andamento: "Parcial",
  definido: "Escopo definido",
  nao_iniciado: "Não iniciado",
  descartado: "Testado e descartado",
  pendente_producao: "Pendente antes de Produção"
};

const refs = {
  ambiente: document.querySelector("#meta-ambiente"),
  versao: document.querySelector("#meta-versao"),
  data: document.querySelector("#meta-data"),
  btnCheckpoint: document.querySelector("#btn-checkpoint-atual"),
  corePercent: document.querySelector("#core-percent"),
  coreCheckpoint: document.querySelector("#core-checkpoint"),
  coreProgress: document.querySelector("#core-progress"),
  totalModulos: document.querySelector("#total-modulos"),
  countAndamento: document.querySelector("#count-andamento"),
  countDefinidos: document.querySelector("#count-definidos"),
  countNaoIniciados: document.querySelector("#count-nao-iniciados"),
  stateDonut: document.querySelector("#state-donut"),
  frontList: document.querySelector("#front-list"),
  taskModule: document.querySelector("#task-module"),
  taskTitle: document.querySelector("#task-title"),
  taskBlock: document.querySelector("#task-block"),
  nextList: document.querySelector("#next-list"),
  miniTimeline: document.querySelector("#mini-timeline"),
  summaryTotal: document.querySelector("#summary-total"),
  summaryActive: document.querySelector("#summary-active"),
  summaryDefined: document.querySelector("#summary-defined"),
  summaryIdle: document.querySelector("#summary-idle"),
  priorityList: document.querySelector("#priority-list"),
  statusNote: document.querySelector("#status-note"),
  modalBackdrop: document.querySelector("#modal-backdrop"),
  modalTitle: document.querySelector("#modal-title"),
  modalBody: document.querySelector("#modal-body"),
  modalClose: document.querySelector("#modal-close"),
  modalCloseFooter: document.querySelector("#modal-close-footer")
};

let dados = null;
let focoAnterior = null;

document.addEventListener("DOMContentLoaded", iniciar);

async function iniciar() {
  configurarInteracoesBase();

  try {
    dados = await carregarDados();
    validarDados(dados);
    preencherDashboard(dados);
  } catch (erro) {
    console.error(erro);
    exibirFalha(erro);
  }
}

async function carregarDados() {
  if (window.location.protocol === "file:") {
    throw new Error("Abra a Central Visual pelo GitHub Pages ou por um servidor local para permitir a leitura do progresso.json.");
  }

  const resposta = await fetch(CAMINHO_DADOS, {
    cache: "no-store",
    headers: { Accept: "application/json" }
  });

  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar ${CAMINHO_DADOS}. Código HTTP ${resposta.status}.`);
  }

  return resposta.json();
}

function validarDados(valor) {
  const faltantes = [];
  if (!valor?.projeto?.progressoGeral) faltantes.push("projeto.progressoGeral");
  if (!valor?.situacaoAtual?.ultimoCheckpoint) faltantes.push("situacaoAtual.ultimoCheckpoint");
  if (!valor?.situacaoAtual?.tarefaAtual) faltantes.push("situacaoAtual.tarefaAtual");
  if (!Array.isArray(valor?.modulos)) faltantes.push("modulos");
  if (!Array.isArray(valor?.proximosBlocos)) faltantes.push("proximosBlocos");
  if (!Array.isArray(valor?.checkpoints)) faltantes.push("checkpoints");
  if (!Array.isArray(valor?.metodologiaProgressoV1?.itens)) faltantes.push("metodologiaProgressoV1.itens");
  if (faltantes.length) throw new Error(`Estrutura incompleta no progresso.json: ${faltantes.join(", ")}.`);
}

function preencherDashboard(valor) {
  const projeto = valor.projeto;
  const atual = valor.situacaoAtual;
  const progresso = percentual(projeto.progressoGeral.percentual);
  const contagens = contarEstados(valor.modulos);

  texto(refs.ambiente, projeto.ambiente);
  texto(refs.versao, projeto.versaoLogica);
  texto(refs.data, formatarData(projeto.atualizadoEm));
  texto(refs.btnCheckpoint, atual.ultimoCheckpoint.id);
  texto(refs.corePercent, progresso);
  texto(refs.coreCheckpoint, atual.ultimoCheckpoint.id);
  texto(refs.totalModulos, valor.modulos.length);
  texto(refs.countAndamento, contagens.parciais);
  texto(refs.countDefinidos, contagens.concluidas);
  texto(refs.countNaoIniciados, contagens.pendentes);
  texto(refs.summaryTotal, valor.modulos.length);
  texto(refs.summaryActive, contagens.parciais);
  texto(refs.summaryDefined, contagens.concluidas);
  texto(refs.summaryIdle, contagens.pendentes);
  texto(refs.taskModule, atual.tarefaAtual.modulo);
  texto(refs.taskTitle, atual.tarefaAtual.tituloCurto || atual.tarefaAtual.tituloCompleto);
  texto(refs.taskBlock, atual.tarefaAtual.blocoTecnicoImediato);
  texto(refs.statusNote, `Metodologia v1: ${valor.metodologiaProgressoV1.resultado.pontos} pontos / ${valor.metodologiaProgressoV1.resultado.entregasValidas} entregas de peso igual; N/A fica fora do cálculo.`);

  refs.coreProgress.style.background = `conic-gradient(from -90deg, var(--cyan) 0 ${progresso}%, rgba(79,216,255,.08) ${progresso}% 100%)`;
  refs.stateDonut.style.background = montarGradienteEstados(valor.modulos, contagens);
  refs.stateDonut.setAttribute("aria-label", `${contagens.concluidas} áreas concluídas, ${contagens.parciais} parciais e ${contagens.pendentes} pendentes.`);

  renderizarFrentes(valor.modulos);
  renderizarProximos(valor.proximosBlocos);
  renderizarPrioridades(valor.proximosBlocos);
  renderizarTimeline(valor.checkpoints, atual.ultimoCheckpoint.id);
}

function contarEstados(modulos) {
  return modulos.reduce((acc, modulo) => {
    const valor = Number(modulo.percentual);
    if (valor >= 100) acc.concluidas += 1;
    else if (valor > 0) acc.parciais += 1;
    else acc.pendentes += 1;
    return acc;
  }, { concluidas: 0, parciais: 0, pendentes: 0 });
}

function montarGradienteEstados(modulos, contagens) {
  const total = Math.max(1, modulos.length);
  const pParciais = contagens.parciais / total * 100;
  const pConcluidas = contagens.concluidas / total * 100;
  const limiteConcluidas = pParciais + pConcluidas;
  return `conic-gradient(var(--orange) 0 ${pParciais.toFixed(2)}%, var(--blue) ${pParciais.toFixed(2)}% ${limiteConcluidas.toFixed(2)}%, #4b6376 ${limiteConcluidas.toFixed(2)}% 100%)`;
}

function renderizarFrentes(modulos) {
  const frentes = [...modulos]
    .sort((a, b) => percentual(b.percentual) - percentual(a.percentual))
    .slice(0, 3);

  refs.frontList.replaceChildren();

  frentes.forEach((modulo) => {
    const linha = document.createElement("div");
    linha.className = `front-row${modulo.destaque ? " front-row--active" : ""}`;

    const meta = document.createElement("div");
    meta.className = "front-row__meta";
    const nome = document.createElement("span");
    nome.textContent = modulo.nome;
    const valor = document.createElement("strong");
    valor.textContent = `${percentual(modulo.percentual)}%`;
    meta.append(nome, valor);

    const trilho = document.createElement("div");
    trilho.className = "segmented-track";
    const barra = document.createElement("span");
    barra.style.setProperty("--value", `${percentual(modulo.percentual)}%`);
    trilho.appendChild(barra);

    linha.append(meta, trilho);
    refs.frontList.appendChild(linha);
  });
}

function renderizarProximos(blocos) {
  refs.nextList.replaceChildren();

  [...blocos].sort((a, b) => a.ordem - b.ordem).slice(0, 3).forEach((bloco, indice) => {
    const item = document.createElement("li");
    const numero = document.createElement("b");
    numero.textContent = String(indice + 1).padStart(2, "0");
    const nome = document.createElement("span");
    nome.textContent = bloco.titulo;
    const seta = document.createElement("i");
    seta.textContent = "›";
    item.append(numero, nome, seta);
    refs.nextList.appendChild(item);
  });
}

function renderizarPrioridades(blocos) {
  refs.priorityList.replaceChildren();

  [...blocos].sort((a, b) => a.ordem - b.ordem).slice(0, 3).forEach((bloco, indice) => {
    const linha = document.createElement("div");
    linha.className = `priority-row priority-row--${indice < 2 ? "high" : "medium"}`;

    const rotulo = document.createElement("span");
    const nome = document.createElement("b");
    nome.textContent = encurtarTitulo(bloco.titulo);
    const nivel = document.createElement("small");
    nivel.textContent = indice < 2 ? "Prioridade alta" : "Prioridade média";
    rotulo.append(nome, nivel);

    const segmentos = document.createElement("div");
    segmentos.className = "priority-segments";
    segmentos.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 8; i += 1) segmentos.appendChild(document.createElement("i"));

    linha.append(rotulo, segmentos);
    refs.priorityList.appendChild(linha);
  });
}

function encurtarTitulo(titulo) {
  const mapa = [
    ["Favoritos compartilhados", "Favoritos"],
    ["Proteção com uma Reserva real", "Reserva real"],
    ["Alertas e detalhes de Reserva e Lista de Espera", "Alertas e detalhes"]
  ];
  return mapa.find(([completo]) => completo === titulo)?.[1] || titulo;
}

function renderizarTimeline(checkpoints, checkpointAtual) {
  refs.miniTimeline.replaceChildren();

  checkpoints.forEach((checkpoint) => {
    const ponto = document.createElement("span");
    const atual = checkpoint.id === checkpointAtual;
    ponto.className = `timeline-node timeline-node--${atual ? "current" : checkpoint.categoria || "validado"}`;
    ponto.dataset.id = checkpoint.id;
    ponto.title = `${checkpoint.id} — ${checkpoint.titulo}`;
    refs.miniTimeline.appendChild(ponto);
  });
}

function configurarInteracoesBase() {
  document.querySelectorAll("[data-open]").forEach((elemento) => {
    elemento.addEventListener("click", () => abrirModal(elemento.dataset.open, elemento));
  });

  refs.btnCheckpoint.addEventListener("click", () => abrirModal("currentCheckpoint", refs.btnCheckpoint));
  refs.modalClose.addEventListener("click", fecharModal);
  refs.modalCloseFooter.addEventListener("click", fecharModal);
  refs.modalBackdrop.addEventListener("click", (evento) => {
    if (evento.target === refs.modalBackdrop) fecharModal();
  });
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && !refs.modalBackdrop.hidden) fecharModal();
  });
}

function abrirModal(tipo, origem) {
  if (!dados) return;
  focoAnterior = origem || document.activeElement;
  const conteudo = construirModal(tipo);
  texto(refs.modalTitle, conteudo.titulo);
  refs.modalBody.replaceChildren(conteudo.corpo);
  refs.modalBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  refs.modalClose.focus();
}

function fecharModal() {
  refs.modalBackdrop.hidden = true;
  document.body.style.overflow = "";
  if (focoAnterior instanceof HTMLElement) focoAnterior.focus();
}

function construirModal(tipo) {
  if (tipo === "modules") return modalModulos();
  if (tipo === "fronts") return modalFrentes();
  if (tipo === "task") return modalTarefa();
  if (tipo === "next") return modalProximos();
  if (tipo === "timeline") return modalTimeline();
  if (tipo === "currentCheckpoint") return modalCheckpointAtual();
  return modalVisaoGeral();
}

function modalVisaoGeral() {
  const container = document.createElement("div");
  const metodo = dados.metodologiaProgressoV1;
  const contagens = metodo.resultado;
  const kpis = document.createElement("div");
  kpis.className = "modal-kpis";
  [
    [percentual(dados.projeto.progressoGeral.percentual) + "%", "Progresso geral v1"],
    [contagens.entregasValidas, "Entregas válidas"],
    [contagens.concluidas, "Concluídas"],
    [dados.situacaoAtual.ultimoCheckpoint.id, "Último checkpoint"]
  ].forEach(([valor, rotulo]) => kpis.appendChild(criarKpi(valor, rotulo)));

  const nota = document.createElement("div");
  nota.className = "modal-note";
  nota.textContent = dados.projeto.progressoGeral.observacao;

  const lista = document.createElement("div");
  lista.className = "modal-list";
  lista.append(
    criarItemModal("Foco atual", dados.situacaoAtual.tarefaAtual.tituloCurto, dados.situacaoAtual.tarefaAtual.blocoTecnicoImediato, dados.situacaoAtual.tarefaAtual.modulo),
    criarItemModal("Último checkpoint", dados.situacaoAtual.ultimoCheckpoint.id, dados.situacaoAtual.ultimoCheckpoint.titulo, formatarData(dados.situacaoAtual.ultimoCheckpoint.data))
  );

  container.append(kpis, nota, lista);
  return { titulo: "Visão geral da V1", corpo: container };
}

function modalModulos() {
  const grade = document.createElement("div");
  grade.className = "modal-grid";

  dados.modulos.forEach((modulo) => {
    const card = document.createElement("article");
    card.className = `modal-card${modulo.destaque ? " modal-card--active" : ""}`;
    const titulo = document.createElement("h3");
    titulo.textContent = modulo.nome;
    const estado = document.createElement("p");
    estado.textContent = modulo.estadoRotulo;
    const barra = document.createElement("div");
    barra.className = "modal-bar";
    const preenchimento = document.createElement("span");
    preenchimento.style.width = `${percentual(modulo.percentual)}%`;
    barra.appendChild(preenchimento);
    const valor = document.createElement("strong");
    valor.textContent = `${percentual(modulo.percentual)}%`;
    const resumo = document.createElement("p");
    resumo.textContent = modulo.resumo;
    const marco = document.createElement("p");
    marco.textContent = `Próximo marco: ${modulo.pendenciaPrincipal}`;
    card.append(titulo, estado, barra, valor, resumo, marco);
    grade.appendChild(card);
  });

  return { titulo: "Módulos e estados", corpo: grade };
}

function modalFrentes() {
  const lista = document.createElement("div");
  lista.className = "modal-list";
  [...dados.modulos]
    .sort((a, b) => percentual(b.percentual) - percentual(a.percentual))
    .slice(0, 5)
    .forEach((modulo, indice) => {
      lista.appendChild(criarItemModal(String(indice + 1).padStart(2, "0"), modulo.nome, modulo.resumo, `${percentual(modulo.percentual)}%`));
    });
  return { titulo: "Frentes mais avançadas", corpo: lista };
}

function modalTarefa() {
  const tarefa = dados.situacaoAtual.tarefaAtual;
  const container = document.createElement("div");
  const kpis = document.createElement("div");
  kpis.className = "modal-kpis";
  kpis.append(
    criarKpi(tarefa.modulo, "Módulo"),
    criarKpi(estadoRotulo[tarefa.estado] || "Definido", "Estado"),
    criarKpi(dados.situacaoAtual.ultimoCheckpoint.id, "Base atual"),
    criarKpi("DEV", "Ambiente")
  );
  const nota = document.createElement("div");
  nota.className = "modal-note";
  nota.textContent = tarefa.tituloCompleto;
  const lista = document.createElement("div");
  lista.className = "modal-list";
  lista.appendChild(criarItemModal("Agora", tarefa.tituloCurto, tarefa.blocoTecnicoImediato, "Tarefa ativa"));
  container.append(kpis, nota, lista);
  return { titulo: "Tarefa em execução", corpo: container };
}

function modalProximos() {
  const lista = document.createElement("div");
  lista.className = "modal-list";
  [...dados.proximosBlocos].sort((a, b) => a.ordem - b.ordem).forEach((bloco) => {
    lista.appendChild(criarItemModal(String(bloco.ordem).padStart(2, "0"), bloco.titulo, bloco.detalhe, bloco.modulo));
  });
  return { titulo: "Próximos blocos", corpo: lista };
}

function modalTimeline() {
  const lista = document.createElement("div");
  lista.className = "modal-list";
  dados.checkpoints.forEach((checkpoint) => {
    lista.appendChild(criarItemModal(checkpoint.id, checkpoint.titulo, checkpoint.resumo, formatarData(checkpoint.data)));
  });
  return { titulo: "Linha do tempo dos checkpoints", corpo: lista };
}

function modalCheckpointAtual() {
  const checkpoint = dados.checkpoints.find((item) => item.id === dados.situacaoAtual.ultimoCheckpoint.id) || dados.situacaoAtual.ultimoCheckpoint;
  const container = document.createElement("div");
  const kpis = document.createElement("div");
  kpis.className = "modal-kpis";
  kpis.append(
    criarKpi(checkpoint.id, "Checkpoint"),
    criarKpi(formatarData(checkpoint.data), "Data"),
    criarKpi(checkpoint.modulo || "Projeto", "Módulo"),
    criarKpi("DEV", "Ambiente")
  );
  const nota = document.createElement("div");
  nota.className = "modal-note";
  nota.textContent = checkpoint.resumo || checkpoint.titulo;
  container.append(kpis, nota);
  return { titulo: checkpoint.titulo, corpo: container };
}

function criarKpi(valor, rotulo) {
  const item = document.createElement("div");
  item.className = "modal-kpi";
  const forte = document.createElement("strong");
  forte.textContent = valor;
  const textoRotulo = document.createElement("span");
  textoRotulo.textContent = rotulo;
  item.append(forte, textoRotulo);
  return item;
}

function criarItemModal(codigo, titulo, detalhe, lateral) {
  const item = document.createElement("article");
  item.className = "modal-list-item";
  const code = document.createElement("b");
  code.textContent = codigo;
  const centro = document.createElement("div");
  const heading = document.createElement("h3");
  heading.textContent = titulo;
  const textoDetalhe = document.createElement("p");
  textoDetalhe.textContent = detalhe;
  centro.append(heading, textoDetalhe);
  const meta = document.createElement("small");
  meta.textContent = lateral || "";
  item.append(code, centro, meta);
  return item;
}

function exibirFalha(erro) {
  refs.statusNote.textContent = erro.message || "Não foi possível carregar os dados.";
  refs.statusNote.style.color = "var(--red)";
}

function texto(elemento, valor) {
  if (elemento && valor !== undefined && valor !== null) elemento.textContent = String(valor);
}

function percentual(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 0;
  return Math.max(0, Math.min(100, Math.round(numero)));
}

function formatarData(valor) {
  const partes = typeof valor === "string" ? valor.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
  if (!partes) return valor || "—";
  return `${partes[3]}/${partes[2]}/${partes[1]}`;
}
