// Teste da ponte sem o Local: um servidor falso faz o papel do nginx do site.
// Uso: npm test
const assert = require('assert');
const http = require('http');
const { Ponte, criarReescrita, ajustarCookie } = require('../lib/ponte');
const { t, idioma, textos } = require('../lib/i18n');

const DOM = 'exemplo.local';

// 1. Reescrita nas três formas
const r = criarReescrita(DOM, '192.168.0.9:8058');
assert.strictEqual(r(`<a href="https://${DOM}/x">`), '<a href="http://192.168.0.9:8058/x">');
assert.strictEqual(r(`{"u":"http:\\/\\/${DOM}\\/wp-json"}`), '{"u":"http:\\/\\/192.168.0.9:8058\\/wp-json"}');
assert.strictEqual(r(`?r=http%3A%2F%2F${DOM}%2F`), '?r=http%3A%2F%2F192.168.0.9%3A8058%2F');
assert.strictEqual(r(`src="//${DOM}/a.js"`), 'src="//192.168.0.9:8058/a.js"');

// 2. Cookies
assert.strictEqual(
	ajustarCookie(`wp=1; path=/; domain=${DOM}; Secure; HttpOnly; SameSite=None`),
	'wp=1; path=/; HttpOnly; SameSite=Lax',
);

// 3. Idiomas
assert.strictEqual(idioma('pt-BR'), 'pt');
assert.strictEqual(idioma('pt-BR,pt;q=0.9,en;q=0.8'), 'pt');
assert.strictEqual(idioma('en-US'), 'en');
assert.strictEqual(idioma(undefined), 'en');
assert.strictEqual(t('es-ES').rotulo, 'Phone (Wi-Fi)');
assert.deepStrictEqual(Object.keys(textos.pt).sort(), Object.keys(textos.en).sort(), 'faltam textos num idioma');

// 4. Ponta a ponta
const site = http.createServer((req, res) => {
	if (req.url === '/redir') {
		res.writeHead(302, { location: `https://${DOM}/destino`, 'set-cookie': [`a=1; domain=.${DOM}; secure`] });
		return res.end();
	}
	if (req.url === '/img') {
		res.writeHead(200, { 'content-type': 'image/png' });
		return res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47, ...Buffer.from(DOM)]));
	}
	res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
	res.end(`host=${req.headers.host} origin=${(req.headers.origin || '-').replace('://', '|')} <a href="https://${DOM}/página">ç</a>`);
});

site.listen(0, '127.0.0.1', async () => {
	const ponte = await new Ponte({ dominio: DOM, portaSite: site.address().port, porta: 0 }).ligar();
	const porta = ponte.servidor.address().port;
	const pedir = (caminho, headers = {}) =>
		new Promise((ok, falha) => {
			http
				.get({ host: '127.0.0.1', port: porta, path: caminho, headers: { host: `10.0.0.5:${porta}`, ...headers } }, (res) => {
					const b = [];
					res.on('data', (c) => b.push(c));
					res.on('end', () => ok({ res, corpo: Buffer.concat(b) }));
				})
				.on('error', falha);
		});
	try {
		const a = await pedir('/', { origin: `http://10.0.0.5:${porta}` });
		const html = a.corpo.toString();
		assert.ok(html.includes(`host=${DOM}`), html);
		assert.ok(html.includes(`origin=http|${DOM}`), html);
		assert.ok(html.includes(`href="http://10.0.0.5:${porta}/página">ç`), html);
		assert.strictEqual(Number(a.res.headers['content-length']), a.corpo.length);

		const b = await pedir('/redir');
		assert.strictEqual(b.res.headers.location, `http://10.0.0.5:${porta}/destino`);
		assert.strictEqual(b.res.headers['set-cookie'][0], 'a=1');

		const c = await pedir('/img');
		assert.ok(c.corpo.toString('latin1').endsWith(DOM), 'binário não pode ser reescrito');

		// Site fora do ar: mensagem no idioma do celular
		const morto = await new Ponte({ dominio: DOM, portaSite: 1, porta: 0 }).ligar();
		const pm = morto.servidor.address().port;
		const erro = await new Promise((ok) =>
			http.get({ host: '127.0.0.1', port: pm, path: '/', headers: { 'accept-language': 'pt-BR' } }, (res) => {
				const b = [];
				res.on('data', (c) => b.push(c));
				res.on('end', () => ok({ status: res.statusCode, corpo: Buffer.concat(b).toString() }));
			}),
		);
		await morto.desligar();
		assert.strictEqual(erro.status, 502);
		assert.ok(erro.corpo.startsWith(`O site ${DOM} não respondeu`), erro.corpo);

		console.log('ok: ponte passou em todos os testes');
	} finally {
		await ponte.desligar();
		site.close();
	}
});
