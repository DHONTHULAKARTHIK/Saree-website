/* ─────────────────────────────────────────────
   mobile.js  –  Mobile Navigation Logic
   Handles Hamburger toggle & Side-Slide Menu
───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Create Overlay for background when nav menu is open
    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    document.body.appendChild(overlay);

    const navLinks = document.querySelector('.nav-links');
    const hamburger = document.querySelector('.hamburger');

    function openMenu() {
        if (!navLinks) return;
        navLinks.classList.add('mobile-active');
        overlay.classList.add('show');
        const navbar = document.querySelector('.navbar');
        if (navbar) navbar.style.zIndex = '2000';
        if (hamburger) {
            const icon = hamburger.querySelector('span') || hamburger;
            icon.innerHTML = '✕';
        }
    }

    function closeMenu() {
        if (!navLinks) return;
        navLinks.classList.remove('mobile-active');
        overlay.classList.remove('show');
        const navbar = document.querySelector('.navbar');
        if (navbar) navbar.style.zIndex = '';
        if (hamburger) {
            const icon = hamburger.querySelector('span') || hamburger;
            icon.innerHTML = '☰';
        }
    }

    function toggleMenu() {
        if (navLinks && navLinks.classList.contains('mobile-active')) {
            closeMenu();
        } else {
            // Close dash menu first if open (prevent conflict)
            if (typeof closeDashMenu === 'function') closeDashMenu();
            openMenu();
        }
    }

    if (hamburger) {
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });
    }

    // Clicking main overlay closes both menus
    overlay.addEventListener('click', () => {
        closeMenu();
        if (typeof closeDashMenu === 'function') closeDashMenu();
    });

    // Close nav menu when a nav link is clicked
    const links = document.querySelectorAll('.nav-links a');
    links.forEach(link => {
        link.addEventListener('click', () => {
            closeMenu();
        });
    });
});

/* ─────────────────────────────────────────────
   Dashboard Sidebar Slide-In (Profile Page)
───────────────────────────────────────────── */
function toggleDashMenu() {
    const sidebar  = document.getElementById('dashboard-sidebar');
    const overlay  = document.getElementById('dash-menu-overlay');
    const toggle   = document.getElementById('dash-menu-toggle');
    if (!sidebar) return;

    const isOpen = sidebar.classList.toggle('dash-open');
    overlay.classList.toggle('show', isOpen);
    if (toggle) {
        toggle.innerHTML = isOpen
            ? '<span>✕</span> Close'
            : '<span>☰</span> My Account';
    }
}

function closeDashMenu() {
    const sidebar  = document.getElementById('dashboard-sidebar');
    const overlay  = document.getElementById('dash-menu-overlay');
    const toggle   = document.getElementById('dash-menu-toggle');
    if (!sidebar) return;

    sidebar.classList.remove('dash-open');
    overlay.classList.remove('show');
    if (toggle) toggle.innerHTML = '<span>☰</span> My Account';
}
