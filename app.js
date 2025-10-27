const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const INTERNAL_TRANSLATIONS = {
  de: {
    'cta.contact': 'Kontakt aufnehmen',
    'cta.cv': 'Lebenslauf herunterladen',
    'experience.expand': 'Alle öffnen',
    'experience.collapse': 'Alle schließen',
    'references.more': 'Mehr anzeigen',
    'references.less': 'Weniger anzeigen',
    'references.expand': 'Alle anzeigen',
    'references.collapse': 'Alle schließen',
    'contact.subtitle': 'Lass uns gemeinsam das nächste Wachstumskapitel gestalten.',
    'cta.send': 'Senden',
    'cta.email': 'E-Mail',
    'cta.linkedin': 'LinkedIn'
  }
};

const sanitize = (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : value);

const at = (obj, path) => {
  let cursor = obj;
  for (let i = 0; i < path.length; i += 1) {
    if (cursor === null || cursor === undefined) return undefined;
    cursor = cursor[path[i]];
  }
  return cursor;
};

const parseData = () => {
  const node = $('#page-data');
  if (!node) return null;
  try {
    return JSON.parse(node.textContent);
  } catch (error) {
    console.error('Failed to parse page data', error);
    return null;
  }
};

const createEl = (tag, options = {}) => {
  const el = document.createElement(tag);
  if (options.className) el.className = options.className;
  if (options.text !== undefined) el.textContent = options.text;
  if (options.html !== undefined) el.innerHTML = options.html;
  if (options.attrs) {
    Object.entries(options.attrs).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        el.setAttribute(key, value);
      }
    });
  }
  return el;
};

const resolveAsset = (token, assets) => {
  if (!token || typeof token !== 'string' || !token.startsWith('@')) return token;
  const path = token.slice(1).split('.');
  let cursor = assets;
  for (const segment of path) {
    if (!cursor || typeof cursor !== 'object') return '';
    cursor = cursor[segment];
  }
  return cursor || '';
};

const getVimeoId = (url = '') => {
  const match = url.match(/(\d{6,})/);
  return match ? match[1] : '';
};

const state = {
  data: null,
  assets: null,
  sections: {},
  navObserver: null,
  currentLang: 'en',
  referencesExpanded: false
};

const getTranslation = (path, fallback = '') => {
  const strings = at(state.data, ['i18n', 'strings']) || {};
  const builtIn = INTERNAL_TRANSLATIONS[state.currentLang] || {};
  const langStrings = strings[state.currentLang] || {};
  const value =
    (langStrings && Object.prototype.hasOwnProperty.call(langStrings, path) ? langStrings[path] : undefined) ??
    (Object.prototype.hasOwnProperty.call(builtIn, path) ? builtIn[path] : undefined) ??
    fallback;
  return sanitize(value);
};

const translateSkill = (skill) => getTranslation(`skill.${skill}`, skill);

const translateSectionTitle = (id, fallback) => getTranslation(`sections.${id}.title`, fallback);

const translateHeroText = (key, fallback) => getTranslation(`layout.hero.left.header_block.${key}`, fallback);

const translateAboutText = (index, fallback) =>
  getTranslation(`sections.about_and_skills.columns[1].text[${index}]`, fallback);

const renderLanguageSwitcher = () => {
  const slot = $('[data-slot="language-switcher"]');
  if (!slot) return;
  slot.innerHTML = '';
  const config = at(state.data, ['ui', 'language_switcher']);
  if (!config) return;
  const { available = [], default: def } = config;
  available.forEach((lang) => {
    const btn = createEl('button', {
      className: `btn-lang${lang === state.currentLang ? ' active' : ''}`,
      text: lang.toUpperCase(),
      attrs: { type: 'button', 'data-lang': lang }
    });
    btn.addEventListener('click', () => {
      if (lang === state.currentLang) return;
      state.currentLang = lang;
      document.documentElement.lang = lang;
      renderPage();
    });
    slot.appendChild(btn);
  });
  if (def && !state.currentLang) {
    state.currentLang = def;
  }
};

const renderHero = () => {
  const hero = at(state, ['data', 'layout', 'hero']);
  if (!hero) return;
  const headlineEl = $('[data-slot="hero-headline"]');
  const subheadlineEl = $('[data-slot="hero-subheadline"]');
  const heroGrid = $('.hero-grid');
  const mediaEl = $('[data-slot="hero-video"]');

  const heroHeadline =
    at(hero, ['header']) ||
    at(hero, ['left', 'headline']) ||
    '';
  const heroSubheadline =
    at(hero, ['subheader']) ||
    at(hero, ['left', 'subheadline']) ||
    '';

  if (headlineEl) headlineEl.textContent = translateHeroText('headline', heroHeadline);
  if (subheadlineEl) subheadlineEl.textContent = translateHeroText('subheadline', heroSubheadline);

  if (heroGrid) {
    const position = String(hero.video_position || '').toLowerCase();
    if (position === 'left') {
      heroGrid.classList.add('reverse');
    } else {
      heroGrid.classList.remove('reverse');
    }
  }

  if (mediaEl) {
    mediaEl.innerHTML = '';
    const videoUrl =
      at(hero, ['right', 'url']) ||
      at(hero, ['video_url']) ||
      at(hero, ['video']) ||
      '';
    const shouldLoop = Boolean(
      at(hero, ['right', 'loop']) ??
        at(hero, ['loop_video_right']) ??
        at(hero, ['loop']) ??
        false
    );
    const shouldAutoplay = Boolean(
      at(hero, ['right', 'autoplay']) ??
        at(hero, ['autoplay']) ??
        true
    );
    const shouldMute = Boolean(
      at(hero, ['right', 'muted']) ??
        at(hero, ['muted']) ??
        true
    );
    const vimeoId = getVimeoId(videoUrl);
    if (vimeoId) {
      const iframe = createEl('iframe', {
        attrs: {
          src: `https://player.vimeo.com/video/${vimeoId}?background=1&autoplay=${shouldAutoplay ? 1 : 0}&muted=${shouldMute ? 1 : 0}&loop=${shouldLoop ? 1 : 0}&playsinline=1`,
          allow: 'autoplay; fullscreen; picture-in-picture',
          loading: 'lazy',
          title: 'Hero video',
          frameborder: '0'
        }
      });
      mediaEl.appendChild(iframe);
    } else {
      mediaEl.appendChild(createEl('div', { className: 'hero-video-placeholder', text: 'Video unavailable' }));
    }
  }
};

const renderAboutAndSkills = () => {
  const slot = $('[data-slot="about-grid"]');
  const title = $('[data-slot="about-title"]');
  const section = state.sections.about_and_skills;
  if (!slot || !section) return;

  if (title) title.textContent = translateSectionTitle(section.id, section.title);

  slot.innerHTML = '';
  const ratio = at(section, ['layout', 'ratio']);
  if (Array.isArray(ratio) && ratio.length >= 3) {
    const firstCombined =
      (Number(ratio[0]) || 1) +
      (Number(ratio[1]) || 1);
    const template = `${firstCombined > 0 ? firstCombined : 2}fr ${Number(ratio[2]) > 0 ? Number(ratio[2]) : 1}fr`;
    slot.style.gridTemplateColumns = template;
  } else {
    slot.style.gridTemplateColumns = 'minmax(0, 2fr) minmax(0, 1fr)';
  }

  const columns = section.columns || [];
  const profileCol = columns.find((col) => col && col.component === 'profile_picture');
  const aboutCol = columns.find((col) => col && col.component === 'about');
  const skillsCol = columns.find((col) => col && col.component === 'skills');

  const summaryCard = createEl('article', { className: 'about-card about-summary' });
  const profileWrapper = createEl('div', { className: 'profile-wrapper' });
  const profileSrc = profileCol && resolveAsset(profileCol.src, state.assets);
  if (profileSrc) {
    profileWrapper.appendChild(
      createEl('img', {
        attrs: {
          src: profileSrc,
          alt: sanitize((profileCol && profileCol.alt) || 'Portrait'),
          loading: 'lazy'
        }
      })
    );
  }
  summaryCard.appendChild(profileWrapper);

  const aboutBody = createEl('div', { className: 'about-body' });
  const aboutTitle = getTranslation('sections.about_and_skills.columns[1].title', (aboutCol && aboutCol.title) || 'About');
  aboutBody.appendChild(createEl('h3', { text: aboutTitle }));
  const aboutText = (aboutCol && aboutCol.text) || [];
  aboutText.forEach((paragraph, textIndex) => {
    aboutBody.appendChild(createEl('p', { text: translateAboutText(textIndex, paragraph) }));
  });

  const skillsItems = (skillsCol && skillsCol.items) || [];
  if (skillsItems.length) {
    const list = createEl('div', { className: 'skill-list skill-list-inline' });
    skillsItems.forEach((skill) => {
      list.appendChild(createEl('span', { text: translateSkill(skill) }));
    });
    aboutBody.appendChild(list);
  }

  summaryCard.appendChild(aboutBody);
  slot.appendChild(summaryCard);
};

const buildMetaLine = (item) => {
  const parts = [item.dates, item.location, item.work_mode, item.employment_type].map(sanitize).filter(Boolean);
  return parts.join(' · ');
};

const renderExperience = () => {
  const slot = $('[data-slot="experience"]');
  const titleNode = $('[data-slot="experience-title"]');
  const section = state.sections.professional_experience;
  if (!slot || !section) return;
  if (titleNode) titleNode.textContent = translateSectionTitle(section.id, section.title);
  slot.innerHTML = '';

  const fragment = document.createDocumentFragment();
  (section.items || []).forEach((item) => {
    const card = createEl('article', { className: 'experience-card' });

    const header = createEl('header');
    const row = createEl('div', { className: 'd-flex flex-wrap gap-3 align-items-start' });
    const textWrap = createEl('div', { className: 'flex-grow-1' });
    textWrap.appendChild(createEl('h3', { text: `${sanitize(item.company)} — ${sanitize(item.role || '')}`.trim() }));
    const meta = buildMetaLine(item);
    if (meta) textWrap.appendChild(createEl('div', { className: 'experience-meta', text: meta }));
    row.appendChild(textWrap);

    const logoSrc = resolveAsset(item.logo, state.assets);
    if (logoSrc) {
      const logo = createEl('div', { className: 'experience-logo' });
      logo.appendChild(createEl('img', { attrs: { src: logoSrc, alt: `${sanitize(item.company)} logo`, loading: 'lazy' } }));
      row.appendChild(logo);
    }
    header.appendChild(row);
    card.appendChild(header);

    if (Array.isArray(item.skills) && item.skills.length) {
      const skillRow = createEl('div', { className: 'pill-group' });
      item.skills.forEach((skill) => skillRow.appendChild(createEl('span', { className: 'pill', text: translateSkill(skill) })));
      card.appendChild(skillRow);
    }

    const responsibilities = item.responsibilities || [];
    const keyResults = item.key_results || [];
    if (responsibilities.length || keyResults.length) {
      const details = createEl('details');
      const summary = createEl('summary', {
        html: '<i class="bi bi-caret-down-fill" aria-hidden="true"></i><span>Details</span>'
      });
      details.appendChild(summary);
      const wrapper = createEl('div', { className: 'details-list' });

      if (responsibilities.length) {
        const block = createEl('div');
        block.appendChild(createEl('h4', { text: 'Responsibilities' }));
        const list = createEl('ul');
        responsibilities.forEach((line) => list.appendChild(createEl('li', { text: sanitize(line) })));
        block.appendChild(list);
        wrapper.appendChild(block);
      }

      if (keyResults.length) {
        const block = createEl('div');
        block.appendChild(createEl('h4', { text: 'Key Results' }));
        const list = createEl('ul');
        keyResults.forEach((line) => list.appendChild(createEl('li', { text: sanitize(line) })));
        block.appendChild(list);
        wrapper.appendChild(block);
      }

      details.appendChild(wrapper);
      card.appendChild(details);
    } else if (item.note) {
      card.appendChild(createEl('p', { className: 'text-muted', text: sanitize(item.note) }));
    }

    fragment.appendChild(card);
  });

  slot.appendChild(fragment);

  const expandBtn = $('[data-action="experience-expand"]');
  const collapseBtn = $('[data-action="experience-collapse"]');
  const details = $$('details', slot);

  if (!hasOverflow && state.referencesExpanded) {
    state.referencesExpanded = false;
  }

  if (expandBtn) {
    expandBtn.innerHTML = `<i class="bi bi-arrows-expand"></i> ${getTranslation('experience.expand', 'Expand all')}`;
    expandBtn.onclick = () => details.forEach((detail) => (detail.open = true));
  }
  if (collapseBtn) {
    collapseBtn.innerHTML = `<i class="bi bi-arrows-collapse"></i> ${getTranslation('experience.collapse', 'Collapse all')}`;
    collapseBtn.onclick = () => details.forEach((detail) => (detail.open = false));
  }
};

const renderProjects = () => {
  const slot = $('[data-slot="projects"]');
  const titleNode = $('[data-slot="projects-title"]');
  const section = state.sections.key_projects;
  if (!slot || !section) return;
  if (titleNode) titleNode.textContent = translateSectionTitle(section.id, section.title);

  slot.innerHTML = '';
  const fragment = document.createDocumentFragment();
  (section.items || []).forEach((item) => {
    const card = createEl('article', { className: 'project-card' });
    const media = createEl('div', { className: 'project-media' });
    const vimeoId = getVimeoId(item.url);
    if (vimeoId) {
      const iframe = createEl('iframe', {
        attrs: {
          src: `https://player.vimeo.com/video/${vimeoId}?h=0&title=0&byline=0&portrait=0`,
          allow: 'autoplay; fullscreen; picture-in-picture',
          loading: 'lazy',
          title: sanitize(item.title || 'Project'),
          frameborder: '0'
        }
      });
      media.appendChild(iframe);
    } else {
      media.appendChild(createEl('div', { className: 'project-placeholder', text: 'Video unavailable' }));
    }
    card.appendChild(media);

    const body = createEl('div', { className: 'project-body' });
    body.appendChild(createEl('h3', { text: sanitize(item.title || 'Project') }));
    if (item.description) {
      body.appendChild(createEl('p', { text: sanitize(item.description) }));
    }
    card.appendChild(body);
    fragment.appendChild(card);
  });

  slot.appendChild(fragment);
};

const renderLeadership = () => {
  const slot = $('[data-slot="leadership"]');
  const title = $('[data-slot="leadership-title"]');
  const section = state.sections.leadership_philosophy;
  if (!slot || !section) return;
  if (title) title.textContent = translateSectionTitle(section.id, section.title);

  slot.innerHTML = '';
  const fragment = document.createDocumentFragment();
  (section.sections || []).forEach((item, index) => {
    const card = createEl('article', { className: 'leadership-card' });
    const iconSrc = resolveAsset(item.icon, state.assets);
    if (iconSrc) {
      card.appendChild(createEl('img', { attrs: { src: iconSrc, alt: sanitize(item.title || 'Leadership icon'), loading: 'lazy' } }));
    }
    const basePath = ['trust', 'safety', 'growth'][index] || index;
    card.appendChild(
      createEl('h3', {
        text: getTranslation(`leadership.${basePath}.title`, item.title || '')
      })
    );
    card.appendChild(
      createEl('p', {
        text: getTranslation(`leadership.${basePath}.text`, item.text || '')
      })
    );
    fragment.appendChild(card);
  });
  slot.appendChild(fragment);
};

const renderEducation = () => {
  const slot = $('[data-slot="education"]');
  const title = $('[data-slot="education-title"]');
  const section = state.sections.education;
  if (!slot || !section) return;
  if (title) title.textContent = translateSectionTitle(section.id, section.title);

  slot.innerHTML = '';
  const groups = Array.isArray(section.groups) ? section.groups : null;

  if (!groups || !groups.length) {
    const fragment = document.createDocumentFragment();
    (section.items || []).forEach((item, index) => {
      const card = createEl('article', { className: 'education-card' });
      const logo = resolveAsset(item.logo, state.assets);
      if (logo) {
        card.appendChild(createEl('img', { attrs: { src: logo, alt: sanitize(item.institution || 'Institution'), loading: 'lazy' } }));
      } else {
        card.appendChild(createEl('div'));
      }
      const body = createEl('div');
      const degreeKey =
        index === 0
          ? 'education.DSHS.MS.degree'
          : index === 1
          ? 'education.DSHS.BA.degree'
          : undefined;
      body.appendChild(createEl('h3', { text: sanitize(item.institution || 'Institution') }));
      if (item.degree) {
        body.appendChild(
          createEl('div', { className: 'details', text: getTranslation(degreeKey || '', item.degree) })
        );
      }
      if (item.dates) body.appendChild(createEl('div', { className: 'details', text: sanitize(item.dates) }));
      if (item.thesis) body.appendChild(createEl('div', { className: 'details', text: sanitize(item.thesis) }));
      card.appendChild(body);
      fragment.appendChild(card);
    });
    slot.appendChild(fragment);
    const legacyPublication = state.sections.publications;
    if (legacyPublication) {
      renderPublicationGroup(legacyPublication);
    }
    const legacyAwards = state.sections.awards;
    if (legacyAwards) {
      renderAwardsGroup(legacyAwards);
    }
    return;
  }

  const educationGroup = groups.find((group) => (group.group_title || '').toLowerCase().includes('education')) || groups[0];
  const publicationGroup = groups.find((group) => (group.group_title || '').toLowerCase().includes('publication'));
  const awardsGroup = groups.find((group) => (group.group_title || '').toLowerCase().includes('award'));

  const fragment = document.createDocumentFragment();
  const educationItems = (educationGroup && educationGroup.items) || [];
  educationItems.forEach((item, index) => {
    const card = createEl('article', { className: 'education-card' });
    const logo = resolveAsset(item.logo, state.assets);
    if (logo) {
      card.appendChild(createEl('img', { attrs: { src: logo, alt: sanitize(item.institution || 'Institution'), loading: 'lazy' } }));
    } else {
      card.appendChild(createEl('div'));
    }
    const body = createEl('div');
    const degreeKey =
      index === 0
        ? 'education.DSHS.MS.degree'
        : index === 1
        ? 'education.DSHS.BA.degree'
        : undefined;
    body.appendChild(createEl('h3', { text: sanitize(item.institution || 'Institution') }));
    if (item.degree) {
      body.appendChild(
        createEl('div', { className: 'details', text: getTranslation(degreeKey || '', item.degree) })
      );
    }
    if (item.dates) body.appendChild(createEl('div', { className: 'details', text: sanitize(item.dates) }));
    if (item.thesis) body.appendChild(createEl('div', { className: 'details', text: sanitize(item.thesis) }));
    card.appendChild(body);
    fragment.appendChild(card);
  });
  slot.appendChild(fragment);

  renderPublicationGroup(publicationGroup);
  renderAwardsGroup(awardsGroup);
};

const renderPublicationGroup = (group) => {
  const slot = $('[data-slot="publications"]');
  const title = $('[data-slot="publications-title"]');
  if (!slot || !title) return;
  const groupTitle = (group && (group.group_title || group.title)) || 'Publication';
  title.textContent = getTranslation('education.group.publication', groupTitle);
  slot.innerHTML = '';
  const items = (group && group.items) || [];
  items.forEach((item) => {
    const card = createEl('article', { className: 'publication-card' });
    if (item.title) card.appendChild(createEl('h3', { text: sanitize(item.title) }));
    if (item.authors) card.appendChild(createEl('p', { text: sanitize(item.authors) }));
    if (item.journal) card.appendChild(createEl('p', { className: 'details', text: sanitize(item.journal) }));
    slot.appendChild(card);
  });
};

const renderAwardsGroup = (group) => {
  const slot = $('[data-slot="awards"]');
  const title = $('[data-slot="awards-title"]');
  if (!slot || !title) return;
  const groupTitle = (group && (group.group_title || group.title)) || 'Awards';
  title.textContent = getTranslation('education.group.awards', groupTitle);
  slot.innerHTML = '';
  const awardItems = (group && group.items) || [];
  awardItems.forEach((item) => {
    const card = createEl('article', { className: 'awards-card' });
    card.appendChild(createEl('h3', { text: sanitize(item.title || 'Award') }));
    if (item.issuer) card.appendChild(createEl('p', { text: sanitize(item.issuer) }));
    if (item.date) card.appendChild(createEl('p', { className: 'details', text: sanitize(item.date) }));
    slot.appendChild(card);
  });
};

const renderReferences = () => {
  const slot = $('[data-slot="references"]');
  const title = $('[data-slot="references-title"]');
  const section = state.sections.references;
  if (!slot || !section) return;
  if (title) title.textContent = translateSectionTitle(section.id, section.title);
  const expandBtn = $('[data-action="references-expand"]');
  const collapseBtn = $('[data-action="references-collapse"]');
  const limit = Number(slot.dataset.limit) || 3;
  const items = section.items || [];
  const hasOverflow = items.length > limit;
  if (expandBtn) {
    expandBtn.classList.toggle('d-none', !hasOverflow);
    expandBtn.innerHTML = `<i class="bi bi-arrows-expand"></i> ${getTranslation('references.expand', 'Expand all')}`;
    expandBtn.disabled = state.referencesExpanded;
    expandBtn.onclick = () => {
      if (state.referencesExpanded) return;
      state.referencesExpanded = true;
      renderReferences();
    };
  }
  if (collapseBtn) {
    collapseBtn.classList.toggle('d-none', !hasOverflow);
    collapseBtn.innerHTML = `<i class="bi bi-arrows-collapse"></i> ${getTranslation('references.collapse', 'Collapse all')}`;
    collapseBtn.disabled = !state.referencesExpanded;
    collapseBtn.onclick = () => {
      if (!state.referencesExpanded) return;
      state.referencesExpanded = false;
      renderReferences();
    };
  }

  slot.innerHTML = '';
  items.forEach((item, index) => {
    const card = createEl('article', { className: 'reference-card' });
    if (!state.referencesExpanded && index >= limit) {
      card.style.display = 'none';
    }

    const header = createEl('header');
    header.appendChild(createEl('h3', { text: sanitize(item.name) }));
    if (item.title) header.appendChild(createEl('span', { text: sanitize(item.title) }));
    if (item.date) header.appendChild(createEl('span', { className: 'relationship', text: sanitize(item.date) }));
    if (item.relationship) header.appendChild(createEl('span', { className: 'relationship', text: sanitize(item.relationship) }));
    card.appendChild(header);

    if (item.text) card.appendChild(createEl('blockquote', { text: sanitize(item.text) }));

    slot.appendChild(card);
  });

};

const renderDownloads = () => {
  const slot = $('[data-slot="downloads"]');
  const title = $('[data-slot="downloads-title"]');
  const section = state.sections.downloads;
  if (!slot || !section) return;
  if (title) title.textContent = translateSectionTitle(section.id, section.title);

  slot.innerHTML = '';
  (section.items || []).forEach((item) => {
    const card = createEl('article', { className: 'download-card' });
    const preview = resolveAsset(item.preview_src, state.assets);
    if (preview) {
      card.appendChild(createEl('img', { attrs: { src: preview, alt: sanitize(item.label || 'Download preview'), loading: 'lazy' } }));
    }
    if (item.label) {
      card.appendChild(createEl('h3', { text: sanitize(item.label) }));
    }
    if (item.download_url) {
      card.appendChild(
        createEl('a', { className: 'btn btn-primary', text: 'Download', attrs: { href: item.download_url, download: '' } })
      );
    } else {
      card.appendChild(createEl('p', { className: 'text-muted', text: 'Available on request.' }));
    }
    slot.appendChild(card);
  });
};

const updateNavLabels = () => {
  const anchors = $$('.nav-links a');
  anchors.forEach((anchor) => {
    const href = anchor.getAttribute('href');
    const id = href && href.charAt(0) === '#' ? href.slice(1) : '';
    if (!id) return;
    const section = state.sections[id];
    if (section) {
      anchor.textContent = translateSectionTitle(id, section.title || anchor.textContent);
    }
  });
};

const applyStaticTranslations = () => {
  $$('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    el.textContent = getTranslation(key, el.textContent);
  });

  const contactTitle = $('[data-slot="contact-title"]');
  if (contactTitle) {
    contactTitle.textContent = translateSectionTitle('contact', contactTitle.textContent);
  }

  const contactSubtitle = $('[data-slot="contact-subtitle"]');
  if (contactSubtitle) {
    contactSubtitle.textContent = getTranslation('contact.subtitle', contactSubtitle.textContent);
  }
};

const initNavHighlight = () => {
  const links = $$('.nav-links a');
  if (!links.length) return;
  if (state.navObserver) {
    state.navObserver.disconnect();
  }

  const sections = links
    .map((link) => {
    const href = link.getAttribute('href');
    if (!href || href.charAt(0) !== '#') return null;
    const section = $(href);
    return section ? { link, section } : null;
  })
  .filter(Boolean);

  if (!sections.length) return;

  let activeLink = sections[0].link;
  activeLink.classList.add('active');

  const setActive = (target) => {
    if (activeLink === target) return;
    activeLink.classList.remove('active');
    target.classList.add('active');
    activeLink = target;
  };

  state.navObserver = new IntersectionObserver(
    (entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        .forEach((entry) => {
          const match = sections.find((item) => item.section === entry.target);
          if (match) setActive(match.link);
        });
    },
    {
      rootMargin: '-45% 0px -45% 0px',
      threshold: [0.25, 0.5, 0.75]
    }
  );

  sections.forEach((item) => state.navObserver.observe(item.section));
};

const initNavToggle = () => {
  const toggle = $('.nav-toggle');
  const links = $('.nav-links');
  if (!toggle || !links) return;
  toggle.onclick = () => {
    const isOpen = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  };
  links.onclick = (event) => {
    if (event.target.tagName === 'A') {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  };
};

const updateYear = () => {
  const node = $('#year');
  if (node) node.textContent = String(new Date().getFullYear());
};

const renderPage = () => {
  document.documentElement.lang = state.currentLang;
  renderLanguageSwitcher();
  renderHero();
  renderAboutAndSkills();
  renderExperience();
  renderProjects();
  renderLeadership();
  renderEducation();
  renderReferences();
  renderDownloads();
  updateNavLabels();
  applyStaticTranslations();
  initNavHighlight();
  initNavToggle();
  updateYear();
};

document.addEventListener('DOMContentLoaded', () => {
  const data = parseData();
  if (!data) return;
  state.data = data;
  state.assets = data.assets || {};
  state.sections = {};
  (data.sections || []).forEach((section) => {
    if (section && section.id) {
      state.sections[section.id] = section;
    }
  });
  const defaultLang =
    at(data, ['ui', 'language_switcher', 'default']) ||
    at(data, ['meta', 'language']) ||
    'en';
  state.currentLang = defaultLang;
  renderPage();
});
