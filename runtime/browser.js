/* Local runtime boundary for the v144 app. No framework or provider credentials. */
(function () {
  'use strict';
  var config = window.ClosetLintLocal;
  if (!config) return;
  var cache = {}, listeners = {}, tail = Promise.resolve(), busy = 0, failed = false;
  var board = config.board, boardDirty = false, boardTimer = null, restoring = false;
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  var sessionRefresh = null;
  function refreshSession() {
    if (sessionRefresh) return sessionRefresh;
    sessionRefresh = fetch('/', {credentials: 'same-origin', cache: 'no-store'}).then(function (response) {
      if (!response.ok) throw new Error('The local service is unavailable. Keep your edits open and check the server.');
      return response.text();
    }).then(function (page) {
      // Read JSON only. Never execute fetched HTML or bootstrap JavaScript.
      var match = page.match(/window\.ClosetLintLocal=([\s\S]*?);<\/script>/);
      var next = match ? JSON.parse(match[1]) : null;
      if (!next || !config.instance || next.instance !== config.instance || typeof next.token !== 'string' || !next.token) {
        throw new Error('The local wardrobe changed. Keep your edits open; return to the original data folder before saving.');
      }
      config.token = next.token;
    }).finally(function () { sessionRefresh = null; });
    return sessionRefresh;
  }
  function request(path, options, retried) {
    options = options || {};
    options.headers = Object.assign({}, options.headers, {'X-ClosetLint-Token': config.token});
    options.credentials = 'same-origin';
    options.cache = 'no-store';
    return fetch(path, options).then(function (response) {
      if (response.ok) return response;
      if (response.status === 403 && !retried) {
        return refreshSession().then(function () { return request(path, options, true); });
      }
      return response.json().catch(function () { return {}; }).then(function (data) { throw new Error(data.error || 'Local storage request failed'); });
    });
  }
  function jsonRequest(path, method, value) {
    return request(path, {method: method, headers: {'Content-Type': 'application/json'}, body: value === undefined ? undefined : JSON.stringify(value)}).then(function (r) { return r.json(); });
  }
  function write(job) {
    busy++;
    var result = tail.then(job);
    tail = result.then(function () { busy--; }, function () { busy--; failed = true; });
    return result;
  }
  function emit(col) {
    var docs = Object.keys(cache[col] || {}).map(function (id) { var value = copy(cache[col][id]); return {id: id, data: function () { return copy(value); }}; });
    (listeners[col] || []).forEach(function (fn) { fn({docs: docs}); });
  }
  var db = {collection: function (col) {
    if (!Object.prototype.hasOwnProperty.call(cache, col)) throw new Error('Unknown collection');
    return {
      onSnapshot: function (fn, error) {
        (listeners[col] = listeners[col] || []).push(fn);
        try { emit(col); } catch (e) { if (error) error(e); else throw e; }
        return function () { listeners[col] = listeners[col].filter(function (f) { return f !== fn; }); };
      },
      doc: function (id) {
        var path = '/api/doc/' + encodeURIComponent(col) + '/' + encodeURIComponent(id);
        return {
          set: function (value) {
            var record = copy(value);
            return write(function () { return jsonRequest(path, 'PUT', record).then(function () { cache[col][id] = record; emit(col); }); });
          },
          delete: function () {
            return write(function () { return jsonRequest(path, 'DELETE').then(function () { delete cache[col][id]; emit(col); }); });
          }
        };
      }
    };
  }};
  function saveFile(filename, blob) {
    var url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    return Promise.resolve();
  }
  function boardWrite() {
    clearTimeout(boardTimer);
    if (!boardDirty) return tail;
    var value = copy(board); boardDirty = false;
    return write(function () { return jsonRequest('/api/board', 'PUT', value); }).catch(function (error) { boardDirty = true; throw error; });
  }
  function flush() {
    return boardWrite().then(function () { return tail; }).then(function () {
      if (failed) throw new Error('A change could not be saved. Keep this tab open and check local storage before backing up or restoring.');
      if (boardDirty || busy) return flush();
    });
  }
  function notify(message) {
    var toast = document.getElementById('toast');
    if (toast) { toast.textContent = message; toast.classList.remove('hide'); }
  }
  var runtime = window.ClosetLintRuntime = {
    board: board,
    isDemo: !!config.demo,
    error: null,
    use: function (name) {
      if (name === 'sample') return Promise.resolve(null);
      return ready.then(function () {
        if (name === 'db') return db;
        if (name === 'assets') return {upload: function (blob) { return write(function () { return request('/api/assets', {method: 'POST', body: blob}).then(function (r) { return r.json(); }); }); }};
        if (name === 'downloads') return {save: function (file) { return saveFile(file.filename, file.data); }};
        return null;
      });
    },
    setBoard: function (value) {
      if (restoring) return;
      board = copy(value); runtime.board = board; boardDirty = true;
      clearTimeout(boardTimer);
      boardTimer = setTimeout(function () { boardWrite().catch(function () { notify('The board could not be saved. Keep this tab open and check the local service.'); }); }, 200);
    },
    flush: flush,
    backgroundStatus: function () { return request('/api/photos/background-status').then(function (r) { return r.json(); }); },
    removeBackground: function (photoId) { return request('/api/photos/remove-background', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({photoId: photoId})}).then(function (r) { return r.blob(); }); },
    fullBackup: function () {
      notify('Preparing a full backup, including catalog and photos…');
      return ready.then(flush).then(function () { return request('/api/backup'); }).then(function (r) { return r.blob(); }).then(function (blob) {
        return saveFile('closetlint-full-backup-' + new Date().toISOString().slice(0, 10) + '.zip', blob);
      });
    },
    openRestore: function () {
      var dialog = document.createElement('dialog');
      dialog.className = 'local-restore';
      var title = document.createElement('h2'); title.textContent = 'Restore a full backup';
      var note = document.createElement('p'); note.textContent = 'Choose a Closet Lint full backup. You’ll review its contents before replacing this wardrobe.';
      var file = document.createElement('input'); file.type = 'file'; file.accept = '.zip,application/zip'; file.setAttribute('aria-label', 'Full backup ZIP');
      var status = document.createElement('p'); status.setAttribute('role', 'status');
      var actions = document.createElement('div'); actions.className = 'actions';
      var cancel = document.createElement('button'); cancel.className = 'btn'; cancel.type = 'button'; cancel.textContent = 'Cancel';
      var apply = document.createElement('button'); apply.className = 'btn danger'; apply.type = 'button'; apply.textContent = 'Replace wardrobe with this backup'; apply.disabled = true;
      var ticket = null, applying = false, selecting = false;
      function discard() {
        if (ticket) { jsonRequest('/api/restore/cancel', 'POST', {ticket: ticket}).catch(function () {}); ticket = null; }
      }
      function close() { if (applying || selecting) return; discard(); dialog.close(); dialog.remove(); document.getElementById('menubtn').focus(); }
      cancel.addEventListener('click', close);
      dialog.addEventListener('cancel', function (event) { event.preventDefault(); close(); });
      file.addEventListener('change', function () {
        discard(); apply.disabled = true;
        var chosen = file.files[0]; if (!chosen) return;
        selecting = true; file.disabled = true; cancel.disabled = true; status.textContent = 'Checking backup and photos…';
        flush().then(function () { return request('/api/restore/preview', {method: 'POST', body: chosen}); }).then(function (r) { return r.json(); }).then(function (data) {
          ticket = data.ticket;
          var s = data.summary;
          status.textContent = s.catalogPieces + ' catalog pieces · ' + s.records + ' records in ' + s.collections + ' collections · ' + s.photos + ' photo files. This replaces the entire current wardrobe. A local recovery copy is kept before replacement.';
          apply.disabled = false;
        }).catch(function (error) { status.textContent = error.message; }).finally(function () { selecting = false; file.disabled = false; cancel.disabled = false; });
      });
      apply.addEventListener('click', function () {
        if (!ticket || applying) return;
        applying = true; restoring = true; apply.disabled = true; cancel.disabled = true; file.disabled = true;
        status.textContent = 'Restoring wardrobe…';
        flush().then(function () { return jsonRequest('/api/restore/apply', 'POST', {ticket: ticket, confirm: 'replace-wardrobe'}); }).then(function () {
          ticket = null; failed = false; boardDirty = false; window.location.reload();
        }).catch(function (error) { applying = false; restoring = false; status.textContent = error.message; cancel.disabled = false; file.disabled = false; });
      });
      actions.append(cancel, apply); dialog.append(title, note, file, status, actions); document.body.appendChild(dialog); dialog.showModal(); file.focus();
    }
  };
  var ready = request('/api/state').then(function (r) { return r.json(); }).then(function (state) { cache = state.collections; }).catch(function (error) {
    runtime.error = 'Local storage could not be loaded. Reload after checking the local service. Edits are not being saved.';
    throw error;
  });
  // Capabilities attach their rejection handlers immediately when the app boots.
  ready.catch(function () {});
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') boardWrite().catch(function () {}); });
  window.addEventListener('beforeunload', function (event) { if (busy || boardDirty || failed) { event.preventDefault(); event.returnValue = ''; } });
})();
