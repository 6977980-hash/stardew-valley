// Site search dialog (Ctrl+K, Cmd+K or "/"). The index is a small JSON file fetched the first
// time search is opened (or the button is pointed at), then filtered in the browser.
(function () {
	var dialog = document.getElementById('site-search');
	var url = dialog && dialog.getAttribute('data-index-url');
	if (!dialog || !url || typeof dialog.showModal !== 'function' || !window.fetch) {
		document.querySelectorAll('[data-search-open]').forEach(function (b) { b.hidden = true; });
		return;
	}
	var index = null;
	var loading = null;
	function load() {
		if (!loading) {
			loading = fetch(url, { credentials: 'omit' })
				.then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
				.then(function (items) {
					items.forEach(function (it) {
						it.n = norm(it.t);
						it.all = norm([it.t, it.k, it.d, it.x].join(' '));
					});
					index = items;
				})
				.catch(function () { loading = null; });
		}
		return loading;
	}
	var input = dialog.querySelector('[data-search-input]');
	var list = dialog.querySelector('[data-search-results]');
	var status = dialog.querySelector('[data-search-status]');
	var active = -1;
	var opener = null;
	var norm = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); };

	function score(it, words, q) {
		var s = 0;
		if (it.n === q) s += 100;
		else if (it.n.indexOf(q) === 0) s += 60;
		else if (it.n.indexOf(q) > -1) s += 40;
		for (var i = 0; i < words.length; i++) {
			if (it.all.indexOf(words[i]) < 0) return 0;
			s += it.n.indexOf(words[i]) > -1 ? 10 : 3;
		}
		return s;
	}

	function render() {
		if (!index) {
			list.textContent = '';
			active = -1;
			mark();
			status.textContent = loading ? 'Loading…' : 'Search could not load. Check your connection and try again.';
			return;
		}
		var q = norm(input.value);
		var words = q ? q.split(' ') : [];
		var rows;
		if (!q) {
			rows = index.filter(function (it) { return it.k === 'Tool' || it.k === 'Guide'; }).slice(0, 8);
		} else {
			rows = index.map(function (it) { return { it: it, s: score(it, words, q) }; })
				.filter(function (r) { return r.s > 0; })
				.sort(function (a, b) { return b.s - a.s; })
				.slice(0, 10)
				.map(function (r) { return r.it; });
		}
		list.textContent = '';
		rows.forEach(function (it, i) {
			var li = document.createElement('li');
			li.id = 'site-search-opt-' + i;
			li.setAttribute('role', 'option');
			li.setAttribute('aria-selected', 'false');
			li.setAttribute('data-href', it.u);
			var t = document.createElement('span');
			t.className = 'search-dialog__t';
			t.textContent = it.t;
			var k = document.createElement('span');
			k.className = 'search-dialog__k';
			k.textContent = it.k;
			var d = document.createElement('span');
			d.className = 'search-dialog__d';
			d.textContent = it.d;
			li.appendChild(t); li.appendChild(k); li.appendChild(d);
			list.appendChild(li);
		});
		active = rows.length ? 0 : -1;
		mark();
		status.textContent = q ? (rows.length ? rows.length + ' result' + (rows.length === 1 ? '' : 's') : 'No results. Try a crop, animal or tool name.') : 'Popular pages';
	}

	function mark() {
		var opts = list.children;
		for (var i = 0; i < opts.length; i++) opts[i].setAttribute('aria-selected', i === active ? 'true' : 'false');
		if (active > -1) {
			input.setAttribute('aria-activedescendant', opts[active].id);
			opts[active].scrollIntoView({ block: 'nearest' });
		} else {
			input.removeAttribute('aria-activedescendant');
		}
	}

	function open(from) {
		if (dialog.open) return;
		opener = from || document.activeElement;
		dialog.showModal();
		input.value = '';
		var wait = load();
		render();
		input.focus();
		if (wait) wait.then(function () { if (dialog.open) render(); });
	}

	input.addEventListener('input', render);
	input.addEventListener('keydown', function (e) {
		var n = list.children.length;
		// A type="search" box eats the first Escape to clear itself; close the dialog at once.
		if (e.key === 'Escape') { e.preventDefault(); dialog.close(); }
		else if (e.key === 'ArrowDown' && n) { e.preventDefault(); active = (active + 1) % n; mark(); }
		else if (e.key === 'ArrowUp' && n) { e.preventDefault(); active = (active - 1 + n) % n; mark(); }
		else if (e.key === 'Enter' && active > -1) {
			e.preventDefault();
			window.location.href = list.children[active].getAttribute('data-href');
		}
	});
	list.addEventListener('click', function (e) {
		var li = e.target.closest('li');
		if (li) window.location.href = li.getAttribute('data-href');
	});
	dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
	dialog.addEventListener('close', function () {
		if (opener && opener.focus) opener.focus();
	});
	document.addEventListener('click', function (e) {
		var b = e.target.closest && e.target.closest('[data-search-open]');
		if (b) { e.preventDefault(); open(b); }
	});
	document.addEventListener('keydown', function (e) {
		var k = (e.key || '').toLowerCase();
		var typing = /^(input|textarea|select)$/i.test((document.activeElement || {}).tagName || '') || (document.activeElement && document.activeElement.isContentEditable);
		if ((k === 'k' && (e.ctrlKey || e.metaKey)) || (k === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey)) {
			e.preventDefault();
			open();
		}
	});
	// Start fetching as soon as someone heads for the button, so results are there when it opens.
	['pointerover', 'focusin', 'touchstart'].forEach(function (type) {
		document.addEventListener(type, function (e) {
			if (e.target.closest && e.target.closest('[data-search-open]')) load();
		}, { passive: true });
	});
	var key = document.querySelector('.search-open__key');
	if (key && /Mac|iPhone|iPad/.test(navigator.platform || '')) key.textContent = '⌘ K';
})();
