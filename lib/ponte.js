// Ponte HTTP: o celular acessa http://<IP-do-Mac>:<porta> e a ponte repassa ao nginx
// do site no Local, trocando nas respostas o domínio .local pelo endereço que o
// celular usou. Não altera nada no WordPress: desligou a ponte, tudo volta a ser como era.

const http = require('http');
const os = require('os');
const { t } = require('./i18n');

const ehTexto = (tipo = '') => /text\/|javascript|json|xml|svg|x-www-form-urlencoded/.test(tipo);

// IPv4 da rede local. Prefere o Wi-Fi/cabo (en*) e ignora VPN, Docker e máquinas virtuais.
function ipDaRede() {
	const ifaces = os.networkInterfaces();
	const candidatos = [];
	for (const [nome, lista] of Object.entries(ifaces)) {
		for (const i of lista || []) {
			if (i.family !== 'IPv4' && i.family !== 4) continue;
			if (i.internal || i.address.startsWith('169.254.')) continue;
			const privado = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(i.address);
			const ignorar = /^(utun|bridge|vmnet|vboxnet|docker|veth|llw|awdl|anpi)/.test(nome);
			candidatos.push({ nome, endereco: i.address, nota: (/^en\d/.test(nome) ? 2 : 0) + (privado ? 1 : 0) - (ignorar ? 5 : 0) });
		}
	}
	candidatos.sort((a, b) => b.nota - a.nota);
	return candidatos[0] ? candidatos[0].endereco : null;
}

// Troca o domínio .local pelo endereço público nas formas em que ele aparece:
// normal, JSON com barras escapadas e URL-encoded.
function criarReescrita(dominio, publico) {
	const trocas = [
		[`https://${dominio}`, `http://${publico}`],
		[`http://${dominio}`, `http://${publico}`],
		[`https:\\/\\/${dominio}`, `http:\\/\\/${publico}`],
		[`http:\\/\\/${dominio}`, `http:\\/\\/${publico}`],
		[`https%3A%2F%2F${dominio}`, `http%3A%2F%2F${encodeURIComponent(publico)}`],
		[`http%3A%2F%2F${dominio}`, `http%3A%2F%2F${encodeURIComponent(publico)}`],
		[`//${dominio}`, `//${publico}`],
	];
	return (txt) => trocas.reduce((t, [de, para]) => t.split(de).join(para), txt);
}

// Cookies: sem domain (vale para o IP), sem Secure (o celular usa http) e SameSite=None vira Lax
// (o navegador recusa None sem Secure).
const ajustarCookie = (c) =>
	c.replace(/;\s*domain=[^;]*/gi, '').replace(/;\s*secure(?=;|$)/gi, '').replace(/;\s*samesite=none/gi, '; SameSite=Lax');

class Ponte {
	/**
	 * @param {{ dominio: string, portaSite: number, porta: number }} opcoes
	 */
	constructor({ dominio, portaSite, porta }) {
		this.dominio = dominio;
		this.portaSite = portaSite;
		this.porta = porta;
		this.servidor = null;
	}

	ligar() {
		return new Promise((resolve, reject) => {
			const servidor = http.createServer((req, res) => this._repassar(req, res));
			servidor.once('error', reject);
			servidor.listen(this.porta, '0.0.0.0', () => {
				servidor.removeListener('error', reject);
				this.servidor = servidor;
				resolve(this);
			});
		});
	}

	desligar() {
		return new Promise((resolve) => {
			if (!this.servidor) return resolve();
			const s = this.servidor;
			this.servidor = null;
			s.close(() => resolve());
			if (s.closeAllConnections) s.closeAllConnections();
		});
	}

	_repassar(req, res) {
		const { dominio } = this;
		// Endereço que o celular digitou (IP:porta). Se o IP do Mac mudar, continua certo.
		const publico = req.headers.host || `${ipDaRede()}:${this.porta}`;
		const reescrever = criarReescrita(dominio, publico);
		const voltar = (v) => v.split(`http://${publico}`).join(`http://${dominio}`).split(publico).join(dominio);

		const headers = { ...req.headers, host: dominio, 'accept-encoding': 'identity' };
		if (headers.origin) headers.origin = voltar(headers.origin);
		if (headers.referer) headers.referer = voltar(headers.referer);

		const proxy = http.request(
			{ host: '127.0.0.1', port: this.portaSite, method: req.method, path: req.url, headers },
			(r) => {
				const h = { ...r.headers };
				if (h.location) h.location = reescrever(h.location);
				if (h.link) h.link = reescrever(h.link);
				if (h['set-cookie']) h['set-cookie'] = h['set-cookie'].map(ajustarCookie);
				delete h['strict-transport-security'];

				if (!ehTexto(h['content-type']) || req.method === 'HEAD') {
					res.writeHead(r.statusCode, h);
					return r.pipe(res);
				}
				const partes = [];
				r.on('data', (c) => partes.push(c));
				r.on('end', () => {
					const corpo = Buffer.from(reescrever(Buffer.concat(partes).toString('utf8')), 'utf8');
					delete h['transfer-encoding'];
					h['content-length'] = corpo.length;
					res.writeHead(r.statusCode, h);
					res.end(corpo);
				});
			},
		);
		proxy.on('error', (e) => {
			if (res.headersSent) return res.destroy();
			res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
			// No idioma do celular que fez o pedido
			res.end(t(req.headers['accept-language']).siteNaoRespondeu(dominio, e.message));
		});
		req.pipe(proxy);
	}
}

module.exports = { Ponte, ipDaRede, criarReescrita, ajustarCookie };
