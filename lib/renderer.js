// Lado da tela (renderer): linha "Phone (Wi-Fi)" / "Celular (Wi-Fi)" na aba Overview de cada site,
// com o interruptor, o endereço, copiar, abrir e o QR code.

const path = require('path');
const qrcode = require('./vendor/qrcode-generator');
const { t } = require('./i18n');

const CANAL = 'ver-no-celular';

// Componentes visuais do próprio Local (os mesmos da linha do Xdebug).
// O add-on fica fora do app, então o caminho é montado a partir do app.asar.
function componentesDoLocal(appPath) {
	try {
		return require('@getflywheel/local-components');
	} catch (e) {
		try {
			return require(path.join(appPath, 'node_modules', '@getflywheel', 'local-components'));
		} catch (e2) {
			return null;
		}
	}
}

function svgDoQr(texto) {
	const qr = qrcode(0, 'M');
	qr.addData(texto);
	qr.make();
	return qr.createSvgTag({ cellSize: 4, margin: 3, scalable: true });
}

module.exports = function (context) {
	const { React, hooks, electron } = context;
	const { useState, useEffect, useCallback } = React;
	const { ipcRenderer, shell, clipboard } = electron;
	const h = React.createElement;
	const C = componentesDoLocal(context.environment.appPath) || {};
	const tx = t(typeof navigator !== 'undefined' && navigator.language);

	const Linha = C.TableListRow || ((p) => h('div', { style: { display: 'flex', gap: 16, padding: '8px 0' } }, h('strong', null, p.label), p.children));
	const Botao = C.TextButton || ((p) => h('button', { onClick: p.onClick, disabled: p.disabled, style: p.style }, p.children));

	// O main devolve códigos de erro; a tradução fica aqui.
	const mensagemDeErro = (erro) => (erro && tx[erro]) || erro;

	function CelularWifi({ site, siteStatus }) {
		const [st, setSt] = useState(null);
		const [ocupado, setOcupado] = useState(false);
		const [verQr, setVerQr] = useState(true);
		const [copiado, setCopiado] = useState(false);
		const rodando = siteStatus === 'running';

		const atualizar = useCallback(() => {
			ipcRenderer.invoke(`${CANAL}:estado`, site.id).then(setSt).catch(() => {});
		}, [site.id]);

		useEffect(() => {
			atualizar();
			const aoMudar = (_e, id) => {
				if (id === site.id) atualizar();
			};
			ipcRenderer.on(`${CANAL}:mudou`, aoMudar);
			return () => ipcRenderer.removeListener(`${CANAL}:mudou`, aoMudar);
		}, [site.id, siteStatus, atualizar]);

		const alternar = async (_e, ligar) => {
			setOcupado(true);
			try {
				const dadosSite = { id: site.id, domain: site.domain, services: site.services };
				setSt(await ipcRenderer.invoke(ligar ? `${CANAL}:ligar` : `${CANAL}:desligar`, ligar ? dadosSite : site.id));
			} finally {
				setOcupado(false);
			}
		};

		const copiar = () => {
			if (clipboard) clipboard.writeText(st.url);
			else navigator.clipboard.writeText(st.url);
			setCopiado(true);
			setTimeout(() => setCopiado(false), 1500);
		};

		const ligada = !!(st && st.ligada);
		const cinza = { color: '#8a8a8a', fontSize: 12 };
		const linkBtn = { paddingLeft: 12 };

		let conteudo;
		if (!rodando) {
			conteudo = h('span', { style: cinza }, st && st.preferida ? tx.ligaSozinho : tx.inicieOSite);
		} else if (ligada && st.url) {
			conteudo = h(
				'span',
				{ style: { display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap' } },
				h('span', { className: '__Selectable', style: { fontWeight: 600 } }, st.url),
				h(Botao, { inline: true, style: linkBtn, onClick: copiar }, copiado ? tx.copiado : tx.copiar),
				h(Botao, { inline: true, style: linkBtn, onClick: () => setVerQr(!verQr) }, verQr ? tx.ocultarQr : tx.verQr),
				h(Botao, { inline: true, style: linkBtn, onClick: () => shell.openExternal(st.url) }, tx.abrir),
			);
		} else if (ligada && !st.url) {
			conteudo = h('span', { style: cinza }, tx.semRede);
		} else {
			conteudo = h('span', { style: cinza }, tx.desligado);
		}

		const interruptor = C.Switch
			? h(C.Switch, { flat: true, tiny: true, name: 'verNoCelular', checked: ligada, disabled: !rodando || ocupado, onChange: alternar })
			: h('input', { type: 'checkbox', checked: ligada, disabled: !rodando || ocupado, onChange: (e) => alternar(e, e.target.checked) });

		return h(
			Linha,
			{ label: tx.rotulo, alignMiddle: true },
			h(
				'div',
				null,
				h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } }, interruptor, conteudo),
				st && st.erro && h('div', { style: { color: '#e5534b', fontSize: 12, marginTop: 6 } }, mensagemDeErro(st.erro)),
				rodando && ligada && st.url && verQr &&
					h(
						'div',
						{ style: { display: 'flex', alignItems: 'center', gap: 14, marginTop: 10 } },
						h('div', {
							style: { width: 132, height: 132, background: '#fff', borderRadius: 6, padding: 2, lineHeight: 0 },
							dangerouslySetInnerHTML: { __html: svgDoQr(st.url) },
						}),
						h('div', { style: { ...cinza, maxWidth: 220, lineHeight: 1.5 } }, tx.dicaQr),
					),
			),
		);
	}

	hooks.addContent('SiteInfoOverview_TableList', (site, siteStatus) =>
		h(CelularWifi, { key: 'ver-no-celular', site, siteStatus }),
	);
};
