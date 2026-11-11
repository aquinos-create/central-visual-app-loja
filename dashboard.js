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
  const metodo = valor?.metodologiaNeon04;
  if (!metodo || !Array.isArray(metodo.capacidades) || metodo.capacidades.length !== 24 ||
      !Array.isArray(metodo.prontidao?.gates) || metodo.prontidao.gates.length !== 8 ||
      !Array.isArray(valor?.checkpoints) || !Array.isArray(valor?.proximosBlocos)) {
    throw new Error("Estrutura incompleta no progresso.json da Migração Neon 04.");
  }
  const soma = metodo.capacidades.reduce((total, item) => total + item.peso, 0);
  const concluidos = metodo.capacidades.filter((item) => item.estado === "Completa")
    .reduce((total, item) => total + item.peso, 0);
  const p0 = metodo.capacidades.filter((item) => item.prioridade === "P0");
  const totalP0 = p0.reduce((total, item) => total + item.peso, 0);
  const completosP0 = p0.filter((item) => item.estado === "Completa")
    .reduce((total, item) => total + item.peso, 0);
  const gates = metodo.prontidao.gates.filter((gate) => gate.evidenciado).length;
  if (soma !== 161 || concluidos !== 95 || totalP0 !== 152 || completosP0 !== 95 ||
      gates !== 2 || metodo.funcional.percentual !== 59 || metodo.p0.percentual !== 62.5 ||
      metodo.prontidao.percentual !== 25) {
    throw new Error("Indicadores incompatíveis com a matriz aprovada da Migração Neon 04.");
  }
}

function preencherDashboard(valor) {
  const projeto = valor.projeto;
  const atual = valor.situacaoAtual;
  const metodo = valor.metodologiaNeon04;
  const capacidades = metodo.capacidades;
  const contagens = contarEstados(capacidades);
  const progresso = metodo.funcional.percentual;

  texto(refs.ambiente, projeto.ambiente);
  texto(refs.versao, "NEON-04");
  texto(refs.data, formatarData(projeto.atualizadoEm));
  texto(refs.btnCheckpoint, atual.ultimoCheckpoint.id);
  texto(refs.corePercent, formatarPercentual(progresso));
  texto(refs.coreCheckpoint, atual.ultimoCheckpoint.id);
  texto(refs.totalModulos, capacidades.length);
  texto(refs.countAndamento, contagens.parciais);
  texto(refs.countDefinidos, contagens.concluidas);
  texto(refs.countNaoIniciados, contagens.pendentes);
  texto(refs.summaryTotal, capacidades.length);
  texto(refs.summaryActive, contagens.parciais);
  texto(refs.summaryDefined, contagens.concluidas);
  texto(refs.summaryIdle, contagens.pendentes);
  texto(refs.taskModule, "Prontidão independente do progresso funcional");
  texto(refs.taskTitle, `${metodo.prontidao.percentual}% · ${metodo.prontidao.evidenciados} de ${metodo.prontidao.total} gates`);
  texto(refs.taskBlock, `Uso real: ${metodo.prontidao.estado}`);
  texto(refs.statusNote, `Funcional: 95/161 = 59,0% · P0: 95/152 = 62,5% · prontidão: 2/8 = 25%. Uso real: NÃO PRONTO.`);

  refs.coreProgress.style.background = `conic-gradient(from -90deg, var(--cyan) 0 ${progresso}%, rgba(79,216,255,.08) ${progresso}% 100%)`;
  refs.stateDonut.style.background = montarGradienteEstados(capacidades, contagens);
  refs.stateDonut.setAttribute("aria-label", `${contagens.concluidas} capacidades completas, ${contagens.parciais} parciais e ${contagens.pendentes} não implementadas.`);

  renderizarFrentes(metodo);
  renderizarProximos(valor.proximosBlocos);
  renderizarPrioridades(valor.proximosBlocos);
  renderizarTimeline(valor.checkpoints, atual.ultimoCheckpoint.id);
}

function contarEstados(capacidades) {
  return capacidades.reduce((acc, item) => {
    if (item.estado === "Completa") acc.concluidas += 1;
    else if (item.estado === "Parcial") acc.parciais += 1;
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

function renderizarFrentes(metodo) {
  const indicadores = [
    ["Funcional · 95/161", metodo.funcional.percentual],
    ["Essenciais P0 · 95/152", metodo.p0.percentual],
    ["Prontidão · 2/8 gates", metodo.prontidao.percentual]
  ];
  refs.frontList.replaceChildren();
  indicadores.forEach(([rotulo, numero]) => {
    const linha = document.createElement("div");
    linha.className = "front-row";
    const meta = document.createElement("div");
    meta.className = "front-row__meta";
    const nome = document.createElement("span");
    nome.textContent = rotulo;
    const valor = document.createElement("strong");
    valor.textContent = numero === 25 ? "25%" : `${formatarPercentual(numero)}%`;
    meta.append(nome, valor);
    const trilho = document.createElement("div");
    trilho.className = "segmented-track";
    const barra = document.createElement("span");
    barra.style.setProperty("--value", `${numero}%`);
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
  const metodo = dados.metodologiaNeon04;
  const kpis = document.createElement("div");
  kpis.className = "modal-kpis";
  [
    ["59,0%", "Funcional · 95/161"],
    ["62,5%", "P0 · 95/152"],
    ["25%", "Prontidão · 2/8"],
    ["NÃO PRONTO", "Uso real"]
  ].forEach(([valor, rotulo]) => kpis.appendChild(criarKpi(valor, rotulo)));
  const nota = document.createElement("div");
  nota.className = "modal-note";
  nota.textContent = `${metodo.regra} ${metodo.limite} Os 8 gates são obrigatórios; não há compensação por média.`;
  const lista = document.createElement("div");
  lista.className = "modal-list";
  metodo.prontidao.gates.forEach((gate, indice) => {
    lista.appendChild(criarItemModal(String(indice + 1).padStart(2, "0"), gate.nome,
      gate.evidenciado ? "Evidência experimental" : "Ainda não evidenciado", gate.evidenciado ? "2/8" : "Pendente"));
  });
  container.append(kpis, nota, lista);
  return { titulo: "Cobertura funcional e prontidão", corpo: container };
}

function modalModulos() {
  const lista = document.createElement("div");
  lista.className = "modal-list";
  dados.metodologiaNeon04.capacidades.forEach((item, indice) => {
    lista.appendChild(criarItemModal(String(indice + 1).padStart(2, "0"), item.nome,
      `${item.estado} · ${item.evidenciaOuLacuna}`, `${item.prioridade} · peso ${item.peso}`));
  });
  return { titulo: "24 capacidades da matriz Neon 04", corpo: lista };
}

function modalFrentes() {
  const lista = document.createElement("div");
  lista.className = "modal-list";
  const metodo = dados.metodologiaNeon04;
  lista.append(
    criarItemModal("01", "Progresso funcional", "95 pontos completos de 161. Capacidades parciais recebem zero.", "59,0%"),
    criarItemModal("02", "Funcionalidades essenciais P0", "95 pontos completos de 152 no recorte essencial.", "62,5%"),
    criarItemModal("03", "Prontidão para uso real", "2 de 8 gates evidenciados experimentalmente; todos são obrigatórios.", "25%")
  );
  const nota = document.createElement("div");
  nota.className = "modal-note";
  nota.textContent = `${metodo.limite} Uso real: NÃO PRONTO.`;
  const container = document.createElement("div");
  container.append(lista, nota);
  return { titulo: "Indicadores da Migração Neon 04", corpo: container };
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
    criarKpi("Experimental", "Ambiente")
  );
  const nota = document.createElement("div");
  nota.className = "modal-note";
  nota.textContent = tarefa.tituloCompleto;
  const lista = document.createElement("div");
  lista.className = "modal-list";
  lista.appendChild(criarItemModal("Agora", tarefa.tituloCurto, tarefa.blocoTecnicoImediato, "Tarefa ativa"));
  container.append(kpis, nota, lista);
  return { titulo: "Prontidão para uso real", corpo: container };
}

function modalProximos() {
  const lista = document.createElement("div");
  lista.className = "modal-list";
  [...dados.proximosBlocos].sort((a, b) => a.ordem - b.ordem).forEach((bloco) => {
    lista.appendChild(criarItemModal(String(bloco.ordem).padStart(2, "0"), bloco.titulo, bloco.detalhe, bloco.modulo));
  });
  return { titulo: "Pendências para decisão", corpo: lista };
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
    criarKpi("Experimental", "Ambiente")
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

function formatarPercentual(valor) {
  return Number(valor).toFixed(1).replace(".", ",");
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
