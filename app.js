/* Alpha Hunter v1 — static snapshot app.
 * Data: data.json (snapshot ledger hunter saat build).
 * Wallet Solana: @solana-mobile/wallet-standard-mobile v0.7.1 (MWA) via CDN.
 * Wallet EVM: WalletConnect — BUTUH Project ID (dibuat di cloud.walletconnect.com).
 *   v1 TIDAK mengarang Project ID: tombol EVM membuka lembar penjelasan.
 * Aplikasi TIDAK PERNAH meminta seed phrase / private key.
 */
(function () {
  'use strict';

  var DATA_URL = 'data.json';
  var state = { meta: null, items: [], filter: 'all', q: '', wallet: null, walletAddr: '', mwaRegistered: false };

  var CAT_LABEL = { early: 'Early', freemint: 'Free Mint', airdrop: 'Airdrop', whitelist: 'Whitelist' };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function shortAddr(a) { return a ? a.slice(0, 4) + '…' + a.slice(-4) : ''; }

  function chainKind(chain) {
    var c = (chain || '').toLowerCase();
    if (c.indexOf('solana') !== -1) return 'solana';
    if (/(base|bsc|bnb|ethereum|\beth\b|arbitrum|polygon|matic|evm)/.test(c)) return 'evm';
    return 'other';
  }
  function portalUrl(portal) {
    var p = (portal || '').trim();
    if (!p) return '';
    var m = p.match(/((https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/[^\s),]*)?)/i);
    if (!m) return '';
    var u = m[1];
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    return u;
  }

  /* ---------- data ---------- */
  function loadData(bust) {
    var url = DATA_URL + (bust ? '?t=' + Date.now() : '');
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (d) {
      state.meta = d.meta || {};
      state.items = (d.items || []).slice();
      state.items.sort(function (a, b) {
        if (a.found !== b.found) return a.found < b.found ? 1 : -1;
        return a.project.localeCompare(b.project);
      });
      renderMeta();
      renderChips();
      renderFeed();
      renderNotif();
      renderAbout();
    }).catch(function (e) {
      $('snap-line').textContent = 'Gagal memuat data: ' + e.message;
      $('feed').innerHTML = '<div class="empty">Data tidak bisa dimuat. Periksa koneksi lalu buka lagi aplikasi ini.</div>';
    });
  }
  function renderMeta() {
    var m = state.meta || {};
    $('ver-chip').textContent = 'v' + (m.version || '1.0.0');
    $('snap-line').innerHTML = 'Data hunter snapshot: <b>' + esc(m.data_snapshot_at || '-') + '</b> • ' +
      (m.counts ? m.counts.total + ' peluang aktif' : '');
  }
  function renderAbout() {
    var m = state.meta || {};
    $('about-meta').innerHTML =
      '<div class="kv"><span class="k">Versi</span><span class="v">' + esc(m.version || '1.0.0') + '</span></div>' +
      '<div class="kv"><span class="k">Snapshot data</span><span class="v">' + esc(m.data_snapshot_at || '-') + '</span></div>' +
      '<div class="kv"><span class="k">Peluang aktif</span><span class="v">' + (m.counts ? m.counts.total : '-') + ' (Early ' + (m.counts ? m.counts.early : '-') +
      ' • Free Mint ' + (m.counts ? m.counts.freemint : '-') + ' • Airdrop ' + (m.counts ? m.counts.airdrop : '-') +
      ' • Whitelist ' + (m.counts ? m.counts.whitelist : '-') + ')</span></div>' +
      '<div class="kv"><span class="k">Catatan data</span><span class="v">' + esc(m.note || '') + '</span></div>';
  }

  /* ---------- feed ---------- */
  function filtered() {
    var q = state.q.trim().toLowerCase();
    return state.items.filter(function (it) {
      if (state.filter !== 'all' && it.category !== state.filter) return false;
      if (q && (it.project + ' ' + (it.chain || '') + ' ' + (it.type || '')).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }
  function renderChips() {
    var counts = { all: state.items.length, early: 0, freemint: 0, airdrop: 0, whitelist: 0 };
    state.items.forEach(function (it) { if (counts[it.category] != null) counts[it.category]++; });
    var order = ['all', 'early', 'freemint', 'airdrop', 'whitelist'];
    $('chips').innerHTML = order.map(function (k) {
      var label = k === 'all' ? 'Semua' : CAT_LABEL[k];
      return '<button class="chip' + (state.filter === k ? ' on' : '') + '" data-f="' + k + '">' +
        esc(label) + ' <span class="n">' + counts[k] + '</span></button>';
    }).join('');
    Array.prototype.forEach.call($('chips').querySelectorAll('.chip'), function (b) {
      b.addEventListener('click', function () { state.filter = b.getAttribute('data-f'); renderChips(); renderFeed(); });
    });
  }
  function renderFeed() {
    var list = filtered();
    $('feed-count').textContent = list.length + ' peluang • ketuk kartu untuk detail';
    if (!list.length) {
      $('feed').innerHTML = '<div class="empty">Tidak ada peluang yang cocok dengan filter/pencarian ini.</div>';
      return;
    }
    $('feed').innerHTML = list.map(function (it) {
      return '<article class="card" data-id="' + esc(it.id) + '">' +
        '<h3>' + esc(it.project) + '</h3>' +
        '<div class="pills"><span class="pill cat-' + esc(it.category) + '">' + esc(CAT_LABEL[it.category] || it.category) + '</span>' +
        (it.chain ? '<span class="pill chain">' + esc(it.chain) + '</span>' : '') + '</div>' +
        (it.cost ? '<div class="meta">Biaya: <b>' + esc(it.cost) + '</b></div>' : '') +
        (it.status ? '<div class="status">' + esc(it.status) + '</div>' : '') +
        '<div class="meta">Ditemukan: ' + esc(it.found) + '</div>' +
        '</article>';
    }).join('');
    Array.prototype.forEach.call($('feed').querySelectorAll('.card'), function (c) {
      c.addEventListener('click', function () { openDetail(c.getAttribute('data-id')); });
    });
  }

  /* ---------- notifications (pull) ---------- */
  function renderNotif() {
    var list = state.items.slice(0, 20);
    $('notif-list').innerHTML = list.map(function (it) {
      return '<div class="notif-item" data-id="' + esc(it.id) + '"><span class="dot"></span><div>' +
        '<h4>' + esc(it.project) + ' <span style="color:var(--muted); font-weight:400">• ' + esc(CAT_LABEL[it.category] || it.category) + '</span></h4>' +
        '<p>' + esc((it.status || it.details || '').slice(0, 140)) + '</p>' +
        '<p style="margin-top:3px">' + esc(it.found) + ' • ' + esc(it.chain || '') + '</p>' +
        '</div></div>';
    }).join('') || '<div class="empty">Belum ada temuan.</div>';
    Array.prototype.forEach.call($('notif-list').querySelectorAll('.notif-item'), function (n) {
      n.addEventListener('click', function () { openDetail(n.getAttribute('data-id')); });
    });
  }

  /* ---------- sheets ---------- */
  function openSheet(html) {
    $('sheet-body').innerHTML = '<button class="sheet-close" id="sheet-x" aria-label="Tutup">✕</button>' + html;
    $('sheet').classList.add('open');
    $('sheet-x').addEventListener('click', closeSheet);
    $('sheet').onclick = function (e) { if (e.target === $('sheet')) closeSheet(); };
  }
  function closeSheet() { $('sheet').classList.remove('open'); $('sheet-body').innerHTML = ''; }

  function actionHtml(it) {
    var kind = chainKind(it.chain);
    var url = portalUrl(it.portal);
    var portalBtn = url ? '<a class="btn ghost" href="' + esc(url) + '" target="_blank" rel="noopener">Buka portal project ↗</a>' : '';
    if (kind === 'solana') {
      if (state.wallet) {
        return '<div class="okbox">Wallet Solana terhubung: <span class="mono">' + esc(shortAddr(state.walletAddr)) + '</span> (Seed Vault / MWA).</div>' +
          portalBtn +
          '<p class="note">v1: mint/claim dieksekusi di portal project. Aplikasi memverifikasi wallet kamu terhubung; eksekusi mint langsung di aplikasi menyusul di update berikutnya.</p>';
      }
      return '<button class="btn primary" id="act-connect-sol">Hubungkan wallet Solana (Seed Vault)</button>' + portalBtn +
        '<p class="note">Tanda tangan terjadi di dalam Seed Vault di HP kamu. Aplikasi tidak pernah melihat seed phrase kamu.</p>';
    }
    if (kind === 'evm') {
      return '<button class="btn primary" id="act-connect-evm">Connect wallet EVM (WalletConnect)</button>' + portalBtn +
        '<p class="note">EVM (Base / BSC / Ethereum / Arbitrum): sign lewat WalletConnect ke wallet kamu sendiri.</p>';
    }
    return '<div class="warnbox">Chain ini belum punya jalur sign di v1. Aplikasi tetap memberi notifikasi; ikuti panduan di portal project, atau tunggu update jalur wallet berikutnya.</div>' + portalBtn;
  }

  function openDetail(id) {
    var it = null;
    state.items.forEach(function (x) { if (x.id === id) it = x; });
    if (!it) return;
    var caution = /caution|berbayar|paid|biaya/i.test((it.verdict || '') + ' ' + (it.cost || ''));
    var html = '<h2>' + esc(it.project) + '</h2>' +
      '<div class="sub">' + esc(CAT_LABEL[it.category] || it.category) + (it.type ? ' • ' + esc(it.type) : '') + '</div>' +
      '<div class="pills"><span class="pill chain">' + esc(it.chain || 'Chain tidak tercatat') + '</span>' +
      (it.found && it.found !== '0000-00-00' ? '<span class="pill chain">Ditemukan ' + esc(it.found) + '</span>' : '') + '</div>' +
      (it.details ? '<h2 class="sec">Ringkasan</h2><p class="note" style="color:var(--text); font-size:14px;">' + esc(it.details) + '</p>' : '') +
      '<h2 class="sec">Audit &amp; penilaian</h2>' +
      (it.verdict ? '<div class="kv"><span class="k">Verdict</span><span class="v">' + esc(it.verdict) + '</span></div>' : '') +
      (it.potential ? '<div class="kv"><span class="k">Potensi</span><span class="v">' + esc(it.potential) + '</span></div>' : '') +
      (it.risk ? '<div class="kv"><span class="k">Risiko</span><span class="v">' + esc(it.risk) + '</span></div>' : '') +
      (it.cost ? '<div class="kv"><span class="k">Biaya</span><span class="v">' + esc(it.cost) + '</span></div>' : '') +
      (it.status ? '<div class="kv"><span class="k">Status</span><span class="v">' + esc(it.status) + '</span></div>' : '') +
      (it.portal ? '<div class="kv"><span class="k">Portal</span><span class="v">' + esc(it.portal) + '</span></div>' : '') +
      (caution ? '<div class="warnbox"><b>Perhatian:</b> item ini berbayar atau audit CAUTION. Di aplikasi final, aksi seperti ini meminta persetujuan eksplisit kamu dulu — tidak ada eksekusi diam-diam.</div>' : '') +
      '<h2 class="sec">Aksi</h2><div id="detail-actions">' + actionHtml(it) + '</div>';
    openSheet(html);
    bindDetailActions(it);
  }
  function bindDetailActions(it) {
    var b1 = $('act-connect-sol');
    if (b1) b1.addEventListener('click', function () { connectSolana().then(function () { openDetail(it.id); }); });
    var b2 = $('act-connect-evm');
    if (b2) b2.addEventListener('click', openEvmSheet);
  }

  function openEvmSheet() {
    openSheet(
      '<h2>Connect wallet EVM</h2>' +
      '<div class="sub">Base / BSC / Ethereum / Arbitrum / Polygon — via WalletConnect</div>' +
      '<div class="warnbox"><b>Belum bisa connect di v1.</b><br>WalletConnect butuh <b>Project ID</b> gratis dari <span class="mono">cloud.walletconnect.com</span>. Project ID itu dibuat oleh publisher (pemilik aplikasi) dan dimasukkan ke update aplikasi berikutnya. Aplikasi ini <b>tidak mengarang</b> Project ID.</div>' +
      '<h2 class="sec">Yang dibutuhkan publisher</h2>' +
      '<ul class="tight"><li>Buat akun di <b>cloud.walletconnect.com</b></li><li>Buat project baru → salin <b>Project ID</b></li><li>Masukkan Project ID ke aplikasi → rilis update</li></ul>' +
      '<p class="note">Sementara itu, peluang EVM tetap bisa diikuti lewat portal project masing-masing. Wallet EVM kamu tetap di HP kamu — aplikasi tidak pernah meminta seed phrase.</p>' +
      '<button class="btn ghost" onclick="document.getElementById(\'sheet\').classList.remove(\'open\')">Saya mengerti</button>'
    );
  }
  function openNoWalletSheet() {
    openSheet(
      '<h2>Wallet Solana tidak ditemukan</h2>' +
      '<div class="sub">Mobile Wallet Adapter tidak mendeteksi wallet di perangkat ini.</div>' +
      '<ul class="tight"><li>Buka aplikasi ini di <b>HP Solana Seeker</b>, atau</li><li>Instal wallet Solana yang mendukung Mobile Wallet Adapter (mis. Phantom / Solflare) di HP Android kamu.</li></ul>' +
      '<p class="note">Di browser desktop, tombol connect memang tidak bisa bekerja — MWA hanya hidup di perangkat Android dengan wallet terpasang.</p>' +
      '<button class="btn ghost" onclick="document.getElementById(\'sheet\').classList.remove(\'open\')">Tutup</button>'
    );
  }

  /* ---------- Solana wallet (MWA) ---------- */
  function importWithFallback(urls) {
    var chain = Promise.reject(new Error('no url'));
    urls.forEach(function (u) {
      chain = chain.catch(function () { return import(u); });
    });
    return chain;
  }
  var mwaMod = null, wsAppMod = null;
  function loadMwaLibs() {
    if (mwaMod && wsAppMod) return Promise.resolve();
    return importWithFallback([
      'https://cdn.jsdelivr.net/npm/@solana-mobile/wallet-standard-mobile@0.7.1/+esm',
      'https://esm.sh/@solana-mobile/wallet-standard-mobile@0.7.1'
    ]).then(function (m) {
      mwaMod = m;
      return importWithFallback([
        'https://cdn.jsdelivr.net/npm/@wallet-standard/app@1.1.1/+esm',
        'https://esm.sh/@wallet-standard/app@latest'
      ]);
    }).then(function (m) { wsAppMod = m; });
  }
  function connectSolana() {
    return loadMwaLibs().then(function () {
      if (!state.mwaRegistered) {
        mwaMod.registerMwa({
          appIdentity: {
            name: 'Alpha Hunter',
            uri: location.href,
            icon: new URL('icon-512.png', location.href).href
          },
          chains: ['solana:mainnet'],
          onWalletNotFound: function () { return Promise.resolve(); }
        });
        state.mwaRegistered = true;
      }
      var wallets = wsAppMod.getWallets();
      var w = null;
      wallets.forEach(function (x) { if (x.name === 'Mobile Wallet Adapter') w = x; });
      if (!w) { openNoWalletSheet(); return Promise.resolve(false); }
      return w.features['standard:connect'].connect().then(function () {
        state.wallet = w;
        state.walletAddr = (w.accounts && w.accounts[0]) ? w.accounts[0].address : '';
        renderWallet();
        return true;
      });
    }).catch(function (e) {
      if (String((e && e.message) || e).indexOf('No wallet') !== -1) { openNoWalletSheet(); return false; }
      openSheet('<h2>Connect gagal</h2><div class="sub">Terjadi kesalahan saat menghubungkan wallet.</div>' +
        '<p class="note mono">' + esc(String((e && e.message) || e)) + '</p>' +
        '<p class="note">Coba lagi di HP dengan wallet Solana terpasang. Kalau terus gagal, kirim pesan error ini ke pengembang.</p>');
      return false;
    });
  }
  function signTest() {
    var w = state.wallet;
    if (!w) return;
    var feat = w.features && w.features['solana:signMessage'];
    if (!feat) { $('sign-result').innerHTML = '<div class="warnbox">Wallet ini tidak menyediakan fitur sign message.</div>'; return; }
    $('sign-result').innerHTML = '<p class="note">Meminta tanda tangan di wallet… (setujui di layar wallet kamu)</p>';
    feat.signMessage({ message: new TextEncoder().encode('Alpha Hunter v1 — verifikasi wallet') }).then(function (out) {
      var sig = out && out.signature ? out.signature : null;
      $('sign-result').innerHTML = '<div class="okbox">Tanda tangan berhasil. ' +
        (sig ? 'Signature ' + sig.length + ' byte — Seed Vault bekerja.' : '') + '</div>';
    }).catch(function (e) {
      $('sign-result').innerHTML = '<div class="warnbox">Tanda tangan dibatalkan / gagal: ' + esc(String((e && e.message) || e)) + '</div>';
    });
  }
  function renderWallet() {
    var connected = !!state.wallet;
    $('wallet-empty').classList.toggle('hidden', connected);
    $('wallet-connected').classList.toggle('hidden', !connected);
    if (connected) {
      $('wallet-addr-short').textContent = shortAddr(state.walletAddr);
      $('wallet-addr-full').textContent = state.walletAddr;
      $('sign-result').innerHTML = '';
    }
  }

  /* ---------- nav & wiring ---------- */
  function showView(v) {
    ['feed', 'notif', 'wallet', 'about'].forEach(function (x) {
      $('view-' + x).classList.toggle('hidden', x !== v);
    });
    Array.prototype.forEach.call(document.querySelectorAll('nav button'), function (b) {
      b.classList.toggle('on', b.getAttribute('data-view') === v);
    });
    $('search-wrap').style.display = v === 'feed' ? '' : 'none';
    $('chips').style.display = v === 'feed' ? '' : 'none';
    if (v === 'wallet') renderWallet();
    window.scrollTo(0, 0);
  }
  Array.prototype.forEach.call(document.querySelectorAll('nav button'), function (b) {
    b.addEventListener('click', function () { showView(b.getAttribute('data-view')); });
  });
  $('q').addEventListener('input', function () { state.q = $('q').value; renderFeed(); });
  $('btn-refresh-notif').addEventListener('click', function () { loadData(true); });
  $('btn-connect-sol').addEventListener('click', function () { connectSolana(); });
  $('btn-connect-evm').addEventListener('click', openEvmSheet);
  $('btn-disconnect').addEventListener('click', function () {
    var w = state.wallet;
    state.wallet = null; state.walletAddr = '';
    if (w && w.features && w.features['standard:disconnect']) {
      w.features['standard:disconnect'].disconnect().catch(function () {});
    }
    renderWallet();
  });
  $('btn-sign-test').addEventListener('click', signTest);

  loadData(false);
})();
