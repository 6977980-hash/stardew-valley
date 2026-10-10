/* Mobile menu toggle. The html.js class is set in <head> by functions.php; without JS the menu stays visible. */
(function () {
	var toggle = document.querySelector('.nav-toggle');
	var nav = document.getElementById('primary-nav');
	if (!toggle || !nav) return;
	function setOpen(open) {
		toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
		nav.classList.toggle('is-open', open);
	}
	toggle.addEventListener('click', function () {
		setOpen(toggle.getAttribute('aria-expanded') !== 'true');
	});
	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
			setOpen(false);
			toggle.focus();
		}
	});
})();

/* "On this page" starts collapsed on narrow screens so the article comes first. */
(function () {
	var toc = document.querySelector('.article-toc details');
	if (toc && window.matchMedia('(max-width: 1039px)').matches) toc.removeAttribute('open');
})();
