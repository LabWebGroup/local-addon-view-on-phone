# Envio para a biblioteca de add-ons do Local

Kit para enviar o **View on Phone** à lista de add-ons que aparece dentro do Local
(**Add-ons › Library**). As instruções estão em português; os textos para colar estão em
inglês, que é o idioma da biblioteca.

## Como a biblioteca funciona

- A lista não lê nada do add-on. O Local busca tudo num servidor da WP Engine
  (`api.localbyflywheel.com/graphql`): capa, textos, versão, licença, link do repositório e o
  arquivo `.tgz`. O `.tgz` fica hospedado no CDN deles (`cdn.localwp.com/addons/…`).
- Quem cadastra esses dados é a equipe do Local, **depois de avaliar e aceitar** o add-on. Não
  existe cadastro próprio.
- O envio é pelo formulário <https://localwp.com/submit-addon/> (nome, e-mail e uma descrição
  com links).
- Os campos "Offline support" e "Local account" vêm de uma lista fixa no código do próprio
  Local. Sem pedir para incluírem o add-on nela, a página mostra "Offline support: Unknown".

## Checklist antes de enviar

- [x] Repositório público (desde 2026-10-15)
- [x] Interface em inglês (com português conforme o idioma do sistema)
- [x] README em inglês, com prints
- [x] Licença MIT
- [x] `.tgz` instalável por **Install from disk**, testado no Local 10.1.2 (macOS)
- [x] Ícone, cor e avatar (pasta `docs/listing/`)
- [x] Changelog
- [ ] Testar no Windows (a maior parte dos usuários do Local usa Windows)
- [ ] Testar no Linux (opcional)

## 1. Texto para o formulário

Campos: **First name**, **Last name**, **Email** e a mensagem abaixo.

```text
Hi Local team!

I built an add-on called "View on Phone" and would love to have it in the Add-ons Library.

It adds a "Phone (Wi-Fi)" row to every site's Overview tab. One switch opens the site on any
phone on the same Wi-Fi network, with a fixed address per site (site port 10058 → :8058) and a
QR code. It's a small HTTP bridge inside Local that rewrites the .local domain in responses,
redirects and cookies, so links, assets and the wp-admin login all work. No tunnel, no account,
works fully offline, and nothing changes in WordPress. The bridge closes when the site stops
and comes back when it starts.

- Repository: https://github.com/LabWebGroup/local-addon-view-on-phone
- Release (.tgz, installs with "Install from disk"): https://github.com/LabWebGroup/local-addon-view-on-phone/releases/tag/v1.0.0
- License: MIT. No runtime dependencies (QR code library vendored, MIT).
- Tested on Local 10.1.2 (macOS). Requires Local >= 10.0.0.
- Interface in English and Portuguese.

Listing assets (icon, cover color, developer avatar, overview text) are ready in the repo under
docs/listing and docs/SUBMISSION.md. It works fully offline and doesn't need a Local account,
in case you'd like to add it to the OFFLINE_SUPPORT list.

Thanks!
Labweb — https://labweb.digital
```

## 2. Dados da página do add-on

Os mesmos campos que a API da biblioteca usa (`addon(slug)`):

| Campo | Valor |
|---|---|
| `name` | View on Phone |
| `slug` | `view-on-phone` |
| `npmPackageName` | `local-addon-view-on-phone` |
| `type` | Extension |
| `color` | `7D38FF` |
| `avatar` (ícone do card) | [`docs/listing/icon.svg`](listing/icon.svg) (SVG branco, como os outros da lista) |
| `excerpt` | Open any Local site on your phone over Wi-Fi with a fixed address and a QR code. |
| `developer.name` | Labweb |
| `developer.avatar` | [`docs/listing/developer-avatar.png`](listing/developer-avatar.png) (400×400) |
| `details.license` | MIT |
| `details.repository` | https://github.com/LabWebGroup/local-addon-view-on-phone |
| `details.homepage` | https://labweb.digital |
| `details.support` | https://github.com/LabWebGroup/local-addon-view-on-phone/issues |
| `categories` | (vazio, como os outros) |
| Offline support | Full |
| Local account | Not required |

### Release 1.0.0

| Campo | Valor |
|---|---|
| `version` | 1.0.0 |
| `testedUpTo` | 10.1.2 |
| `localRequirement` | `>=10.0.0` |
| `downloadUrl` | Arquivo `local-addon-view-on-phone-1.0.0.tgz` do release v1.0.0 no GitHub (eles copiam para o CDN) |
| `changelog` | `Initial release.` + link para o release no GitHub |

### Overview (Markdown)

```markdown
![The "Phone (Wi-Fi)" row turned on, with the address and QR code](https://raw.githubusercontent.com/LabWebGroup/local-addon-view-on-phone/main/docs/img/on.png)

Open any Local site on your phone over Wi-Fi — with a fixed address and a QR code. No tunnel, no account, and no changes to WordPress.

- One switch per site, right on the Overview tab
- Fixed address per site (site port 10058 → :8058) with Copy, Open and QR code buttons
- Links, assets, redirects and the wp-admin login all work from the phone
- Closes when the site stops and comes back when it starts
- Works fully offline
- English and Portuguese interface

## Getting Started

1. Navigate to "View on Phone" within the "Add-ons" tab of Local.
2. Click the "Install Add-on" button.
3. Click the "Enable & Relaunch" button.
4. Start a site and turn on "Phone (Wi-Fi)" on its Overview tab.
5. Scan the QR code with your phone (same Wi-Fi network).

To learn more, see the [README](https://github.com/LabWebGroup/local-addon-view-on-phone#readme).
```

## 3. Arquivos de apoio

| Arquivo | Uso |
|---|---|
| [`listing/icon.svg`](listing/icon.svg) | Ícone do card (branco, fundo transparente) |
| [`listing/icon.png`](listing/icon.png) | O mesmo ícone em PNG |
| [`listing/cover-512.png`](listing/cover-512.png) | Ícone sobre a cor do card (512×512) |
| [`listing/card-preview.png`](listing/card-preview.png) | Prévia do card ao lado do Notes |
| [`listing/developer-avatar.png`](listing/developer-avatar.png) | Avatar da Labweb (400×400) |
| [`img/on.png`](img/on.png), [`img/stopped.png`](img/stopped.png) | Prints em inglês |
| [`img/installed.png`](img/installed.png) | Card na aba Installed depois de instalar pelo `.tgz` |

## Depois de aceito

- Para cada versão nova: atualizar `version` no `package.json` e o `CHANGELOG.md`, rodar
  `npm run pack`, criar o release no GitHub com o `.tgz` e avisar a equipe do Local (eles
  publicam a nova versão no servidor deles).
- Se uma versão nova do Local mudar a API de add-ons, atualizar `testedUpTo` e `engines`.
