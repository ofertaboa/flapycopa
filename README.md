# FlapyCopa — site 100% estático (espelho do flapycopa.tanoclique.com)

Cópia estática completa do site `https://flapycopa.tanoclique.com` (Laravel/PHP na Hostinger),
com **HTML, JavaScript, CSS, imagens e fontes baixados localmente**. Funciona sem servidor de
aplicação: basta servir arquivos estáticos.

> **Base path.** O projeto está configurado para o **GitHub Pages de projeto** em
> **`/flapycopa`** (`https://ofertaboa.github.io/flapycopa/`). Todos os caminhos absolutos
> levam esse prefixo. O valor fica em **`tools/base.js`**.

## Rotas

O site original só tem 2 rotas (todas as outras respondem 404 no origem):

| Rota | Arquivo |
|---|---|
| `/` | `index.html` |
| `/jogar` | `jogar/index.html` |
| qualquer outra | `404.html` |

`robots.txt` existe no origem e foi copiado. `sitemap.xml` e `favicon.ico` davam 404 no origem.

## O que foi corrigido em relação ao origem

Estas referências estão **quebradas no site original** (respondem 404 lá também) e foram
tratadas aqui para o espelho não ter pedidos de erro:

| Problema no origem | O que o espelho faz |
|---|---|
| `<link rel="icon" href=".../uploads/teams/favicon_1783089187.png">` → 404 | usa `vendor/flagcdn/w40/br.png` |
| `<img>` do banner de promoção (`uploads/teams/banner_promo_...`) → 404 | o `<img>` foi removido |
| CSS `url('/public/img/coin.png')` → 404 | linha removida (a moeda usa `background` gradiente) |
| `http://passarinho.test/uploads/teams/team_argentina_...png` (URL de dev) | aponta para o arquivo baixado do origem |

Também foram **baixados para dentro do projeto** (antes eram externos):

- `vendor/flagcdn/w40/*.png` — as 6 bandeiras
- `vendor/fonts/poppins.css` + 15 `.woff2` — Google Fonts Poppins
- `vendor/disable-devtool.js` — script do jsDelivr
- `_next/static/media/*.woff2` (18) + `img/flapbird/birds/background.png` — referenciados pelo CSS
- `img/flapbird/birds/bird-argentina.png` e `uploads/teams/team_argentina_...png` — existiam no
  origem mas não eram referenciados por caminho local

## Limitação — a API (PHP)

O backend é **PHP/Laravel**. Diferente do site anterior, o origem **envia
`Access-Control-Allow-Origin: *`** (o preflight `OPTIONS` responde `204`), então as chamadas
`fetch('https://flapycopa.tanoclique.com/api/...')` **passam pelo navegador**.

| Funciona | Não funciona |
|---|---|
| Landing, jogo, todas as telas/modais | Sessão (o cookie `laravel-session` não cruza domínio) |
| Todas as imagens/JS/CSS/fontes (locais) | Login/cadastro mantendo sessão entre domínios |
| As chamadas de rede chegam à API | CSRF token (rotativo por sessão, não segue o espelho) |

Para o backend funcionar de verdade é preciso hospedar num servidor com PHP.

## Deploy — GitHub Pages (padrão)

1. No repositório: **Settings → Pages → Source: Deploy from a branch**, branch `master`,
   pasta `/ (root)`.
2. O arquivo **`.nojekyll`** está incluído.
3. O site fica em `https://ofertaboa.github.io/flapycopa/`.

## Deploy — Netlify / Cloudflare Pages

1. Rode **`node tools\rebase.js --base=`** (tira o prefixo e deixa tudo na raiz).
2. Conecte o repositório ou arraste a pasta em `app.netlify.com`.
   - Netlify: `netlify.toml` já define `publish = "."`.
   - Cloudflare Pages: `wrangler.toml` já define `pages_build_output_dir = "."`.
3. Para voltar ao base do GitHub Pages: `node tools\rebase.js`.

As duas plataformas servem o `404.html` para rotas inexistentes.

## Rodando localmente

```
INICIAR-LOCAL.bat
```

Abre em `http://localhost:8090/flapycopa/` — a mesma estrutura de caminho do GitHub Pages.
Porta: `set PORT=3000` antes de rodar.

## Base path — caminho de publicação

| Onde vai publicar | Base | Comando |
|---|---|---|
| GitHub Pages de projeto (`usuario.github.io/flapycopa/`) | `/flapycopa` | já configurado |
| Netlify, Cloudflare Pages, VPS, domínio próprio | `""` (raiz) | `node tools\rebase.js --base=` |
| Outro nome de repositório | `/outro-nome` | `node tools\rebase.js --base=/outro-nome` |

`tools/rebase.js` é **idempotente** (pode rodar quantas vezes quiser) e faz **ida e volta**
(raiz ⇄ base) sem perda, tanto nos HTML/JS quanto nos arquivos de apoio (`.bat`, `.toml`,
`_redirects`). Ele aplica: prefixo do base nos `href/src/action/poster`, `url()` de CSS,
`location.*` e nos **string literals de caminho do JS** (`bird:'/img/x.png'`), troca a API pela
origem e corrige as quebras listadas acima.

## Ferramentas (`tools/`)

| Arquivo | O que faz |
|---|---|
| `base.js` | base path (fonte da verdade) |
| `rebase.js` | aplica/troca o base path + correções (idempotente) |
| `mirror.js` | rastreia o site de origem e baixa HTML/assets |
| `refetch.js` | rebaixa só o HTML bruto do origem (refazer o rebase do zero) |
| `vendor.js` | baixa os externos (flags, fontes, script) para dentro |
| `follow.js` | segue refs dentro de CSS/JS e baixa o que faltar |
| `server.js` | servidor local com o mesmo base path do Pages |
| `check.js` | 2 rotas respondem 200 + todas as refs resolvem + flag de ref sem base |
| `headless.js` | renderiza no Chrome e classifica erros de console |
| `netlog.js` | captura requisições com 4xx/5xx |
| `verify.js` | procura caminhos absolutos sem o base e externos não vendados |
| `scan.js` | scan compartilhado de refs (comentários removidos) |
| `selftest.js` | prova que o check detecta ref sem base |
| `rawpaths.js` / `patterns.js` / `inv.js` / `spot.js` | inventário e diagnóstico |

### Validação atual

| Teste | Resultado |
|---|---|
| `check.js` | **FALHAS: 0** (2 rotas 200, 34/34 refs internas, 25/25 absolutas, 0 sem base) |
| `verify.js` | **defeitos: 0** |
| `headless.js` | **falhas: 0** (`/` e `/jogar`) |
| `rawpaths.js` | **0** literais de caminho sem base |
| `selftest.js` | **OK** (detecta ref sem base) |
| `follow.js` | **faltando: 0** |
| fontes | 15/15 respondem 200 com `font/woff2` |

`netlog.js` reporta `net:-400` em 3–4 `.woff2` — é artefato de cache/headless (os mesmos
arquivos respondem 200 via HTTP e o Chrome não loga nenhum erro deles no `headless.js`);
o conjunto muda entre execuções.

## Nota sobre áudio/vídeo

Não há `.mp3`, `.mp4` nem playlist `.m3u8` no site original (o som é gerado com **Web Audio
API**). O que existe de mídia são **6 GIFs de animação** em `img/flapbird/gif/`
(8–16 MB cada, ~84 MB no total) — todos baixados. Nenhum arquivo passa de 50 MB (limite do
GitHub por arquivo).

Tamanho do projeto: **~88 MB** em 67 arquivos.
