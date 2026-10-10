// Site search dialog (Ctrl+K, Cmd+K or "/"). Filters the small index embedded in the page.
(function () {
	var dialog = document.getElementById('site-search');
	var raw = document.getElementById('site-search-index');
	if (!dialog || !raw || typeof dialog.showModal !== 'function') {
		document.querySelectorAll('[data-search-open]').forEach(function (b) { b.hidden = true; });
		return;
	}
	var index = [];
	try { index = JSON.parse(raw.textContent); } catch (e) { return; }
	var input = dialog.querySelector('[data-search-input]');
	var list = dialog.querySelector('[data-search-results]');
	var status = dialog.querySelector('[data-search-status]');
	var active = -1;
	var opener = null;
	var norm = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); };
	index.forEach(function (it) {
		it.n = norm(it.t);
		it.all = norm([it.t, it.k, it.d, it.x].join(' '));
	});

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
			var a = document.createElement('a');
			a.href = it.u;
			a.tabIndex = -1;
			var t = document.createElement('span');
			t.className = 'search-dialog__t';
			t.textContent = it.t;
			var k = document.createElement('span');
			k.className = 'search-dialog__k';
			k.textContent = it.k;
			var d = document.createElement('span');
			d.className = 'search-dialog__d';
			d.textContent = it.d;
			a.appendChild(t); a.appendChild(k); a.appendChild(d);
			li.appendChild(a);
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
		render();
		input.focus();
	}

	input.addEventListener('input', render);
	input.addEventListener('keydown', function (e) {
		var n = list.children.length;
		if (e.key === 'ArrowDown' && n) { e.preventDefault(); active = (active + 1) % n; mark(); }
		else if (e.key === 'ArrowUp' && n) { e.preventDefault(); active = (active - 1 + n) % n; mark(); }
		else if (e.key === 'Enter' && active > -1) {
			e.preventDefault();
			window.location.href = list.children[active].querySelector('a').href;
		}
	});
	list.addEventListener('click', function () { dialog.close(); });
	dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
	dialog.addEventListener('close', function () {
		if (opener && opener.focus) opener.focus();
	});
	document.addEventListener('click', function (e) {
		var b = e.target.closest && e.target.closest('[data-search-open]');
		if (b) { e.preventDefault(); open(b); }
	});
	document.addEventListener('keydown', function (e) {
		var k = e.key.toLowerCase();
		var typing = /^(input|textarea|select)$/i.test((document.activeElement || {}).tagName || '') || (document.activeElement && document.activeElement.isContentEditable);
		if ((k === 'k' && (e.ctrlKey || e.metaKey)) || (k === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey)) {
			e.preventDefault();
			open();
		}
	});
	var key = document.querySelector('.search-open__key');
	if (key && /Mac|iPhone|iPad/.test(navigator.platform || '')) key.textContent = '⌘ K';
})();
