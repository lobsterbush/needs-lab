/* Fundamental Needs Lab — interactive, experiential site */
(function () {
    'use strict';

    const isMobile = window.innerWidth < 768;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ========================================
       Scroll Progress Bar
       ======================================== */
    const progressBar = document.querySelector('.scroll-progress');
    if (progressBar) {
        window.addEventListener('scroll', () => {
            const h = document.documentElement.scrollHeight - window.innerHeight;
            progressBar.style.width = h > 0 ? (window.scrollY / h * 100) + '%' : '0%';
        }, { passive: true });
    }

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
       Hero — Scroll Fade only (no mouse parallax to avoid conflicts)
       ======================================== */
    const heroDark = document.querySelector('.hero-dark');
    const heroContainer = heroDark ? heroDark.querySelector('.mc-container') : null;

    if (heroDark && heroContainer && !prefersReducedMotion) {
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            const heroH = heroDark.offsetHeight;
            if (scrollY < heroH) {
                const p = scrollY / heroH;
                heroContainer.style.opacity = Math.max(0, 1 - p * 1.2);
            }
        }, { passive: true });
    }

    /* ========================================
       Scroll-triggered fade-in (spring bounce)
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

    /* Word reveal removed — was causing transform conflicts with hero parallax */

    /* ========================================
       Animated Counters (stats count up)
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
            /* Ease-out bounce */
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
       Card Tilt on Hover (3D perspective)
       ======================================== */
    if (!isMobile && !prefersReducedMotion) {
        document.querySelectorAll('[data-tilt]').forEach(card => {
            let tiltX = 0, tiltY = 0, targetX = 0, targetY = 0;
            let tiltRAF;

            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                targetX = (y - 0.5) * -8;
                targetY = (x - 0.5) * 8;
            });

            card.addEventListener('mouseenter', () => {
                card.style.transition = 'none';
                function animate() {
                    tiltX += (targetX - tiltX) * 0.1;
                    tiltY += (targetY - tiltY) * 0.1;
                    card.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.02)`;
                    tiltRAF = requestAnimationFrame(animate);
                }
                animate();
            });

            card.addEventListener('mouseleave', () => {
                cancelAnimationFrame(tiltRAF);
                card.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)';
                tiltX = 0; tiltY = 0; targetX = 0; targetY = 0;
            });
        });
    }

    /* ========================================
       Magnetic Buttons (pull toward cursor)
       ======================================== */
    if (!isMobile && !prefersReducedMotion) {
        document.querySelectorAll('[data-magnetic]').forEach(btn => {
            let magX = 0, magY = 0, magRAF;
            const strength = 0.3;

            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                magX = x * strength;
                magY = y * strength;
            });

            btn.addEventListener('mouseenter', () => {
                function animate() {
                    btn.style.transform = `translate(${magX}px, ${magY}px) scale(1.03)`;
                    magRAF = requestAnimationFrame(animate);
                }
                animate();
            });

            btn.addEventListener('mouseleave', () => {
                cancelAnimationFrame(magRAF);
                magX = 0; magY = 0;
                btn.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
                btn.style.transform = 'translate(0, 0) scale(1)';
                setTimeout(() => { btn.style.transition = ''; }, 500);
            });
        });
    }

    /* People grid stagger handled via CSS fade-in classes */

    /* ========================================
       Research Figure Hover Zoom
       ======================================== */
    document.querySelectorAll('.research-figure img').forEach(img => {
        img.addEventListener('mouseenter', () => {
            img.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
            img.style.transform = 'scale(1.02)';
        });
        img.addEventListener('mouseleave', () => {
            img.style.transform = 'scale(1)';
        });
    });

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
