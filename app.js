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

const translateSectionTitle = (id, fallback) => getTranslation(`sections.${id}.title`, fallback);

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const localizeValue = (source, key, fallback = undefined) => {
  if (!source) return fallback;
  const lang = state.currentLang || 'en';
  if (lang && lang !== 'en') {
    const langKey = `${key}_${lang}`;
    if (hasOwn(source, langKey)) {
      const value = source[langKey];
      if (value !== undefined && value !== null) return value;
    }
  }
  if (hasOwn(source, key)) {
    const value = source[key];
    if (value !== undefined && value !== null) return value;
  }
  return fallback;
};

const localizeArray = (source, key) => {
  const value = localizeValue(source, key);
  return Array.isArray(value) ? value : [];
};

const translateHeroText = (key, fallback) => {
  const hero = at(state, ['data', 'layout', 'hero']) || {};
  const headerBlock =
    at(hero, ['left', 'header_block']) ||
    at(hero, ['right', 'header_block']) ||
    {};
  const value =
    localizeValue(hero, key) ??
    localizeValue(headerBlock, key);
  return sanitize(value ?? fallback);
};

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
    localizeValue(hero, 'header') ??
    localizeValue(at(hero, ['left']) || {}, 'headline') ??
    localizeValue(at(hero, ['left', 'header_block']) || {}, 'headline') ??
    '';
  const heroSubheadline =
    localizeValue(hero, 'subheader') ??
    localizeValue(at(hero, ['left']) || {}, 'subheadline') ??
    localizeValue(at(hero, ['left', 'header_block']) || {}, 'subheadline') ??
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
    const videoConfig =
      at(hero, ['right', 'video']) ||
      at(hero, ['video']) ||
      {};
    const videoUrl =
      localizeValue(videoConfig, 'url') ||
      localizeValue(hero.right || {}, 'url') ||
      at(hero, ['video_url']) ||
      '';
    const shouldLoop = Boolean(
      localizeValue(videoConfig, 'loop') ??
        localizeValue(hero.right || {}, 'loop') ??
        at(hero, ['loop_video_right']) ??
        at(hero, ['loop']) ??
        false
    );
    const shouldAutoplay = Boolean(
      localizeValue(videoConfig, 'autoplay') ??
        localizeValue(hero.right || {}, 'autoplay') ??
        at(hero, ['autoplay']) ??
        true
    );
    const shouldMute = Boolean(
      localizeValue(videoConfig, 'muted') ??
        localizeValue(hero.right || {}, 'muted') ??
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
  const skillsSlot = $('[data-slot="about-skills"]');
  const title = $('[data-slot="about-title"]');
  const section =
    state.sections.about ||
    state.sections.about_and_skills;
  if (!slot || !section) return;

  if (title) {
    title.textContent = getTranslation('sections.about.title', 'About');
  }

  slot.innerHTML = '';
  if (skillsSlot) {
    skillsSlot.innerHTML = '';
    skillsSlot.style.display = '';
  }

  const columns = section.columns || [];
  const profileCol = columns.find((col) => col && col.component === 'profile_picture');
  const aboutCol = columns.find((col) => col && col.component === 'about');
  const skillsCol = columns.find((col) => col && col.component === 'skills');

  let hasPhoto = false;
  if (profileCol) {
    const profileSrc = resolveAsset(profileCol.src, state.assets);
    if (profileSrc) {
      const photo = createEl('div', { className: 'about-photo' });
      photo.appendChild(
        createEl('img', {
          attrs: {
            src: profileSrc,
            alt: sanitize(localizeValue(profileCol, 'alt', profileCol.alt || 'Portrait')),
            loading: 'lazy'
          }
        })
      );
      slot.appendChild(photo);
      hasPhoto = true;
    }
  }

  const aboutTextContainer = createEl('div', { className: 'about-text' });
  const aboutText = localizeArray(aboutCol || {}, 'text');
  aboutText.forEach((paragraph) => {
    aboutTextContainer.appendChild(createEl('p', { text: sanitize(paragraph) }));
  });
  slot.appendChild(aboutTextContainer);
  slot.classList.toggle('single-column', !hasPhoto);

  const skillsItems = localizeArray(skillsCol || {}, 'items');
  if (skillsSlot) {
    if (skillsItems.length) {
      skillsItems.forEach((skill) => {
        skillsSlot.appendChild(createEl('span', { text: sanitize(skill) }));
      });
    } else {
      skillsSlot.style.display = 'none';
    }
  }
};

const buildMetaLine = (item) => {
  const parts = [
    localizeValue(item, 'dates'),
    localizeValue(item, 'location'),
    localizeValue(item, 'work_mode'),
    localizeValue(item, 'employment_type')
  ]
    .map((value) => sanitize(value))
    .filter(Boolean);
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
    const company = sanitize(localizeValue(item, 'company', item.company || ''));
    const role = sanitize(localizeValue(item, 'role', item.role || ''));
    const titleParts = [company, role].filter(Boolean).join(' — ');
    textWrap.appendChild(createEl('h3', { text: titleParts || company || role }));
    const meta = buildMetaLine(item);
    if (meta) textWrap.appendChild(createEl('div', { className: 'experience-meta', text: meta }));
    row.appendChild(textWrap);

    const logoSrc = resolveAsset(item.logo, state.assets);
    if (logoSrc) {
      const logo = createEl('div', { className: 'experience-logo' });
      logo.appendChild(
        createEl('img', {
          attrs: { src: logoSrc, alt: `${company} logo`.trim(), loading: 'lazy' }
        })
      );
      row.appendChild(logo);
    }
    header.appendChild(row);
    card.appendChild(header);

    const localizedSkills = localizeArray(item, 'skills');
    if (localizedSkills.length) {
      const skillRow = createEl('div', { className: 'pill-group' });
      localizedSkills.forEach((skill) =>
        skillRow.appendChild(createEl('span', { className: 'pill', text: sanitize(skill) }))
      );
      card.appendChild(skillRow);
    }

    const responsibilities = localizeArray(item, 'responsibilities');
    const keyResults = localizeArray(item, 'key_results');
    if (responsibilities.length || keyResults.length) {
      const details = createEl('details');
      const summary = createEl('summary', {
        html: `<i class="bi bi-caret-down-fill" aria-hidden="true"></i><span>${sanitize(
          getTranslation('experience.details', 'Details')
        )}</span>`
      });
      details.appendChild(summary);
      const wrapper = createEl('div', { className: 'details-list' });

      if (responsibilities.length) {
        const block = createEl('div');
        block.appendChild(
          createEl('h4', { text: sanitize(getTranslation('experience.responsibilities', 'Responsibilities')) })
        );
        const list = createEl('ul');
        responsibilities.forEach((line) => list.appendChild(createEl('li', { text: sanitize(line) })));
        block.appendChild(list);
        wrapper.appendChild(block);
      }

      if (keyResults.length) {
        const block = createEl('div');
        block.appendChild(
          createEl('h4', { text: sanitize(getTranslation('experience.key_results', 'Key Results')) })
        );
        const list = createEl('ul');
        keyResults.forEach((line) => list.appendChild(createEl('li', { text: sanitize(line) })));
        block.appendChild(list);
        wrapper.appendChild(block);
      }

      details.appendChild(wrapper);
      card.appendChild(details);
    } else if (item.note || localizeValue(item, 'note')) {
      card.appendChild(
        createEl('p', { className: 'text-muted', text: sanitize(localizeValue(item, 'note', item.note || '')) })
      );
    }

    fragment.appendChild(card);
  });

  slot.appendChild(fragment);

  const expandBtn = $('[data-action="experience-expand"]');
  const collapseBtn = $('[data-action="experience-collapse"]');
  const details = $$('details', slot);

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
    const url = localizeValue(item, 'url', item.url);
    const vimeoId = getVimeoId(url);
    if (vimeoId) {
      const iframe = createEl('iframe', {
        attrs: {
          src: `https://player.vimeo.com/video/${vimeoId}?h=0&title=0&byline=0&portrait=0`,
          allow: 'autoplay; fullscreen; picture-in-picture',
          loading: 'lazy',
          title: sanitize(localizeValue(item, 'title', item.title || 'Project')),
          frameborder: '0'
        }
      });
      media.appendChild(iframe);
    } else {
      media.appendChild(
        createEl('div', {
          className: 'project-placeholder',
          text: getTranslation('projects.video_unavailable', 'Video unavailable')
        })
      );
    }
    card.appendChild(media);

    const body = createEl('div', { className: 'project-body' });
    body.appendChild(createEl('h3', { text: sanitize(localizeValue(item, 'title', item.title || 'Project')) }));
    const description = localizeValue(item, 'description', item.description);
    if (description) {
      body.appendChild(createEl('p', { text: sanitize(description) }));
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
  (section.sections || []).forEach((item) => {
    const card = createEl('article', { className: 'leadership-card' });
    const iconSrc = resolveAsset(item.icon, state.assets);
    if (iconSrc) {
      card.appendChild(
        createEl('img', {
          attrs: {
            src: iconSrc,
            alt: sanitize(localizeValue(item, 'title', item.title || 'Leadership icon')),
            loading: 'lazy'
          }
        })
      );
    }
    card.appendChild(
      createEl('h3', {
        text: sanitize(localizeValue(item, 'title', item.title || ''))
      })
    );
    card.appendChild(
      createEl('p', {
        text: sanitize(localizeValue(item, 'text', item.text || ''))
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
    (section.items || []).forEach((item) => {
      const card = createEl('article', { className: 'education-card' });
      const logo = resolveAsset(item.logo, state.assets);
      if (logo) {
        card.appendChild(
          createEl('img', {
            attrs: {
              src: logo,
              alt: sanitize(localizeValue(item, 'institution', item.institution || 'Institution')),
              loading: 'lazy'
            }
          })
        );
      } else {
        card.appendChild(createEl('div'));
      }
      const body = createEl('div');
      body.appendChild(
        createEl('h3', { text: sanitize(localizeValue(item, 'institution', item.institution || 'Institution')) })
      );
      const degree = localizeValue(item, 'degree', item.degree);
      if (degree) {
        body.appendChild(createEl('div', { className: 'details', text: sanitize(degree) }));
      }
      const dates = localizeValue(item, 'dates', item.dates);
      if (dates) body.appendChild(createEl('div', { className: 'details', text: sanitize(dates) }));
      const thesis = localizeValue(item, 'thesis', item.thesis);
      if (thesis) body.appendChild(createEl('div', { className: 'details', text: sanitize(thesis) }));
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

  const matchGroup = (group, keyword) =>
    (String(localizeValue(group, 'group_title', group.group_title || '')).toLowerCase().includes(keyword));

  const educationGroup = groups.find((group) => matchGroup(group, 'ausbildung') || matchGroup(group, 'education')) || groups[0];
  const publicationGroup = groups.find((group) => matchGroup(group, 'publikation') || matchGroup(group, 'publication'));
  const awardsGroup = groups.find((group) => matchGroup(group, 'auszeichnung') || matchGroup(group, 'award'));

  const fragment = document.createDocumentFragment();
  const educationItems = (educationGroup && educationGroup.items) || [];
  educationItems.forEach((item) => {
    const card = createEl('article', { className: 'education-card' });
    const logo = resolveAsset(item.logo, state.assets);
    if (logo) {
      card.appendChild(
        createEl('img', {
          attrs: {
            src: logo,
            alt: sanitize(localizeValue(item, 'institution', item.institution || 'Institution')),
            loading: 'lazy'
          }
        })
      );
    } else {
      card.appendChild(createEl('div'));
    }
    const body = createEl('div');
    body.appendChild(
      createEl('h3', { text: sanitize(localizeValue(item, 'institution', item.institution || 'Institution')) })
    );
    const degree = localizeValue(item, 'degree', item.degree);
    if (degree) {
      body.appendChild(createEl('div', { className: 'details', text: sanitize(degree) }));
    }
    const dates = localizeValue(item, 'dates', item.dates);
    if (dates) body.appendChild(createEl('div', { className: 'details', text: sanitize(dates) }));
    const thesis = localizeValue(item, 'thesis', item.thesis);
    if (thesis) body.appendChild(createEl('div', { className: 'details', text: sanitize(thesis) }));
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
  const defaultTitle = (group && (group.group_title || group.title)) || 'Publication';
  const localizedTitle = sanitize(localizeValue(group || {}, 'group_title', defaultTitle));
  title.textContent = getTranslation('education.group.publication', localizedTitle || defaultTitle);
  slot.innerHTML = '';
  const items = (group && group.items) || [];
  items.forEach((item) => {
    const card = createEl('article', { className: 'publication-card' });
    const titleText = localizeValue(item, 'title', item.title);
    if (titleText) card.appendChild(createEl('h3', { text: sanitize(titleText) }));
    const authors = localizeValue(item, 'authors', item.authors);
    if (authors) card.appendChild(createEl('p', { text: sanitize(authors) }));
    const journal = localizeValue(item, 'journal', item.journal);
    if (journal) card.appendChild(createEl('p', { className: 'details', text: sanitize(journal) }));
    const citation = localizeValue(item, 'volume_issue_pages_year', item.volume_issue_pages_year);
    if (citation) card.appendChild(createEl('p', { className: 'details', text: sanitize(citation) }));
    slot.appendChild(card);
  });
};

const renderAwardsGroup = (group) => {
  const slot = $('[data-slot="awards"]');
  const title = $('[data-slot="awards-title"]');
  if (!slot || !title) return;
  const defaultTitle = (group && (group.group_title || group.title)) || 'Awards';
  const localizedTitle = sanitize(localizeValue(group || {}, 'group_title', defaultTitle));
  title.textContent = getTranslation('education.group.awards', localizedTitle || defaultTitle);
  slot.innerHTML = '';
  const awardItems = (group && group.items) || [];
  awardItems.forEach((item) => {
    const card = createEl('article', { className: 'awards-card' });
    card.appendChild(
      createEl('h3', { text: sanitize(localizeValue(item, 'title', item.title || 'Award')) })
    );
    const issuer = localizeValue(item, 'issuer', item.issuer);
    if (issuer) card.appendChild(createEl('p', { text: sanitize(issuer) }));
    const date = localizeValue(item, 'date', item.date);
    if (date) card.appendChild(createEl('p', { className: 'details', text: sanitize(date) }));
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
    const titleText = localizeValue(item, 'title', item.title);
    if (titleText) header.appendChild(createEl('span', { text: sanitize(titleText) }));
    const date = localizeValue(item, 'date', item.date);
    if (date) header.appendChild(createEl('span', { className: 'relationship', text: sanitize(date) }));
    const relationship = localizeValue(item, 'relationship', item.relationship);
    if (relationship) {
      header.appendChild(createEl('span', { className: 'relationship', text: sanitize(relationship) }));
    }
    card.appendChild(header);

    const text = localizeValue(item, 'text', item.text);
    if (text) card.appendChild(createEl('blockquote', { text: sanitize(text) }));

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
      card.appendChild(
        createEl('img', {
          attrs: {
            src: preview,
            alt: sanitize(localizeValue(item, 'label', item.label || 'Download preview')),
            loading: 'lazy'
          }
        })
      );
    }
    const label = localizeValue(item, 'label', item.label);
    if (label) {
      card.appendChild(createEl('h3', { text: sanitize(label) }));
    }
    if (item.download_url) {
      card.appendChild(
        createEl('a', {
          className: 'btn btn-primary',
          text: getTranslation('downloads.cta', 'Download'),
          attrs: { href: item.download_url, download: '' }
        })
      );
    } else {
      card.appendChild(
        createEl('p', {
          className: 'text-muted',
          text: getTranslation('downloads.available_on_request', 'Available on request.')
        })
      );
    }
    slot.appendChild(card);
  });
};

const updateNavLabels = () => {
  const anchors = $$('.nav-links a');
  anchors.forEach((anchor) => {
    const navKey = anchor.getAttribute('data-nav');
    if (navKey) {
      anchor.textContent = getTranslation(`nav.${navKey}`, anchor.textContent);
      return;
    }
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
  if (state.sections.about_and_skills && !state.sections.about) {
    state.sections.about = {
      ...state.sections.about_and_skills,
      id: 'about',
      title: 'About'
    };
  }
  const defaultLang =
    at(data, ['ui', 'language_switcher', 'default']) ||
    at(data, ['meta', 'language']) ||
    'en';
  state.currentLang = defaultLang;
  renderPage();
});
