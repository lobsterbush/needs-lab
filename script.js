/* Fundamental Needs Lab — site interactions */
(function () {
    'use strict';

    /* ========================================
       Scroll-aware navigation
       ======================================== */
    const nav = document.querySelector('.nav');
    const isHomepage = document.querySelector('.hero-dark') !== null;

    function updateNav() {
        if (!nav) return;
        if (isHomepage) {
            if (window.scrollY > 80) {
                nav.classList.remove('nav--transparent');
                nav.classList.add('nav--solid');
            } else {
                nav.classList.remove('nav--solid');
                nav.classList.add('nav--transparent');
            }
        } else {
            nav.classList.remove('nav--transparent');
            nav.classList.add('nav--solid');
        }
    }

    updateNav();
    window.addEventListener('scroll', updateNav, { passive: true });

    /* ========================================
       Mobile nav toggle (full-screen overlay)
       ======================================== */
    const toggle = document.querySelector('.nav-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileClose = document.querySelector('.mobile-menu-close');

    if (toggle && mobileMenu) {
        toggle.addEventListener('click', () => {
            mobileMenu.classList.add('open');
        });
    }
    if (mobileClose && mobileMenu) {
        mobileClose.addEventListener('click', () => {
            mobileMenu.classList.remove('open');
        });
    }
    // Close on link click
    if (mobileMenu) {
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('open');
            });
        });
    }

    /* ========================================
       Mark active nav link
       ======================================== */
    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link, .mobile-menu a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === page || (page === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });

    /* ========================================
       Scroll-triggered fade-in animations
       ======================================== */
    const fadeElements = document.querySelectorAll('.fade-in');
    if (fadeElements.length > 0 && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1, rootMargin: '-40px' }
        );
        fadeElements.forEach(el => observer.observe(el));
    } else {
        // Fallback: show everything
        fadeElements.forEach(el => el.classList.add('visible'));
    }

    /* ========================================
       Data tracker tab switching
       ======================================== */
    const tabs = document.querySelectorAll('.tracker-tab');
    const panels = document.querySelectorAll('.tracker-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');

            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            panels.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            const panel = document.getElementById('panel-' + target);
            if (panel) panel.classList.add('active');
        });
    });
})();
