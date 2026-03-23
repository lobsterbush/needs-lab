/* Fundamental Needs Lab */
(function () {
    'use strict';

    /* ========================================
       Scroll-aware navigation
       ======================================== */
    const nav = document.querySelector('.nav');
    const isHomepage = document.querySelector('.hero-photo') !== null;

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
        toggle.addEventListener('click', () => mobileMenu.classList.add('open'));
    }
    if (mobileClose && mobileMenu) {
        mobileClose.addEventListener('click', () => mobileMenu.classList.remove('open'));
    }
    if (mobileMenu) {
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => mobileMenu.classList.remove('open'));
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
       Hero — Photo Slideshow + Scroll Fade
       ======================================== */
    const heroPhoto = document.querySelector('.hero-photo');
    const heroContainer = heroPhoto ? heroPhoto.querySelector('.mc-container') : null;
    const heroSlides = document.querySelectorAll('.hero-slide');
    const heroDots = document.querySelectorAll('.hero-dot');

    if (heroSlides.length > 1) {
        let currentSlide = 0;
        const slideCount = heroSlides.length;

        function goToSlide(idx) {
            heroSlides[currentSlide].classList.remove('active');
            heroDots[currentSlide].classList.remove('active');
            currentSlide = idx;
            heroSlides[currentSlide].classList.add('active');
            heroDots[currentSlide].classList.add('active');
        }

        /* Auto-advance every 6 seconds */
        let slideTimer = setInterval(() => {
            goToSlide((currentSlide + 1) % slideCount);
        }, 6000);

        /* Click indicators */
        heroDots.forEach(dot => {
            dot.addEventListener('click', () => {
                clearInterval(slideTimer);
                goToSlide(parseInt(dot.dataset.slide));
                slideTimer = setInterval(() => {
                    goToSlide((currentSlide + 1) % slideCount);
                }, 6000);
            });
        });
    }

    /* ========================================
       Scroll-triggered fade-in
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
            { threshold: 0.08, rootMargin: '-20px' }
        );
        fadeElements.forEach(el => observer.observe(el));
    } else {
        fadeElements.forEach(el => el.classList.add('visible'));
    }

    /* ========================================
       Animated Counters
       ======================================== */
    document.querySelectorAll('[data-counter]').forEach(el => {
        const target = el.getAttribute('data-counter');
        const suffix = el.getAttribute('data-suffix') || '';
        const duration = 2000;

        const counterObs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    counterObs.unobserve(entry.target);
                    animateCounter(entry.target, parseFloat(target), suffix, duration);
                }
            });
        }, { threshold: 0.5 });
        counterObs.observe(el);
    });

    function animateCounter(el, target, suffix, duration) {
        const start = performance.now();
        const isDecimal = target % 1 !== 0;

        function tick(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = eased * target;

            if (isDecimal) {
                el.textContent = current.toFixed(1) + suffix;
            } else {
                el.textContent = Math.round(current) + suffix;
            }

            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                el.textContent = (isDecimal ? target.toFixed(1) : target) + suffix;
            }
        }
        requestAnimationFrame(tick);
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
