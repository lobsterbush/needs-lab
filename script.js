/* Fundamental Needs Lab — site interactions */
(function () {
    'use strict';

    /* Mobile nav toggle */
    const toggle = document.querySelector('.nav-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    if (toggle && mobileMenu) {
        toggle.addEventListener('click', () => {
            const open = mobileMenu.classList.toggle('open');
            toggle.setAttribute('aria-expanded', open);
            mobileMenu.setAttribute('aria-hidden', !open);
        });
    }

    /* Mark active nav link */
    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link, .mobile-menu a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === page || (page === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });
})();
