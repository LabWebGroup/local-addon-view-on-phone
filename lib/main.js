// Lado "main" do add-on (processo Node do Local): liga e desliga as pontes de cada site
// e guarda quais sites ficam ligados, para religar sozinho quando o site iniciar.

const path = require('path');
const fs = require('fs');
const { Ponte, ipDaRede } = require('./ponte');

const CANAL = 'ver-no-celular';

// Porta do nginx/apache do site (sites.json › services › role "http").
function portaDoSite(site) {
	const servicos = Object.values((site && site.services) || {});
	const http = servicos.find((s) => s.role === 'http') || servicos.find((s) => s.ports && s.ports.HTTP);
	const p = http && http.ports && http.ports.HTTP && http.ports.HTTP[0];
	return p ? Number(p) : null;
}

// Porta fixa por site: site na 10058 → celular na 8058. Fácil de lembrar e não muda entre usos.
function portaSugerida(portaSite) {
	return portaSite >= 10000 && portaSite <= 10999 ? 8000 + (portaSite - 10000) : 8800;
}

module.exports = function (context) {
	// O Local também carrega add-ons em processos auxiliares (workers), onde não há ipcMain.
	const { ipcMain, app } = context.electron || {};
	if (!ipcMain || process.type !== 'browser') return;

	const arquivo = path.join(context.environment.userDataPath, 'ver-no-celular.json');
	const ler = () => {
		try {
			return JSON.parse(fs.readFileSync(arquivo, 'utf8'));
		} catch (e) {
			return { sites: {} };
		}
	};
	const salvar = (dados) => {
		try {
			fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2));
		} catch (e) {
			console.error('[ver-no-celular] não consegui salvar', e);
		}
	};

	const pontes = new Map(); // site.id → Ponte
	const erros = new Map(); // site.id → código de erro (traduzido na tela) ou mensagem do sistema

	const estado = (siteId) => {
		const ponte = pontes.get(siteId);
		const pref = ler().sites[siteId];
		const ip = ipDaRede();
		return {
			ligada: !!ponte,
			preferida: !!(pref && pref.ligada),
			ip,
			porta: ponte ? ponte.porta : pref && pref.porta,
			url: ponte && ip ? `http://${ip}:${ponte.porta}` : null,
			erro: erros.get(siteId) || null,
		};
	};

	async function ligar(site) {
		const siteId = site.id;
		if (pontes.has(siteId)) return estado(siteId);
		erros.delete(siteId);

		const portaSite = portaDoSite(site);
		if (!portaSite) {
			erros.set(siteId, 'erroPortaSite');
			return estado(siteId);
		}
		const dados = ler();
		const anterior = dados.sites[siteId] && dados.sites[siteId].porta;
		const base = portaSugerida(portaSite);
		const tentativas = [anterior, base, base + 1000, base + 100, 0].filter((p, i, a) => p != null && a.indexOf(p) === i);

		for (const porta of tentativas) {
			try {
				const ponte = await new Ponte({ dominio: site.domain, portaSite, porta }).ligar();
				ponte.porta = ponte.servidor.address().port;
				pontes.set(siteId, ponte);
				dados.sites[siteId] = { ligada: true, porta: ponte.porta, dominio: site.domain };
				salvar(dados);
				return estado(siteId);
			} catch (e) {
				if (e.code !== 'EADDRINUSE') {
					erros.set(siteId, e.message);
					return estado(siteId);
				}
			}
		}
		erros.set(siteId, 'erroPortaLivre');
		return estado(siteId);
	}

	async function desligar(siteId, { esquecer }) {
		const ponte = pontes.get(siteId);
		pontes.delete(siteId);
		erros.delete(siteId);
		if (ponte) await ponte.desligar();
		if (esquecer) {
			const dados = ler();
			if (dados.sites[siteId]) dados.sites[siteId].ligada = false;
			salvar(dados);
		}
		return estado(siteId);
	}

	const canais = {
		[`${CANAL}:estado`]: (_e, siteId) => estado(siteId),
		[`${CANAL}:ligar`]: (_e, site) => ligar(site),
		[`${CANAL}:desligar`]: (_e, siteId) => desligar(siteId, { esquecer: true }),
	};
	for (const [nome, fn] of Object.entries(canais)) {
		ipcMain.removeHandler(nome);
		ipcMain.handle(nome, fn);
	}

	const avisarTela = (siteId) => {
		// O Local entrega o módulo inteiro em context.events.send (a função fica em .default).
		const enviar = context.events && (context.events.send.default || context.events.send);
		try {
			enviar(`${CANAL}:mudou`, siteId);
		} catch (e) {
			/* janela fechada */
		}
	};

	// Site iniciou: se a ponte dele estava ligada, religa sozinha.
	context.hooks.addAction('siteStarted', async (site) => {
		const pref = ler().sites[site.id];
		if (pref && pref.ligada) {
			await ligar(site);
			avisarTela(site.id);
		}
	});
	// Site parou: fecha a ponte, mas lembra que estava ligada.
	context.hooks.addAction('siteStopped', async (site) => {
		await desligar(site.id, { esquecer: false });
		avisarTela(site.id);
	});
	context.hooks.addAction('siteDeleted', async (siteId) => {
		const id = typeof siteId === 'object' ? siteId.id : siteId;
		await desligar(id, { esquecer: false });
		const dados = ler();
		delete dados.sites[id];
		salvar(dados);
	});

	if (app) {
		app.on('before-quit', () => {
			for (const p of pontes.values()) p.desligar();
			pontes.clear();
		});
	}
};
