// Site search dialog (Ctrl+K, Cmd+K or "/"). The index is a small JSON file fetched the first
// time search is opened (or the button is pointed at), then filtered in the browser.
// Matching (pure, also loaded by the tests): every query word must start a word of the page's
// title or description, or be one letter off a whole word ("strawbery"), so "tea" no longer finds
// "Bug Steak". A few synonyms ("af", "jelly", "cc") are tried as well.
(function (root) {
	var SYNONYMS = {
		af: 'ancient fruit',
		sf: 'starfruit',
		jelly: 'preserves jar',
		pickles: 'preserves jar',
		jam: 'preserves jar',
		wine: 'keg',
		juice: 'keg',
		exp: 'xp',
		experience: 'xp',
		money: 'profit',
		cc: 'bundle',
		'community center': 'bundle',
		junimo: 'bundle',
		friendship: 'gift',
		hearts: 'gift',
		present: 'gift',
		roe: 'fish pond',
		caviar: 'fish pond',
		speedgro: 'speed gro',
		'speed grow': 'speed gro',
		sapling: 'fruit tree',
		saplings: 'fruit tree'
	};
	var norm = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); };

	// True when a and b are at most one insert, delete or change apart.
	function near(a, b) {
		var la = a.length, lb = b.length;
		if (Math.abs(la - lb) > 1) return false;
		var i = 0, j = 0, edits = 0;
		while (i < la && j < lb) {
			if (a.charAt(i) === b.charAt(j)) { i++; j++; continue; }
			if (++edits > 1) return false;
			if (la > lb) i++;
			else if (lb > la) j++;
			else { i++; j++; }
		}
		return edits + (la - i) + (lb - j) <= 1;
	}

	// How well one query word fits a list of words: 3 whole word, 2 word start, 1 one letter off.
	function fit(w, words) {
		var best = 0;
		var bare = w.length > 3 && w.charAt(w.length - 1) === 's' ? w.slice(0, -1) : '';
		for (var i = 0; i < words.length && best < 3; i++) {
			var x = words[i];
			if (x === w || x === bare) best = 3;
			else if (x.indexOf(w) === 0 || (bare && x.indexOf(bare) === 0)) best = Math.max(best, 2);
			else if (w.length >= 4 && x.length >= 4 && near(w, x)) best = Math.max(best, 1);
		}
		return best;
	}

	function prep(it) {
		it.n = norm(it.t);
		it.tw = it.n.split(' ');
		it.aw = norm([it.t, it.k, it.d, it.x].join(' ')).split(' ');
		return it;
	}

	function scoreOne(it, q) {
		var words = q.split(' ');
		var s = 0;
		if (it.n === q) s += 100;
		else if (it.n.indexOf(q) === 0) s += 60;
		else if ((' ' + it.n).indexOf(' ' + q) > -1) s += 40;
		for (var i = 0; i < words.length; i++) {
			var t = fit(words[i], it.tw);
			var a = t ? 0 : fit(words[i], it.aw);
			if (!t && !a) return 0;
			s += t ? [0, 5, 10, 12][t] : [0, 1, 3, 4][a];
		}
		return s;
	}

	// The query, plus the query with each synonym swapped in (scored a little lower).
	function variants(q) {
		var out = [q];
		var padded = ' ' + q + ' ';
		for (var k in SYNONYMS) {
			if (padded.indexOf(' ' + k + ' ') > -1) out.push(norm(padded.replace(' ' + k + ' ', ' ' + SYNONYMS[k] + ' ')));
		}
		return out;
	}

	function score(it, q) {
		var v = variants(norm(q));
		var best = scoreOne(it, v[0]);
		for (var i = 1; i < v.length; i++) best = Math.max(best, scoreOne(it, v[i]) - 2);
		return best;
	}

	/** Best matches first; items must have been through prep(). */
	function rank(items, query, limit) {
		var q = norm(query);
		if (!q) return [];
		return items.map(function (it, i) { return { it: it, s: score(it, q), i: i }; })
			.filter(function (r) { return r.s > 0; })
			.sort(function (a, b) { return b.s - a.s || a.i - b.i; })
			.slice(0, limit || 10)
			.map(function (r) { return r.it; });
	}

	root.StardewSearch = { norm: norm, near: near, prep: prep, score: score, rank: rank, SYNONYMS: SYNONYMS };
})(typeof window !== 'undefined' ? window : globalThis);

(function () {
	if (typeof document === 'undefined') return;
	var match = window.StardewSearch;
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
					items.forEach(match.prep);
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
	function render() {
		if (!index) {
			list.textContent = '';
			active = -1;
			input.setAttribute('aria-expanded', 'false');
			mark();
			status.textContent = loading ? 'Loading…' : 'Search could not load. Check your connection and try again.';
			return;
		}
		var q = match.norm(input.value);
		var rows = q ? match.rank(index, q, 10) : index.filter(function (it) { return it.k === 'Tool' || it.k === 'Guide'; }).slice(0, 8);
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
		// The listbox only counts as expanded while it shows options.
		input.setAttribute('aria-expanded', rows.length ? 'true' : 'false');
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
