/* Local runtime boundary for the v144 app. No framework or provider credentials. */
(function () {
  'use strict';
  var config = window.ClosetLintLocal;
  if (!config) return;
  var cache = {}, listeners = {}, tail = Promise.resolve(), busy = 0, failed = false;
  var board = config.board, boardDirty = false, boardTimer = null, restoring = false;
  var boardRetries = 0, boardError = false, boardFlight = null;
  var recordVersions = {}, boardVersion = config.boardVersion;
  var wearRequests = new WeakMap();
  var saveListeners = [], boardStatus = {phase: 'saved', error: ''}, failedRecords = {};
  function boardState(phase, error, conflict) {
    boardStatus = {phase: phase, error: error || '', conflict: !!conflict};
    saveListeners.slice().forEach(function (fn) { try { fn(copy(boardStatus)); } catch (e) {} });
  }
  function hasFailedWrites() { return failed || Object.keys(failedRecords).length > 0; }
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
      return response.json().catch(function () { return {}; }).then(function (data) { var error = new Error(data.error || 'Local storage request failed'); error.status = response.status; throw error; });
    });
  }
  function jsonRequest(path, method, value, headers) {
    return request(path, {method: method, headers: Object.assign({'Content-Type': 'application/json'}, headers), body: value === undefined ? undefined : JSON.stringify(value)}).then(function (r) { return r.json(); });
  }
  function writeHeaders(version) {
    if (config.writeProtocol !== 1 || !version) {
      var error = new Error('Refresh Closet Lint before saving. Your edits are still here; keep this tab open and copy them into a fresh tab.');
      error.status = 428;
      throw error;
    }
    return {'If-Match': '"' + version + '"'};
  }
  function recordVersion(col, id) {
    return recordVersions[col] && recordVersions[col][id] || (cache[col][id] === undefined ? config.missingVersion : null);
  }
  function sourcePath(batch) { return '/api/import/sources?instance=' + encodeURIComponent(config.instance) + '&batch=' + encodeURIComponent(batch); }
  function importSourceRequest(path, options, blob) {
    var controller = new AbortController(), timer = setTimeout(function () { controller.abort(); }, 40000);
    return request(path, Object.assign({}, options, {signal: controller.signal})).then(function (r) { return blob ? r.blob() : r.json(); }).catch(function (error) {
      if (error.name === 'AbortError') throw new Error('The upload request timed out. Check the server, then retry; completed uploads will not be duplicated.');
      if (error.status === 404) throw new Error('Restart the local server to use source uploads, then retry.');
      throw error;
    }).finally(function () { clearTimeout(timer); });
  }
  function importRead(path) {
    var controller = new AbortController(), timer = setTimeout(function () { controller.abort(); }, 40000);
    return request(path, {signal: controller.signal}).then(function (r) { return r.json(); }).catch(function (error) {
      if (error.name === 'AbortError') throw new Error('The import check timed out. Check the local server, then retry; the batch ID is unchanged.');
      if (error.status === 404) throw new Error('Restart the local server to load direct-import setup, then retry this check.');
      throw error;
    }).finally(function () { clearTimeout(timer); });
  }
  function write(job, recoverable, key) {
    busy++;
    var result = tail.then(job);
    tail = result.then(function () { busy--; if (key) delete failedRecords[key]; }, function () { busy--; if (key) failedRecords[key] = true; else if (!recoverable) failed = true; });
    return result;
  }
  function emit(col) {
    var docs = Object.keys(cache[col] || {}).map(function (id) { var value = copy(cache[col][id]); return {id: id, data: function () { return copy(value); }}; });
    (listeners[col] || []).forEach(function (fn) { fn({docs: docs}); });
  }
  var db = {commitWear: function (changes) {
    var records = wearRequests.get(changes);
    if (!records) {
      records = copy(changes);
      records.forEach(function (record) { record.expected = recordVersion(record.collection, record.id); });
      wearRequests.set(changes, records);
    }
    return write(function () {
      if (!config.atomicWear) throw new Error('Refresh Closet Lint before logging this outfit. Keep this tab open to preserve your work.');
      records.forEach(function (record) { writeHeaders(record.expected); });
      return jsonRequest('/api/wear', 'POST', records).then(function (result) {
        result.versions.forEach(function (record) { (recordVersions[record.collection] = recordVersions[record.collection] || {})[record.id] = record.version; });
        var changed = {};
        records.forEach(function (record) { cache[record.collection][record.id] = copy(record.value); changed[record.collection] = true; });
        wearRequests.delete(changes);
        Object.keys(changed).forEach(emit);
      });
    }, true, '/api/wear/' + records.map(function (record) { return record.collection + ':' + record.id; }).sort().join('|'));
  }, collection: function (col) {
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
            var record = copy(value), expected = recordVersion(col, id);
            return write(function () { return jsonRequest(path, 'PUT', record, writeHeaders(expected)).then(function (result) {
              (recordVersions[col] = recordVersions[col] || {})[id] = result.version;
              cache[col][id] = record; emit(col);
            }); }, col === 'profile' && id === 'daily-card', col === 'profile' && id === 'daily-card' ? null : path);
          },
          delete: function () {
            var expected = recordVersion(col, id);
            return write(function () { return jsonRequest(path, 'DELETE', undefined, writeHeaders(expected)).then(function () {
              delete cache[col][id]; if (recordVersions[col]) delete recordVersions[col][id]; emit(col);
            }); }, false, path);
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
    if (boardFlight) return boardFlight;
    if (!boardDirty) return tail;
    var value = copy(board), expected = boardVersion; boardDirty = false;
    boardState('saving');
    boardFlight = write(function () { return jsonRequest('/api/board', 'PUT', value, writeHeaders(expected)); }, true).then(function (result) {
      boardVersion = result.version;
      boardRetries = 0;
      if (boardError && !boardDirty) { boardError = false; notify('Board autosave recovered.'); }
      boardState(boardDirty ? 'pending' : 'saved');
    }).catch(function (error) {
      boardDirty = true; boardError = true; boardState('error', error.message || 'The local service is unavailable.', error.status === 409 || error.status === 428);
      throw error;
    }).finally(function () {
      boardFlight = null;
      if (boardDirty && boardStatus.phase === 'pending') saveBoardSoon(200);
    });
    return boardFlight;
  }
  function saveBoardSoon(delay) {
    clearTimeout(boardTimer);
    boardTimer = setTimeout(function () {
      if (restoring || boardFlight) return;
      boardWrite().catch(function (error) {
        boardError = true;
        if (error.status === 409 || error.status === 428) { notify(error.message); return; }
        var retry = (!error.status || error.status >= 500) && boardRetries < 2;
        notify('Board not saved yet. ' + (error.message || 'The local service is unavailable.') + ' Keep this tab open.' + (retry ? ' Retrying…' : ' Use Retry draft save on the board.'));
        if (retry) { boardRetries++; boardState('retrying', error.message); saveBoardSoon(boardRetries * 1500); }
      });
    }, delay);
  }
  function flush() {
    return boardWrite().then(function () { return tail; }).then(function () {
      if (hasFailedWrites()) throw new Error('A change could not be saved. Keep this tab open and check local storage before backing up or restoring.');
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
      boardRetries = 0;
      boardState(boardFlight ? 'saving' : 'pending');
      saveBoardSoon(200);
    },
    boardSaveStatus: function () { return copy(boardStatus); },
    watchBoardSave: function (fn) { saveListeners.push(fn); try { fn(copy(boardStatus)); } catch (e) {} return function () { saveListeners = saveListeners.filter(function (f) { return f !== fn; }); }; },
    retryBoardSave: function () { if (!boardDirty || restoring || boardFlight || boardStatus.conflict) return; boardRetries = 0; boardState('retrying'); saveBoardSoon(0); },
    flush: flush,
    photoPrepare: function (action, values) {
      var job = function () { return jsonRequest('/api/photos/prepare', 'POST', Object.assign({}, values, {action: action, instance: config.instance})); };
      return ready.then(flush).then(function () {
        if (action !== 'save') return job();
        // Serialize with ordinary piece saves, then refresh snapshots without a page reload.
        return write(function () { return job().then(function (receipt) {
          return request('/api/state').then(function (r) { return r.json(); }).then(function (data) {
            if (data.instance !== config.instance) throw new Error('The wardrobe changed. Return to your original wardrobe.');
            ['custom', 'edits'].forEach(function (col) { cache[col] = copy(data.collections[col]); recordVersions[col] = data.writeVersions && data.writeVersions.collections[col] || {}; emit(col); });
            return receipt;
          });
        }); }, true);
      });
    },
    photoPrepareRead: function (id, options) {
      var path = '/api/photos/prepare?instance=' + encodeURIComponent(config.instance) + '&request=' + encodeURIComponent(id);
      Object.keys(options || {}).forEach(function (key) { path += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(options[key]); });
      return request(path).then(function (r) { return options ? r.blob() : r.json(); });
    },
    photoPrepareUpload: function (id, file) { return request('/api/photos/prepare/upload?instance=' + encodeURIComponent(config.instance) + '&request=' + encodeURIComponent(id), {method: 'POST', body: file}).then(function (r) { return r.json(); }); },
    oracleAccess: function () { return importRead('/api/oracle/access?instance=' + encodeURIComponent(config.instance)); },
    oraclePrepare: function (values) {
      var controller = new AbortController(), timer = setTimeout(function () { controller.abort(); }, 40000);
      return request('/api/oracle/prepare', {method: 'POST', signal: controller.signal, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(Object.assign({}, values, {instance: config.instance}))}).then(function (r) { return r.json(); }).catch(function (error) {
        if (error.name === 'AbortError') throw new Error('Preparing the Oracle request timed out. Retry or download a summary.');
        if (error.status === 404) throw new Error('Restart Closet Lint to enable local Oracle requests, or download a summary.');
        throw error;
      }).finally(function () { clearTimeout(timer); });
    },
    importSetup: function (batch) { return importRead('/api/import/setup?batch=' + encodeURIComponent(batch)).then(function (data) { if (data.instance !== config.instance) throw new Error('The local wardrobe changed. Reopen the original installation before importing.'); return data; }); },
    importStatus: function (batch) { return importRead('/api/import/status?instance=' + encodeURIComponent(config.instance) + '&batch=' + encodeURIComponent(batch)); },
    importSources: function (batch) { return importSourceRequest(sourcePath(batch)); },
    importSourceUpload: function (batch, id, file) { return importSourceRequest(sourcePath(batch) + '&id=' + encodeURIComponent(id) + '&name=' + encodeURIComponent(file.name), {method: 'POST', body: file}); },
    importSourceChoices: function (batch, choices) { return importSourceRequest(sourcePath(batch), {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(choices)}); },
    importSourceRemove: function (batch, id) { return importSourceRequest(sourcePath(batch) + '&id=' + encodeURIComponent(id), {method: 'DELETE'}); },
    importSourceBlob: function (batch, id) { return importSourceRequest(sourcePath(batch) + '&id=' + encodeURIComponent(id), {}, true); },
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
          ticket = null; failed = false; failedRecords = {}; boardDirty = false; window.location.reload();
        }).catch(function (error) { applying = false; restoring = false; status.textContent = error.message; cancel.disabled = false; file.disabled = false; });
      });
      actions.append(cancel, apply); dialog.append(title, note, file, status, actions); document.body.appendChild(dialog); dialog.showModal(); file.focus();
    }
  };
  var ready = request('/api/state').then(function (r) { return r.json(); }).then(function (state) {
    cache = state.collections;
    recordVersions = state.writeVersions && state.writeVersions.collections || {};
  }).catch(function (error) {
    runtime.error = 'Local storage could not be loaded. Reload after checking the local service. Edits are not being saved.';
    throw error;
  });
  // Capabilities attach their rejection handlers immediately when the app boots.
  ready.catch(function () {});
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') boardWrite().catch(function () {}); });
  window.addEventListener('online', function () { if (boardDirty && !restoring && !boardStatus.conflict) { boardRetries = 0; saveBoardSoon(200); } });
  window.addEventListener('beforeunload', function (event) { if (busy || boardDirty || hasFailedWrites()) { event.preventDefault(); event.returnValue = ''; } });
})();
