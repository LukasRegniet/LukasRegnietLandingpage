// tiny helpers
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

// debounce helper
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

//
// Theme handling (persist, start Light)
//
(function initTheme(){
  const saved = localStorage.getItem('theme');
  const initial = saved || 'light';
  document.documentElement.setAttribute('data-bs-theme', initial);

  const btn = $('#toggleTheme');
  if (btn) {
    const iconClass = () =>
      document.documentElement.getAttribute('data-bs-theme') === 'light'
        ? 'bi bi-moon'
        : 'bi bi-sun';

    const applyIcon = () => {
      const i = btn.querySelector('i');
      if (i) i.className = iconClass();
    };

    applyIcon();

    const handleThemeToggle = () => {
      const cur = document.documentElement.getAttribute('data-bs-theme') || 'light';
      const next = cur === 'light' ? 'dark' : 'light';

      // Create smooth transition overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle at center, rgba(102, 126, 234, 0.1), transparent);
        z-index: 9998;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      `;
      document.body.appendChild(overlay);

      // Animate overlay
      setTimeout(() => overlay.style.opacity = '1', 10);
      setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
      }, 200);

      // Add smooth transitions to key elements
      const elementsToTransition = $$('body, .hero, .card, .navbar, .floating-nav');
      elementsToTransition.forEach(el => {
        el.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      });

      // Apply theme change
      document.documentElement.setAttribute('data-bs-theme', next);
      localStorage.setItem('theme', next);

      // Update all theme toggle icons
      applyIcon();
      const floatingThemeBtn = $('#themeToggleFloat');
      if (floatingThemeBtn) {
        const floatingIcon = floatingThemeBtn.querySelector('i');
        if (floatingIcon) {
          floatingIcon.className = next === 'light' ? 'bi bi-moon' : 'bi bi-sun';
        }
      }

      // Remove transitions after animation
      setTimeout(() => {
        elementsToTransition.forEach(el => {
          el.style.transition = '';
        });
      }, 400);
    };

    btn.addEventListener('click', handleThemeToggle);

    // Expose theme toggle function globally for keyboard shortcuts
    window.toggleTheme = handleThemeToggle;
  }

  // footer year
  const y = $('#year');
  if (y) {
    y.textContent = new Date().getFullYear();
  }
})();

//
// Copy Share URL button
//
(function initCopyShare(){
  const share = $('#copyShare');
  if (!share) return;

  share.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(location.href);
      alert('URL copied');
    } catch (err) {
      alert('Copy failed');
    }
  });
})();

//
// Reveal-on-scroll animation
//
(function initReveal(){
  const sections = $$('.reveal');
  if (!('IntersectionObserver' in window)) {
    // Fallback: show all
    sections.forEach(el => el.classList.add('show'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  sections.forEach(el => io.observe(el));
})();

//
// Vimeo 5s loop segment with soft fade
// - plays from 7s to 12s
// - fades out last 0.5s, seeks back to 7s, fades back in
//
(function initVimeoLoop(){
  const iframe = document.getElementById('heroVimeo');
  if (!iframe) return;

  const startAt        = 7;    // seconds
  const SEGMENT        = 5;    // seconds total loop length
  const FADE_DURATION  = 0.6;  // seconds fade overlay anim
  const FADE_LEAD_IN   = 0.5;  // start fading this many seconds before segment end

  // wrap iframe with fade overlay
  const container = iframe.parentElement;
  container.style.position = 'relative';

  const fadeOverlay = document.createElement('div');
  Object.assign(fadeOverlay.style, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
    opacity: '0',
    transition: `opacity ${FADE_DURATION}s ease`,
    background: '#fff'
  });
  container.appendChild(fadeOverlay);

  const activateLoop = () => {
    const player = new Vimeo.Player(iframe);

    player.setLoop(false);
    player.setMuted(true);

    // jump to segment start and play
    player.setCurrentTime(startAt).catch(()=>{});
    player.play().catch(()=>{});

    let fading = false;

    player.on('timeupdate', (e) => {
      const t = e.seconds;

      // start fade a bit before we jump
      if (t >= startAt + SEGMENT - FADE_LEAD_IN && !fading) {
        fading = true;
        fadeOverlay.style.opacity = '1';
      }

      // hard jump back to startAt + fade reset
      if (t >= startAt + SEGMENT) {
        player.setCurrentTime(startAt).then(() => {
          fadeOverlay.style.opacity = '0';
          fading = false;
        });
      }
    });
  };

  // load Vimeo API if not injected yet
  if (typeof Vimeo === 'undefined' || !Vimeo.Player) {
    const s = document.createElement('script');
    s.src = 'https://player.vimeo.com/api/player.js';
    s.onload = activateLoop;
    document.head.appendChild(s);
  } else {
    activateLoop();
  }
})();

//
// Particle Background System
//
(function initParticles() {
  const canvas = document.createElement('canvas');
  canvas.className = 'particles-bg';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animationId;

  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  const createParticle = () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    dx: (Math.random() - 0.5) * 0.5,
    dy: (Math.random() - 0.5) * 0.5,
    size: Math.random() * 2 + 1,
    opacity: Math.random() * 0.5 + 0.1
  });

  const initParticles = () => {
    particles = [];
    const particleCount = Math.min(80, Math.floor(canvas.width * canvas.height / 10000));
    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle());
    }
  };

  const updateParticles = () => {
    particles.forEach(particle => {
      particle.x += particle.dx;
      particle.y += particle.dy;

      if (particle.x < 0 || particle.x > canvas.width) particle.dx *= -1;
      if (particle.y < 0 || particle.y > canvas.height) particle.dy *= -1;
    });
  };

  const drawParticles = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    const particleColor = isDark ? '255, 255, 255' : '102, 126, 234';

    particles.forEach(particle => {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${particleColor}, ${particle.opacity})`;
      ctx.fill();
    });

    // Draw connections
    particles.forEach((particle, i) => {
      particles.slice(i + 1).forEach(otherParticle => {
        const dx = particle.x - otherParticle.x;
        const dy = particle.y - otherParticle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 150) {
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(otherParticle.x, otherParticle.y);
          ctx.strokeStyle = `rgba(${particleColor}, ${0.1 * (1 - distance / 150)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    });
  };

  const animate = () => {
    updateParticles();
    drawParticles();
    animationId = requestAnimationFrame(animate);
  };

  const handleResize = debounce(() => {
    resizeCanvas();
    initParticles();
  }, 250);

  // Initialize
  resizeCanvas();
  initParticles();
  animate();

  // Event listeners
  window.addEventListener('resize', handleResize);

  // Pause animation when tab is not visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animationId);
    } else {
      animate();
    }
  });
})();

//
// Enhanced Dynamic Navbar with Active States
//
(function initDynamicNavbar() {
  const navbar = $('.navbar');
  const navLinks = $$('.nav-link');
  const sections = $$('section[id]');
  let lastScrollY = window.scrollY;
  let ticking = false;

  const updateNavbar = () => {
    const currentScrollY = window.scrollY;
    const scrollingDown = currentScrollY > lastScrollY;
    const scrollThreshold = 50;

    // Toggle navbar classes based on scroll
    if (currentScrollY > scrollThreshold) {
      navbar.classList.add('scrolled');

      // Auto-hide when scrolling down quickly
      if (scrollingDown && currentScrollY > 200) {
        navbar.classList.add('hidden');
      } else {
        navbar.classList.remove('hidden');
      }
    } else {
      navbar.classList.remove('scrolled', 'hidden');
    }

    lastScrollY = currentScrollY;
    ticking = false;
  };

  const updateActiveNavLink = () => {
    const navbarHeight = navbar.offsetHeight;
    const scrollPosition = window.scrollY + navbarHeight + 50;

    sections.forEach((section, index) => {
      const sectionTop = section.offsetTop;
      const sectionBottom = sectionTop + section.offsetHeight;
      const navLink = $(`a[href="#${section.id}"]`);

      if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
        // Remove active class from all links
        navLinks.forEach(link => link.classList.remove('active'));

        // Add active class to current link
        if (navLink) {
          navLink.classList.add('active');
        }
      }
    });
  };

  const requestTick = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateNavbar();
        updateActiveNavLink();
      });
      ticking = true;
    }
  };

  // Smooth show on hover when hidden
  navbar.addEventListener('mouseenter', () => {
    if (navbar.classList.contains('hidden')) {
      navbar.classList.remove('hidden');
    }
  });

  // Re-hide after leaving if still scrolled down
  navbar.addEventListener('mouseleave', () => {
    if (window.scrollY > 200 && lastScrollY < window.scrollY) {
      setTimeout(() => {
        if (window.scrollY > 200) {
          navbar.classList.add('hidden');
        }
      }, 2000);
    }
  });

  window.addEventListener('scroll', requestTick);

  // Initial call
  updateActiveNavLink();
})();

//
// Floating Navigation Menu
//
(function initFloatingNav() {
  const floatingNav = $('#floatingNav');
  const floatingToggle = $('#floatingNavToggle');
  const floatingItems = $$('.floating-nav-item');
  const themeToggleFloat = $('#themeToggleFloat');
  const mainNavbar = $('.navbar');

  let isExpanded = false;

  // Show/hide floating nav based on main navbar visibility
  const updateFloatingNavVisibility = () => {
    if (window.scrollY > 300 || mainNavbar.classList.contains('hidden')) {
      floatingNav.classList.add('visible');
    } else {
      floatingNav.classList.remove('visible');
      collapseFloatingNav();
    }
  };

  const expandFloatingNav = () => {
    isExpanded = true;
    floatingNav.classList.add('expanded');
    floatingToggle.innerHTML = '<i class="bi bi-x"></i>';
  };

  const collapseFloatingNav = () => {
    isExpanded = false;
    floatingNav.classList.remove('expanded');
    floatingToggle.innerHTML = '<i class="bi bi-list"></i>';
  };

  // Toggle floating nav
  floatingToggle.addEventListener('click', () => {
    if (isExpanded) {
      collapseFloatingNav();
    } else {
      expandFloatingNav();
    }
  });

  // Handle floating nav item clicks
  floatingItems.forEach(item => {
    if (item.id !== 'themeToggleFloat') {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = item.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
          const navbarHeight = mainNavbar.offsetHeight;
          const targetPosition = targetElement.offsetTop - navbarHeight - 20;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });

          // Collapse floating nav after navigation
          setTimeout(collapseFloatingNav, 300);
        }
      });
    }
  });

  // Sync floating theme toggle with main theme toggle
  themeToggleFloat.addEventListener('click', () => {
    if (window.toggleTheme) {
      window.toggleTheme();
    }
  });

  // Close floating nav when clicking outside
  document.addEventListener('click', (e) => {
    if (isExpanded && !floatingNav.contains(e.target)) {
      collapseFloatingNav();
    }
  });

  // Close floating nav on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isExpanded) {
      collapseFloatingNav();
    }
  });

  // Update visibility on scroll
  window.addEventListener('scroll', debounce(updateFloatingNavVisibility, 10));

  // Initial setup
  updateFloatingNavVisibility();

  // Sync initial theme state
  const initialTheme = document.documentElement.getAttribute('data-bs-theme') || 'light';
  const floatingThemeIcon = themeToggleFloat.querySelector('i');
  if (floatingThemeIcon) {
    floatingThemeIcon.className = initialTheme === 'light' ? 'bi bi-moon' : 'bi bi-sun';
  }
})();

//
// Smooth Scroll for Navigation Links
//
(function initSmoothScroll() {
  const navLinks = $$('a[href^="#"]');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        const navbarHeight = $('.navbar').offsetHeight;
        const targetPosition = targetElement.offsetTop - navbarHeight - 20;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
})();

//
// Enhanced Reveal Animation with Intersection Observer
//
(function enhanceRevealAnimation() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animationDelay = '0s';
        entry.target.classList.add('show');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all reveal elements
  $$('.reveal').forEach(el => observer.observe(el));
})();

//
// Loading Animation
//
(function initLoadingAnimation() {
  const loadingOverlay = document.createElement('div');
  loadingOverlay.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      transition: opacity 0.5s ease;
    ">
      <div style="
        width: 50px;
        height: 50px;
        border: 3px solid rgba(102, 126, 234, 0.3);
        border-top: 3px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      "></div>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;

  document.body.appendChild(loadingOverlay.firstElementChild);

  // Hide loading after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      const loader = document.querySelector('[style*="z-index: 9999"]');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
      }
    }, 800);
  });
})();


//
// Interactive Elements Enhancement
//
(function enhanceInteractivity() {
  // Add ripple effect to buttons
  const addRippleEffect = (element) => {
    element.addEventListener('click', (e) => {
      const ripple = document.createElement('span');
      const rect = element.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
      `;

      const style = document.createElement('style');
      style.textContent = `
        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);

      element.style.position = 'relative';
      element.style.overflow = 'hidden';
      element.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
        style.remove();
      }, 600);
    });
  };

  // Apply to all buttons
  $$('button, .btn').forEach(addRippleEffect);

  // Parallax effect for hero elements
  const parallaxElements = $$('.hero .ratio, .hero-card');

  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const rate = scrolled * -0.5;

    parallaxElements.forEach(el => {
      el.style.transform = `translateY(${rate}px)`;
    });
  });
})();

//
// Advanced User Experience Enhancements
//
(function initAdvancedUX() {
  // Progress indicator for page scroll
  const createScrollProgress = () => {
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 0%;
      height: 3px;
      background: var(--gradient-accent);
      z-index: 9999;
      transition: width 0.1s ease;
    `;
    document.body.appendChild(progressBar);

    const updateProgress = () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      progressBar.style.width = scrolled + '%';
    };

    window.addEventListener('scroll', updateProgress);
    return progressBar;
  };

  // Smart copy success feedback
  const enhanceCopyShare = () => {
    const copyBtn = $('#copyShare');
    if (!copyBtn) return;

    copyBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      try {
        await navigator.clipboard.writeText(location.href);

        // Create success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 2rem;
          right: 2rem;
          background: var(--gradient-accent);
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 0.75rem;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
          z-index: 9999;
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 500;
        `;
        notification.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="bi bi-check-circle-fill"></i>
            Profile URL copied to clipboard!
          </div>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => notification.style.transform = 'translateX(0)', 100);

        // Animate out and remove
        setTimeout(() => {
          notification.style.transform = 'translateX(100%)';
          setTimeout(() => notification.remove(), 300);
        }, 3000);

        // Update button temporarily
        const originalContent = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="bi bi-check"></i> Copied!';
        copyBtn.style.background = 'var(--gradient-accent)';
        copyBtn.style.color = 'white';

        setTimeout(() => {
          copyBtn.innerHTML = originalContent;
          copyBtn.style.background = '';
          copyBtn.style.color = '';
        }, 2000);

      } catch (err) {
        console.error('Copy failed:', err);

        // Fallback notification
        const notification = document.createElement('div');
        notification.textContent = 'Please manually copy the URL from your browser address bar';
        notification.style.cssText = `
          position: fixed;
          top: 2rem;
          right: 2rem;
          background: #ef4444;
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 0.75rem;
          z-index: 9999;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
      }
    });
  };

  // Intelligent reading time estimation
  const addReadingTime = () => {
    const content = $('main');
    if (!content) return;

    const text = content.textContent || content.innerText || '';
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).length;
    const readingTime = Math.ceil(words / wordsPerMinute);

    const readingIndicator = document.createElement('div');
    readingIndicator.style.cssText = `
      position: fixed;
      bottom: 2rem;
      left: 2rem;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(102, 126, 234, 0.2);
      padding: 0.75rem 1rem;
      border-radius: 2rem;
      font-size: 0.85rem;
      color: #374151;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s ease;
    `;

    readingIndicator.innerHTML = `
      <i class="bi bi-clock"></i>
      ${readingTime} min read
    `;

    document.body.appendChild(readingIndicator);

    // Show after initial page load
    setTimeout(() => {
      readingIndicator.style.opacity = '1';
      readingIndicator.style.transform = 'translateY(0)';
    }, 2000);

    // Hide when scrolling near bottom
    window.addEventListener('scroll', () => {
      const scrollPosition = window.scrollY + window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      if (scrollPosition / documentHeight > 0.9) {
        readingIndicator.style.opacity = '0';
        readingIndicator.style.transform = 'translateY(20px)';
      } else if (window.scrollY > 200) {
        readingIndicator.style.opacity = '1';
        readingIndicator.style.transform = 'translateY(0)';
      }
    });
  };

  // Enhanced keyboard shortcuts for power users
  const addKeyboardShortcuts = () => {
    // Expose shortcuts globally for debugging
    window.keyboardShortcuts = {
      enabled: true,
      debug: false
    };

    document.addEventListener('keydown', (e) => {
      // Skip if shortcuts disabled
      if (!window.keyboardShortcuts.enabled) return;

      // Prevent shortcuts when typing in forms or content editable elements
      if (e.target.tagName === 'INPUT' ||
          e.target.tagName === 'TEXTAREA' ||
          e.target.contentEditable === 'true' ||
          e.target.isContentEditable) return;

      // Debug logging
      if (window.keyboardShortcuts.debug) {
        console.log('Key pressed:', e.key, 'Code:', e.code, 'Target:', e.target.tagName);
      }

      const key = e.key.toLowerCase();

      switch(key) {
        case '/':
          e.preventDefault();
          e.stopPropagation();

          // Create visual feedback
          const contactBtn = $('.contact-primary-cta');
          if (contactBtn) {
            // Add focus ring animation
            contactBtn.style.outline = '3px solid rgba(102, 126, 234, 0.5)';
            contactBtn.style.outlineOffset = '4px';
            contactBtn.style.transition = 'outline 0.3s ease';

            contactBtn.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });

            setTimeout(() => {
              contactBtn.focus();
              setTimeout(() => {
                contactBtn.style.outline = '';
                contactBtn.style.outlineOffset = '';
              }, 1000);
            }, 500);
          }
          break;

        case 't':
          e.preventDefault();
          e.stopPropagation();

          if (window.toggleTheme) {
            window.toggleTheme();
          } else {
            const themeToggle = $('#toggleTheme');
            if (themeToggle) themeToggle.click();
          }
          break;

        case 'c':
          e.preventDefault();
          e.stopPropagation();

          const copyBtn = $('#copyShare');
          if (copyBtn) {
            copyBtn.click();
          }
          break;

        case 'escape':
          e.preventDefault();
          e.stopPropagation();

          // Close any open menus
          const floatingNav = $('#floatingNav');
          if (floatingNav && floatingNav.classList.contains('expanded')) {
            const collapseEvent = new CustomEvent('collapse');
            floatingNav.dispatchEvent(collapseEvent);

            const toggle = $('#floatingNavToggle');
            if (toggle) toggle.click();
          }
          break;
      }
    }, { passive: false });

    // Create enhanced keyboard shortcuts hint
    const createShortcutsHint = () => {
      const shortcutsHint = document.createElement('div');
      shortcutsHint.id = 'keyboard-shortcuts-hint';
      shortcutsHint.style.cssText = `
        position: fixed;
        bottom: 6rem;
        left: 2rem;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 1rem;
        border-radius: 0.75rem;
        font-size: 0.8rem;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 1001;
        pointer-events: none;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
      `;

      shortcutsHint.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          <div style="font-weight: 600; margin-bottom: 0.25rem; color: #38bdf8;">Keyboard Shortcuts</div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <kbd style="background: #374151; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-family: monospace; border: 1px solid #4b5563;">/</kbd>
            <span>Focus contact section</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <kbd style="background: #374151; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-family: monospace; border: 1px solid #4b5563;">T</kbd>
            <span>Toggle dark/light theme</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <kbd style="background: #374151; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-family: monospace; border: 1px solid #4b5563;">C</kbd>
            <span>Copy profile URL</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <kbd style="background: #374151; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-family: monospace; border: 1px solid #4b5563;">ESC</kbd>
            <span>Close menus</span>
          </div>
          <div style="margin-top: 0.5rem; font-size: 0.7rem; opacity: 0.7;">
            Press <kbd style="background: #374151; padding: 0.15rem 0.3rem; border-radius: 0.2rem; font-family: monospace;">?</kbd> to toggle this help
          </div>
        </div>
      `;

      document.body.appendChild(shortcutsHint);
      return shortcutsHint;
    };

    const shortcutsHint = createShortcutsHint();

    // Add help toggle functionality
    document.addEventListener('keydown', (e) => {
      if (e.key === '?' && !e.target.matches('input, textarea, [contenteditable]')) {
        e.preventDefault();
        const hint = $('#keyboard-shortcuts-hint');
        if (hint) {
          const isVisible = hint.style.opacity === '1';
          if (isVisible) {
            hint.style.opacity = '0';
            hint.style.transform = 'translateY(20px)';
          } else {
            hint.style.opacity = '1';
            hint.style.transform = 'translateY(0)';
          }
        }
      }
    });

    // Show shortcuts hint initially, then auto-hide
    setTimeout(() => {
      shortcutsHint.style.opacity = '1';
      shortcutsHint.style.transform = 'translateY(0)';
      setTimeout(() => {
        shortcutsHint.style.opacity = '0';
        shortcutsHint.style.transform = 'translateY(20px)';
      }, 6000);
    }, 3000);
  };

  // Initialize all UX enhancements
  createScrollProgress();
  enhanceCopyShare();
  addReadingTime();
  addKeyboardShortcuts();

  // Debug helper for testing
  window.testFeatures = () => {
    console.log('=== TESTING WEBSITE FEATURES ===');

    console.log('1. Theme Toggle:', window.toggleTheme ? '✅ Available' : '❌ Not found');

    const copyBtn = $('#copyShare');
    console.log('2. Copy Button:', copyBtn ? '✅ Found' : '❌ Not found');

    const contactBtn = $('.contact-primary-cta');
    console.log('3. Contact Button:', contactBtn ? '✅ Found' : '❌ Not found');

    const floatingNav = $('#floatingNav');
    console.log('4. Floating Nav:', floatingNav ? '✅ Found' : '❌ Not found');

    console.log('5. Keyboard Shortcuts:', window.keyboardShortcuts ? '✅ Enabled' : '❌ Disabled');

    console.log('\n💡 Try these keyboard shortcuts:');
    console.log('   / - Focus contact');
    console.log('   T - Toggle theme');
    console.log('   C - Copy URL');
    console.log('   ? - Toggle help');
    console.log('   ESC - Close menus');

    // Enable debug mode for keyboard shortcuts
    if (window.keyboardShortcuts) {
      window.keyboardShortcuts.debug = true;
      console.log('\n🔍 Keyboard debug mode enabled - check console when pressing keys');
    }
  };

  // Auto-test after page load
  setTimeout(() => {
    console.log('🚀 Website loaded! Type window.testFeatures() in console to test all features');
  }, 2000);
})();
