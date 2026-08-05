"use strict";

const CAMINHO_DADOS = "progresso.json";

const seletores = {
  ambiente: document.querySelector("#ambiente-projeto"),
  versao: document.querySelector("#versao-logica"),
  atualizadoEm: document.querySelector("#data-atualizacao"),
  progressoGeral: document.querySelector("#progresso-geral"),
  rotuloProgresso: document.querySelector("#rotulo-progresso"),
  observacaoProgresso: document.querySelector("#observacao-progresso"),
  anelProgresso: document.querySelector("#anel-progresso"),
  nucleo: document.querySelector("#nucleo"),
  nucleoCheckpoint: document.querySelector("#nucleo-checkpoint"),
  marcadoresModulos: document.querySelector("#marcadores-modulos"),

  checkpointId: document.querySelector("#checkpoint-id"),
  checkpointTitulo: document.querySelector("#checkpoint-titulo"),
  checkpointEstado: document.querySelector("#checkpoint-estado"),
  checkpointData: document.querySelector("#checkpoint-data"),

  tarefaAtual: document.querySelector("#tarefa-atual"),
  tarefaModulo: document.querySelector("#tarefa-modulo"),
  blocoImediato: document.querySelector("#bloco-imediato"),

  gradeModulos: document.querySelector("#grade-modulos"),
  trilhaModulo: document.querySelector("#trilha-modulo"),
  listaProximos: document.querySelector("#lista-proximos"),
  listaCamadas: document.querySelector("#lista-camadas"),
  timeline: document.querySelector("#timeline-checkpoints"),
  totalCheckpoints: document.querySelector("#total-checkpoints"),
  avisoFonte: document.querySelector("#aviso-fonte"),

  filtros: [...document.querySelectorAll(".filtro")],

  templateModulo: document.querySelector("#template-modulo"),
  templateEtapa: document.querySelector("#template-etapa"),
  templateProximo: document.querySelector("#template-proximo"),
  templateCamada: document.querySelector("#template-camada"),
  templateCheckpoint: document.querySelector("#template-checkpoint")
};

let dadosDashboard = null;
let filtroAtual = "todos";

document.addEventListener("DOMContentLoaded", iniciarDashboard);

async function iniciarDashboard() {
  configurarFiltros();

  try {
    dadosDashboard = await carregarDados();
    validarEstruturaMinima(dadosDashboard);

    preencherCabecalho(dadosDashboard);
    preencherSituacaoAtual(dadosDashboard);
    preencherNucleo(dadosDashboard);
    atualizarResumoRapido(dadosDashboard);
    renderizarModulos();
    renderizarTrilha(dadosDashboard.trilhaModuloAtivo?.etapas ?? []);
    renderizarProximos(dadosDashboard.proximosBlocos ?? []);
    renderizarCamadas(dadosDashboard.camadasTransversais ?? []);
    renderizarCheckpoints(dadosDashboard.checkpoints ?? []);
    preencherRodape(dadosDashboard);
  } catch (erro) {
    console.error("Falha ao carregar a Central Visual:", erro);
    exibirErroCarregamento(erro);
  }
}

async function carregarDados() {
  if (window.location.protocol === "file:") {
    throw new Error(
      "O navegador bloqueou a leitura direta do progresso.json porque o arquivo foi aberto por duplo clique."
    );
  }

  const resposta = await fetch(CAMINHO_DADOS, {
    cache: "no-store",
    headers: {
      Accept: "application/json"
    }
  });

  if (!resposta.ok) {
    throw new Error(
      `Não foi possível carregar ${CAMINHO_DADOS}. Código HTTP: ${resposta.status}.`
    );
  }

  try {
    return await resposta.json();
  } catch {
    throw new Error(
      `${CAMINHO_DADOS} foi encontrado, mas contém um JSON inválido.`
    );
  }
}

function validarEstruturaMinima(dados) {
  const erros = [];

  if (!dados || typeof dados !== "object") {
    erros.push("objeto principal ausente");
  }

  if (!dados?.projeto) {
    erros.push("projeto");
  }

  if (!dados?.projeto?.progressoGeral) {
    erros.push("projeto.progressoGeral");
  }

  if (!dados?.situacaoAtual?.ultimoCheckpoint) {
    erros.push("situacaoAtual.ultimoCheckpoint");
  }

  if (!dados?.situacaoAtual?.tarefaAtual) {
    erros.push("situacaoAtual.tarefaAtual");
  }

  if (!Array.isArray(dados?.modulos)) {
    erros.push("modulos");
  }

  if (!Array.isArray(dados?.checkpoints)) {
    erros.push("checkpoints");
  }

  if (erros.length > 0) {
    throw new Error(
      `Estrutura incompleta no progresso.json: ${erros.join(", ")}.`
    );
  }
}

function preencherCabecalho(dados) {
  const projeto = dados.projeto;

  definirTexto(seletores.ambiente, projeto.ambiente);
  definirTexto(seletores.versao, projeto.versaoLogica);
  definirTexto(seletores.atualizadoEm, formatarData(projeto.atualizadoEm));
}

function preencherSituacaoAtual(dados) {
  const checkpoint = dados.situacaoAtual.ultimoCheckpoint;
  const tarefa = dados.situacaoAtual.tarefaAtual;

  definirTexto(seletores.checkpointId, checkpoint.id);
  definirTexto(seletores.checkpointTitulo, checkpoint.titulo);
  definirTexto(seletores.checkpointEstado, checkpoint.estado);
  definirTexto(seletores.checkpointData, formatarData(checkpoint.data));

  if (seletores.checkpointData && checkpoint.data) {
    seletores.checkpointData.dateTime = checkpoint.data;
  }

  definirTexto(seletores.tarefaAtual, tarefa.tituloCurto ?? tarefa.tituloCompleto);
  definirTexto(seletores.tarefaModulo, tarefa.modulo);
  definirTexto(seletores.blocoImediato, tarefa.blocoTecnicoImediato);
}

function preencherNucleo(dados) {
  const progresso = normalizarPercentual(
    dados.projeto.progressoGeral.percentual
  );
  const checkpoint = dados.situacaoAtual.ultimoCheckpoint?.id ?? "—";

  definirTexto(seletores.progressoGeral, String(progresso));
  definirTexto(
    seletores.rotuloProgresso,
    dados.projeto.progressoGeral.rotulo
  );
  definirTexto(
    seletores.observacaoProgresso,
    dados.projeto.progressoGeral.observacao
  );
  definirTexto(seletores.nucleoCheckpoint, checkpoint);

  if (seletores.anelProgresso) {
    seletores.anelProgresso.setAttribute(
      "stroke-dasharray",
      `${progresso} 100`
    );
  }

  if (seletores.nucleo) {
    seletores.nucleo.setAttribute(
      "aria-label",
      `${dados.projeto.progressoGeral.rotulo}: ${progresso} por cento`
    );
  }

  renderizarMarcadoresDoNucleo(dados.modulos ?? []);
}

function renderizarMarcadoresDoNucleo(modulos) {
  const grupo = seletores.marcadoresModulos;

  if (!grupo) {
    return;
  }

  grupo.replaceChildren();

  const total = modulos.length;
  const centro = 210;
  const raio = 184;

  modulos.forEach((modulo, indice) => {
    const angulo = ((indice / total) * 360 - 90) * (Math.PI / 180);
    const x = centro + raio * Math.cos(angulo);
    const y = centro + raio * Math.sin(angulo);

    const marcador = criarElementoSvg("circle", {
      cx: x.toFixed(2),
      cy: y.toFixed(2),
      r: modulo.destaque ? "5.5" : "3.5",
      class: `marcador-modulo marcador-modulo--${modulo.estado}`,
      "data-modulo": modulo.id,
      "aria-label": `${modulo.nome}: ${normalizarPercentual(modulo.percentual)}%`
    });

    aplicarCorMarcador(marcador, modulo);
    grupo.appendChild(marcador);
  });
}

function criarElementoSvg(nome, atributos = {}) {
  const elemento = document.createElementNS(
    "http://www.w3.org/2000/svg",
    nome
  );

  Object.entries(atributos).forEach(([chave, valor]) => {
    elemento.setAttribute(chave, String(valor));
  });

  return elemento;
}

function aplicarCorMarcador(elemento, modulo) {
  const cores = {
    validado: "#62d99b",
    em_andamento: "#ff9c40",
    definido: "#3b78ff",
    nao_iniciado: "#526171",
    descartado: "#b88b65",
    pendente_producao: "#ff6d78"
  };

  const cor = modulo.destaque
    ? cores.em_andamento
    : cores[modulo.estado] ?? cores.nao_iniciado;

  elemento.setAttribute("fill", cor);
  elemento.style.filter = modulo.destaque
    ? `drop-shadow(0 0 7px ${cor})`
    : `drop-shadow(0 0 3px ${cor})`;
}

function atualizarResumoRapido(dados) {
  const itensResumo = [...document.querySelectorAll(".resumo-rapido__item")];

  itensResumo.forEach((item) => {
    const nome = item.querySelector("span")?.textContent?.trim();
    const modulo = dados.modulos.find((entrada) => entrada.nome === nome);

    if (!modulo) {
      return;
    }

    const percentual = normalizarPercentual(modulo.percentual);
    const valor = item.querySelector("strong");
    const barra = item.querySelector(".barra-mini span");

    definirTexto(valor, `${percentual}%`);

    if (barra) {
      barra.style.width = `${percentual}%`;
    }
  });
}

function configurarFiltros() {
  seletores.filtros.forEach((botao) => {
    botao.addEventListener("click", () => {
      filtroAtual = botao.dataset.filtro ?? "todos";

      seletores.filtros.forEach((item) => {
        const ativo = item === botao;
        item.classList.toggle("ativo", ativo);
        item.setAttribute("aria-pressed", String(ativo));
      });

      renderizarModulos();
    });
  });
}

function renderizarModulos() {
  const container = seletores.gradeModulos;

  if (!container || !dadosDashboard) {
    return;
  }

  const modulos = dadosDashboard.modulos.filter((modulo) => {
    return filtroAtual === "todos" || modulo.estado === filtroAtual;
  });

  container.replaceChildren();

  if (modulos.length === 0) {
    container.appendChild(
      criarMensagem("Nenhum módulo corresponde a este filtro.")
    );
    container.setAttribute("aria-busy", "false");
    return;
  }

  const fragmento = document.createDocumentFragment();

  modulos.forEach((modulo) => {
    const card = seletores.templateModulo.content
      .firstElementChild
      .cloneNode(true);

    const percentual = normalizarPercentual(modulo.percentual);
    const resumo = card.querySelector(".card-modulo__resumo");
    const pendencia = card.querySelector(".card-modulo__pendencia");

    card.dataset.estado = modulo.estado;
    card.dataset.destaque = String(Boolean(modulo.destaque));
    card.dataset.expandido = "false";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-expanded", "false");
    card.setAttribute(
      "aria-label",
      `${modulo.nome}. ${modulo.estadoRotulo}. ${percentual} por cento. Clique para ver detalhes.`
    );

    definirTexto(card.querySelector(".card-modulo__grupo"), modulo.grupo);
    definirTexto(
      card.querySelector(".card-modulo__percentual"),
      `${percentual}%`
    );
    definirTexto(card.querySelector(".card-modulo__nome"), modulo.nome);
    definirTexto(
      card.querySelector(".card-modulo__estado"),
      modulo.estadoRotulo
    );
    definirTexto(resumo, modulo.resumo);
    definirTexto(
      pendencia.querySelector("strong"),
      modulo.pendenciaPrincipal
    );

    const barra = card.querySelector(".barra-progresso span");

    if (barra) {
      barra.style.width = `${percentual}%`;
    }

    const marcoCompacto = document.createElement("p");
    marcoCompacto.className = "card-modulo__marco-compacto";

    const rotuloMarco = document.createElement("span");
    rotuloMarco.textContent = "Próximo: ";

    const textoMarco = document.createElement("strong");
    textoMarco.textContent = modulo.pendenciaPrincipal;

    marcoCompacto.append(rotuloMarco, textoMarco);

    const detalhes = document.createElement("div");
    detalhes.className = "card-modulo__detalhes";
    detalhes.hidden = true;
    detalhes.append(resumo, pendencia);

    const acao = document.createElement("span");
    acao.className = "card-modulo__acao";

    const acaoTexto = document.createElement("span");
    acaoTexto.className = "card-modulo__acao-texto";
    acaoTexto.textContent = "Ver detalhes";

    const acaoIcone = document.createElement("span");
    acaoIcone.className = "card-modulo__acao-icone";
    acaoIcone.setAttribute("aria-hidden", "true");
    acaoIcone.textContent = "⌄";

    acao.append(acaoTexto, acaoIcone);
    card.append(marcoCompacto, detalhes, acao);

    const alternar = () => alternarCardModulo(card, modulo);

    card.addEventListener("click", alternar);
    card.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter" || evento.key === " ") {
        evento.preventDefault();
        alternar();
      }
    });

    fragmento.appendChild(card);
  });

  container.appendChild(fragmento);
  container.setAttribute("aria-busy", "false");
}

function alternarCardModulo(card, modulo) {
  const deveAbrir = card.dataset.expandido !== "true";

  if (deveAbrir) {
    document
      .querySelectorAll('.card-modulo[data-expandido="true"]')
      .forEach((outroCard) => {
        if (outroCard !== card) {
          definirEstadoCardModulo(outroCard, false);
        }
      });
  }

  definirEstadoCardModulo(card, deveAbrir, modulo);
}

function definirEstadoCardModulo(card, expandido, modulo = null) {
  const detalhes = card.querySelector(".card-modulo__detalhes");
  const acaoTexto = card.querySelector(".card-modulo__acao-texto");

  card.dataset.expandido = String(expandido);
  card.setAttribute("aria-expanded", String(expandido));

  if (detalhes) {
    detalhes.hidden = !expandido;
  }

  if (acaoTexto) {
    acaoTexto.textContent = expandido ? "Ocultar detalhes" : "Ver detalhes";
  }

  if (modulo) {
    const percentual = normalizarPercentual(modulo.percentual);
    card.setAttribute(
      "aria-label",
      `${modulo.nome}. ${modulo.estadoRotulo}. ${percentual} por cento. ${
        expandido ? "Detalhes abertos." : "Clique para ver detalhes."
      }`
    );
  }
}


function renderizarTrilha(etapas) {
  const container = seletores.trilhaModulo;

  if (!container) {
    return;
  }

  container.replaceChildren();

  if (etapas.length === 0) {
    container.appendChild(
      criarMensagem("Nenhuma etapa foi registrada para o módulo ativo.")
    );
    container.setAttribute("aria-busy", "false");
    return;
  }

  const fragmento = document.createDocumentFragment();

  etapas.forEach((etapa) => {
    const item = seletores.templateEtapa.content
      .firstElementChild
      .cloneNode(true);

    item.dataset.estado = etapa.estado;

    definirTexto(
      item.querySelector(".etapa-trilha__ordem"),
      `ETAPA ${String(etapa.ordem).padStart(2, "0")}`
    );
    definirTexto(item.querySelector(".etapa-trilha__nome"), etapa.nome);
    definirTexto(
      item.querySelector(".etapa-trilha__estado"),
      montarEstadoEtapa(etapa)
    );

    const observacao = item.querySelector(".etapa-trilha__observacao");

    if (etapa.observacao) {
      definirTexto(observacao, etapa.observacao);
    } else {
      observacao.remove();
    }

    fragmento.appendChild(item);
  });

  container.appendChild(fragmento);
  container.setAttribute("aria-busy", "false");
}

function montarEstadoEtapa(etapa) {
  const rotulos = {
    validado: "Validado",
    em_andamento: "Em andamento",
    definido: "Definido",
    nao_iniciado: "Não iniciado",
    descartado: "Testado e descartado",
    pendente_producao: "Obrigatório antes de Produção"
  };

  const estado = rotulos[etapa.estado] ?? etapa.estado ?? "Sem estado";
  return etapa.checkpoint ? `${estado} · ${etapa.checkpoint}` : estado;
}

function renderizarProximos(blocos) {
  const container = seletores.listaProximos;

  if (!container) {
    return;
  }

  container.replaceChildren();

  if (blocos.length === 0) {
    container.appendChild(
      criarMensagem("Nenhum próximo bloco foi registrado.", "li")
    );
    container.setAttribute("aria-busy", "false");
    return;
  }

  const ordenados = [...blocos].sort((a, b) => a.ordem - b.ordem);
  const fragmento = document.createDocumentFragment();

  ordenados.forEach((bloco) => {
    const item = seletores.templateProximo.content
      .firstElementChild
      .cloneNode(true);

    item.dataset.estado = bloco.estado;

    definirTexto(item.querySelector(".item-proximo__ordem"), bloco.ordem);
    definirTexto(item.querySelector(".item-proximo__modulo"), bloco.modulo);
    definirTexto(item.querySelector(".item-proximo__titulo"), bloco.titulo);
    definirTexto(item.querySelector(".item-proximo__detalhe"), bloco.detalhe);

    fragmento.appendChild(item);
  });

  container.appendChild(fragmento);
  container.setAttribute("aria-busy", "false");
}

function renderizarCamadas(camadas) {
  const container = seletores.listaCamadas;

  if (!container) {
    return;
  }

  container.replaceChildren();

  if (camadas.length === 0) {
    container.appendChild(
      criarMensagem("Nenhuma camada transversal foi registrada.")
    );
    container.setAttribute("aria-busy", "false");
    return;
  }

  const fragmento = document.createDocumentFragment();

  camadas.forEach((camada) => {
    const item = seletores.templateCamada.content
      .firstElementChild
      .cloneNode(true);

    const percentual = normalizarPercentual(camada.percentual);

    item.dataset.estado = camada.estado;

    definirTexto(item.querySelector(".item-camada__nome"), camada.nome);
    definirTexto(
      item.querySelector(".item-camada__percentual"),
      `${percentual}%`
    );

    const barra = item.querySelector(".barra-progresso span");

    if (barra) {
      barra.style.width = `${percentual}%`;
    }

    fragmento.appendChild(item);
  });

  container.appendChild(fragmento);
  container.setAttribute("aria-busy", "false");
}

function renderizarCheckpoints(checkpoints) {
  const container = seletores.timeline;

  if (!container) {
    return;
  }

  container.replaceChildren();
  definirTexto(seletores.totalCheckpoints, checkpoints.length);

  if (checkpoints.length === 0) {
    container.appendChild(
      criarMensagem("Nenhum checkpoint foi registrado.")
    );
    container.setAttribute("aria-busy", "false");
    return;
  }

  const fragmento = document.createDocumentFragment();

  checkpoints.forEach((checkpoint) => {
    const item = seletores.templateCheckpoint.content
      .firstElementChild
      .cloneNode(true);

    item.dataset.categoria = checkpoint.categoria;

    const botao = item.querySelector(".checkpoint__botao");
    const detalhes = item.querySelector(".checkpoint__detalhes");
    const data = item.querySelector(".checkpoint__data");
    const modulo = item.querySelector(".checkpoint__modulo");

    definirTexto(item.querySelector(".checkpoint__id"), checkpoint.id);
    definirTexto(data, formatarDataCurta(checkpoint.data));
    definirTexto(
      item.querySelector(".checkpoint__titulo"),
      checkpoint.titulo
    );
    definirTexto(
      item.querySelector(".checkpoint__estado"),
      checkpoint.estado
    );
    definirTexto(
      item.querySelector(".checkpoint__resumo"),
      checkpoint.resumo
    );

    if (data && checkpoint.data) {
      data.dateTime = checkpoint.data;
    }

    if (checkpoint.modulo) {
      definirTexto(modulo, `Módulo: ${checkpoint.modulo}`);
    } else {
      modulo.remove();
    }

    botao.addEventListener("click", () => {
      const expandido = botao.getAttribute("aria-expanded") === "true";
      botao.setAttribute("aria-expanded", String(!expandido));
      detalhes.hidden = expandido;
    });

    fragmento.appendChild(item);
  });

  container.appendChild(fragmento);
  container.setAttribute("aria-busy", "false");
}

function preencherRodape(dados) {
  definirTexto(seletores.avisoFonte, dados.projeto.avisoFonte);

  const checkpointRodape = document.querySelector(
    ".rodape__estado strong"
  );

  definirTexto(
    checkpointRodape,
    dados.situacaoAtual.ultimoCheckpoint?.id ?? "—"
  );
}

function exibirErroCarregamento(erro) {
  const mensagemPrincipal =
    window.location.protocol === "file:"
      ? "Os arquivos estão corretos, mas este dashboard precisa ser aberto por um servidor local ou pelo GitHub Pages para ler o progresso.json."
      : "Não foi possível carregar os dados do dashboard.";

  const detalhe = erro instanceof Error ? erro.message : String(erro);
  const texto = `${mensagemPrincipal} ${detalhe}`;

  [
    seletores.gradeModulos,
    seletores.trilhaModulo,
    seletores.listaProximos,
    seletores.listaCamadas,
    seletores.timeline
  ].forEach((container) => {
    if (!container) {
      return;
    }

    container.replaceChildren(criarMensagem(texto));
    container.setAttribute("aria-busy", "false");
  });

  const aviso = document.createElement("section");
  aviso.className = "aviso-estimativa";
  aviso.setAttribute("role", "alert");

  const icone = document.createElement("span");
  icone.className = "aviso-estimativa__icone";
  icone.textContent = "!";

  const conteudo = document.createElement("div");
  const titulo = document.createElement("h2");
  const paragrafo = document.createElement("p");

  titulo.textContent = "Dados ainda não carregados";
  paragrafo.textContent = texto;

  conteudo.append(titulo, paragrafo);
  aviso.append(icone, conteudo);

  const primeiroPainel = document.querySelector(".painel-principal");
  primeiroPainel?.insertAdjacentElement("afterend", aviso);
}

function criarMensagem(texto, tag = "p") {
  const elemento = document.createElement(tag);
  elemento.className = "mensagem-carregamento";
  elemento.textContent = texto;
  return elemento;
}

function definirTexto(elemento, valor) {
  if (!elemento || valor === undefined || valor === null) {
    return;
  }

  elemento.textContent = String(valor);
}

function normalizarPercentual(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(numero)));
}

function formatarData(valor) {
  const data = criarDataLocal(valor);

  if (!data) {
    return valor ?? "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(data);
}

function formatarDataCurta(valor) {
  const data = criarDataLocal(valor);

  if (!data) {
    return valor ?? "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  }).format(data);
}

function criarDataLocal(valor) {
  if (typeof valor !== "string") {
    return null;
  }

  const correspondencia = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!correspondencia) {
    return null;
  }

  const [, ano, mes, dia] = correspondencia;
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia));

  return Number.isNaN(data.getTime()) ? null : data;
}
