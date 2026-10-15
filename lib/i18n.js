// Textos da interface. Inglês por padrão; português quando o sistema estiver em português.

const textos = {
	en: {
		rotulo: 'Phone (Wi-Fi)',
		copiar: 'Copy',
		copiado: 'Copied!',
		abrir: 'Open',
		verQr: 'QR code',
		ocultarQr: 'Hide QR',
		desligado: 'Off',
		inicieOSite: 'Start the site to use it',
		ligaSozinho: 'Turns on when the site starts',
		semRede: 'This computer is not on a Wi-Fi/LAN network right now',
		dicaQr: 'Point your phone camera here. It must be on the same Wi-Fi as this computer.',
		erroPortaSite: "Couldn't find this site's web server port.",
		erroPortaLivre: 'No free port available for the bridge.',
		siteNaoRespondeu: (dominio, msg) => `The site ${dominio} did not respond (${msg}). Is it started in Local?`,
	},
	pt: {
		rotulo: 'Celular (Wi-Fi)',
		copiar: 'Copiar',
		copiado: 'Copiado!',
		abrir: 'Abrir',
		verQr: 'QR code',
		ocultarQr: 'Ocultar QR',
		desligado: 'Desligado',
		inicieOSite: 'Inicie o site para usar',
		ligaSozinho: 'Liga sozinho quando o site iniciar',
		semRede: 'Computador sem rede Wi-Fi/cabo no momento',
		dicaQr: 'Aponte a câmera do celular. Ele precisa estar no mesmo Wi-Fi deste computador.',
		erroPortaSite: 'Não achei a porta do servidor web deste site.',
		erroPortaLivre: 'Nenhuma porta livre para a ponte.',
		siteNaoRespondeu: (dominio, msg) => `O site ${dominio} não respondeu (${msg}). Ele está iniciado no Local?`,
	},
};

// Aceita "pt-BR", "pt_PT", "pt" ou um cabeçalho Accept-Language inteiro ("pt-BR,pt;q=0.9,en;q=0.8").
function idioma(preferencia) {
	const primeiro = String(preferencia || '').split(',')[0].trim().toLowerCase();
	return primeiro.startsWith('pt') ? 'pt' : 'en';
}

const t = (preferencia) => textos[idioma(preferencia)];

module.exports = { t, idioma, textos };
