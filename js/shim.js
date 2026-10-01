/* FlapyCopa — espelho estático.
   Injetado no fim de index.html e jogar/index.html por tools/rebase.js.

   1) Áudio: o site cria o AudioContext preguiçoso e NUNCA chama resume().
      Em modo demonstração o jogo inicia sozinho no load e o primeiro "som"
      sai de um requestAnimationFrame (sem gesto do usuário) -> o contexto
      nasce "suspended" e fica em cache -> som mudo para sempre.
      Aqui todo contexto criado é registrado e destravado no 1º gesto.

   2) Conta: o HTML estático traz "isLoggedIn = false" gravado, e a sessão
      Laravel usa samesite=lax, então o cookie nunca cruza domínio.
      O login/cadastro continua batendo na API real (erros vêm do servidor),
      mas a sessão passa a ser guardada em localStorage e restaurada no load. */

(function () {
  'use strict';

  var ORIGIN = 'https://flapycopa.tanoclique.com';
  var KEY = 'flapycopa_session';
  /* montado por concatenação: o rebase troca literais de rota da API pela origem */
  var API = '/' + 'api/';

  /* ------------------------------------------------------------------ */
  /* 1) Áudio                                                            */
  /* ------------------------------------------------------------------ */
  try {
    var Native = window.AudioContext || window.webkitAudioContext;
    if (Native) {
      var live = [];
      window.AudioContext = new Proxy(Native, {
        construct: function (T, args, newTarget) {
          var ctx = Reflect.construct(T, args, newTarget || T);
          live.push(ctx);
          return ctx;
        }
      });

      var unlock = function () {
        for (var i = 0; i < live.length; i++) {
          var c = live[i];
          if (c && c.state === 'suspended' && c.resume) {
            try { c.resume().catch(function () {}); } catch (e) {}
          }
        }
      };

      var EVENTS = ['pointerdown', 'pointerup', 'mousedown', 'mouseup',
                    'touchstart', 'touchend', 'keydown', 'keyup', 'click'];
      for (var e = 0; e < EVENTS.length; e++) {
        document.addEventListener(EVENTS[e], unlock, { capture: true, passive: true });
      }
      window.addEventListener('focus', unlock);
      unlock();
    }
  } catch (err) {}

  /* ------------------------------------------------------------------ */
  /* 2) Sessão local                                                     */
  /* ------------------------------------------------------------------ */
  function loadSession() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || 'null');
      return (s && typeof s === 'object') ? s : null;
    } catch (e) { return null; }
  }
  function saveSession(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function clearSession() { try { localStorage.removeItem(KEY); } catch (e) {} }

  function json(body, status) {
    try {
      return new Response(JSON.stringify(body), {
        status: status || 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) { return null; }
  }

  /* shape do servidor (camel/snake) a partir da sessão local */
  function toServerShape(s) {
    if (!s) return null;
    return {
      id: s.id || null,
      nome: s.name || '',
      telefone: s.phone || '',
      saldo: Number(s.balance || 0),
      codigo_indicacao: s.referral_code || '',
      referral: s.referral || null
    };
  }

  /* ------------------------------------------------------------------ */
  /* 3) fetch interceptado                                               */
  /* ------------------------------------------------------------------ */
  if (window.fetch) {
    var nativeFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      try {
        var raw = (typeof input === 'string') ? input
                : (input && (input.url || '')) || '';
        var url = raw;
        if (url.charAt(0) === '/' && url.charAt(1) !== '/') {
          url = (url.indexOf(API) === 0 ? ORIGIN : location.origin) + url;
        }

        var method = String(
          (init && init.method) ||
          (input && input.method) ||
          'GET'
        ).toUpperCase();

        var apiIdx = url.indexOf(API);
        if (apiIdx === -1) return nativeFetch(input, init);
        var endpoint = url.slice(apiIdx);   /* ex.: "https://flapycopa.tanoclique.com/api/auth/me" */
        if (url.indexOf(ORIGIN + API) !== 0) url = ORIGIN + endpoint;   /* sempre na origem real */

        /* --- cadastro / login: passa para a API real e guarda a sessão --- */
        if (method === 'POST' && (endpoint.indexOf('/auth/register') === 0 ||
                                  endpoint.indexOf('/auth/login') === 0)) {
          return nativeFetch(url, init).then(function (r) {
            var clone = r.clone();
            return clone.json().catch(function () { return null; }).then(function (body) {
              if (body && body.success) {
                var sent = {};
                try { sent = (init && init.body) ? JSON.parse(init.body) : {}; } catch (e) {}
                var u = (body.data && (body.data.user || body.data)) || {};
                saveSession({
                  id: u.id || null,
                  name: u.nome || u.name || sent.nome || '',
                  phone: u.telefone || u.phone || sent.telefone || '',
                  balance: Number(u.saldo != null ? u.saldo : (u.balance != null ? u.balance : 0)),
                  referral_code: u.codigo_indicacao || u.referral_code || '',
                  referral: u.referral || null
                });
              }
              return r;
            });
          });
        }

        /* --- logout: limpa a sessão local --- */
        if (method === 'POST' && endpoint.indexOf('/auth/logout') === 0) {
          clearSession();
          return nativeFetch(url, init);
        }

        /* --- /api/auth/me: serve da sessão local (nunca 401) --- */
        if (method === 'GET' && endpoint.indexOf('/auth/me') === 0) {
          var s = loadSession();
          return Promise.resolve(json({ success: !!s, data: s ? { user: toServerShape(s) } : {} }) ||
                                 new Response('{}', { status: 200 }));
        }

        /* --- extrato: o backend real não conhece a sessão local -> vazio --- */
        if (method === 'GET' && endpoint.indexOf('/profile/financial-history') === 0) {
          return Promise.resolve(json({ success: true, data: { resumo: {} } }) ||
                                 new Response('{}', { status: 200 }));
        }
      } catch (err) {}

      return nativeFetch(input, init);
    };
  }

  /* ------------------------------------------------------------------ */
  /* 4) Restaura o estado "logado" depois do script principal             */
  /* ------------------------------------------------------------------ */
  function setFlag(name, value) {
    try {
      if (typeof window[name] !== 'undefined' || name in window) { window[name] = value; return true; }
    } catch (e) {}
    try {
      /* let/const de topo ficam no ambiente léxico global, fora de window */
      /* jshint evil:true */
      var fn = new Function('v', name + ' = v;');
      fn(value);
      return true;
    } catch (e) { return false; }
  }
  function getFlag(name) {
    try { var fn = new Function('try { return ' + name + '; } catch (e) { return undefined; }'); return fn(); }
    catch (e) { return undefined; }
  }

  function swapAuthButtons() {
    var entrar = null, list = document.querySelectorAll('button');
    for (var i = 0; i < list.length; i++) {
      var t = (list[i].textContent || '').replace(/\s+/g, ' ').trim().toUpperCase();
      if (t === 'ENTRAR') { entrar = list[i]; break; }
    }
    if (!entrar || !entrar.parentElement) return;
    var box = entrar.parentElement;
    box.innerHTML =
      '<span id="top-balance" class="text-xs font-black text-yellow-300 tabular-nums">0,00</span>' +
      '<button onclick="openModal(\'modal-deposit\')" class="header-btn-3d-green select-none">DEPOSITAR</button>' +
      '<button onclick="openProfileModal()" class="header-btn-3d-blue select-none">PERFIL</button>' +
      '<button onclick="handleLogout()" class="header-btn-3d-blue select-none">SAIR</button>';
  }

  function restore() {
    var s = loadSession();
    if (!s) return;

    setFlag('isLoggedIn', true);
    setFlag('IS_AUTH', true);

    swapAuthButtons();

    try {
      if (typeof normalizeUser === 'function') currentUser = normalizeUser(toServerShape(s));
    } catch (e) {}
    try {
      if (typeof updateCurrentUserUI === 'function') updateCurrentUserUI();
    } catch (e) {}

    /* garante o saldo visível mesmo se o render estático não tiver o campo */
    var bal = document.getElementById('top-balance');
    if (bal) {
      bal.textContent = Number(s.balance || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
      });
    }
    var nm = document.getElementById('top-name');
    if (nm && s.name) nm.innerText = s.name;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restore);
  } else {
    restore();
  }
})();
