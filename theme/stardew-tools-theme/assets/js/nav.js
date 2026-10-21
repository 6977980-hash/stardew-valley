/* Mobile menu: the html.js class and the Menu button's click handler are inline in <head>
   (functions.php), so the menu opens even if this file fails. Escape closes it. */
(function () {
	var toggle = document.querySelector('.nav-toggle');
	var nav = document.getElementById('primary-nav');
	if (!toggle || !nav) return;
	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
			toggle.setAttribute('aria-expanded', 'false');
			nav.classList.remove('is-open');
			toggle.focus();
		}
	});
})();
