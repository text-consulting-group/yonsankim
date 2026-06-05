(() => {
  const root = document.querySelector(".facwa-search-page");
  if (!root) return;

  const form = document.getElementById("facwa-search-form");
  const input = document.getElementById("search-query");
  const resultsEl = document.getElementById("search-results");
  const statusEl = document.getElementById("facwa-search-status");
  const activeFiltersEl = document.getElementById("facwa-active-filters");
  const paginationEl = document.getElementById("facwa-pagination");
  const filtersEl = document.getElementById("facwa-search-filters");
  const viewButtons = Array.from(document.querySelectorAll(".facwa-view-buttons [data-view]"));
  const filterToggle = document.getElementById("facwa-filter-toggle");
  const resetButton = document.getElementById("facwa-filter-reset");
  const clearButton = document.getElementById("facwa-search-clear");
  const template = document.getElementById("search-result-template");
  const facetGroups = Array.from(document.querySelectorAll(".facwa-dynamic-facet")).map((el) => ({
    el,
    key: el.dataset.facetGroup,
    label: el.dataset.facetLabel || el.dataset.facetGroup,
    limit: Number(el.dataset.facetLimit || 10),
  }));
  const jsonURL = root.dataset.searchJson || "/search/index.json";
  const pageSize = 12;

  let page = 1;
  let searchIndexPromise;
  let debounceTimer;
  let selectedFacets = new Map();
  let viewMode = "list";
  let currentResults = [];
  let currentTotal = 0;

  const asArray = (value) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

  const splitFacetValue = (value) => String(value)
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const textValue = (value) => asArray(value).filter(Boolean).join(", ");

  const normaliseFacetValue = (value) => String(value).trim();

  const escapeHTML = (value) => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const inferMediaType = (item) => {
    const source = textValue(item.media_type || item.components || item.permalink).toLowerCase();
    if (/\.(jpe?g|png|gif|webp|avif)(\?|$)/.test(source)) return "image";
    if (/\.(mp4|m4v|mov|webm)(\?|$)/.test(source)) return "video";
    if (/\.(mp3|wav|m4a|ogg)(\?|$)/.test(source)) return "audio";
    if (/\.pdf(\?|$)/.test(source)) return "pdf";
    return "";
  };

  const yearValues = (item) => {
    const rawDates = asArray(item.date);
    const years = rawDates
      .flatMap((date) => String(date).match(/\b(18|19|20)\d{2}\b/g) || [])
      .map(normaliseFacetValue);
    return Array.from(new Set(years));
  };

  const facetValues = (item, key) => {
    if (key === "year") {
      return yearValues(item);
    }
    if (key === "media_type") {
      return splitFacetValue(item.media_type || inferMediaType(item));
    }
    return asArray(item[key]).flatMap(splitFacetValue);
  };

  const selectedEntries = () => {
    const entries = [];
    selectedFacets.forEach((values, key) => {
      values.forEach((value) => entries.push({ key, value }));
    });
    return entries;
  };

  const normaliseResult = (item) => {
    const metadata = item.metadata || item;
    const components = metadata.components || [];
    const thumbnail = metadata.thumbnail || metadata.image || metadata.media_thumbnail || "";
    const image = thumbnail || (Array.isArray(components) ? components[0] : components);
    const category = metadata.level__rg || metadata.category || metadata.sources || metadata.subjects || "카테고리";

    return {
      title: metadata.title || item.title || "제목 없음",
      description: metadata.description || metadata.snippet || metadata.contents || item.text || "",
      permalink: metadata.permalink || metadata.url || metadata.path || "#",
      category: textValue(category) || "카테고리",
      date: metadata.date || metadata.created_at || "",
      image,
      score: item.score || 0,
    };
  };

  const collectSelectedFacets = () => {
    selectedFacets = new Map();
    filtersEl.querySelectorAll("input[data-facet-key]:checked").forEach((checkbox) => {
      const key = checkbox.dataset.facetKey;
      const value = checkbox.value;
      if (!selectedFacets.has(key)) selectedFacets.set(key, new Set());
      selectedFacets.get(key).add(value);
    });
  };

  const renderChips = (query) => {
    const chips = [];
    if (query) {
      chips.push(`
        <button type="button" class="facwa-filter-chip" data-chip-type="query" aria-label="${escapeHTML(query)} 검색어 지우기">
          <span>${escapeHTML(query)}</span>
          <i aria-hidden="true">×</i>
        </button>
      `);
    }
    selectedEntries().slice(0, 16).forEach(({ key, value }) => {
      chips.push(`
        <button type="button" class="facwa-filter-chip" data-chip-type="facet" data-facet-key="${escapeHTML(key)}" data-facet-value="${escapeHTML(value)}" aria-label="${escapeHTML(value)} 필터 지우기">
          <span>${escapeHTML(value)}</span>
          <i aria-hidden="true">×</i>
        </button>
      `);
    });
    activeFiltersEl.innerHTML = chips.join("");
  };

  const setStatus = (message) => {
    statusEl.textContent = message;
    statusEl.hidden = !message;
  };

  const fetchIndex = async () => {
    searchIndexPromise ||= fetch(jsonURL).then((response) => {
      if (!response.ok) throw new Error(`Cannot load search index: ${response.status}`);
      return response.json();
    });
    return searchIndexPromise;
  };

  const scoreItem = (item, terms) => {
    if (!terms.length) return 1;

    const title = textValue(item.title).toLowerCase();
    const fields = [
      item.title,
      item.description,
      item.contents,
      item.tags,
      item.subjects,
      item.creators,
      item.venues,
      item.sources,
      item.level__rg,
      item.level__series,
    ].flat().filter(Boolean).join(" ").toLowerCase();

    let score = 0;
    for (const term of terms) {
      if (title.includes(term)) score += 5;
      if (fields.includes(term)) score += 1;
    }
    return score;
  };

  const matchesSelectedFacets = (item, exceptKey) => {
    for (const [key, values] of selectedFacets.entries()) {
      if (key === exceptKey || !values.size) continue;
      const itemValues = facetValues(item, key).map(normaliseFacetValue);
      if (!itemValues.some((value) => values.has(value))) return false;
    }
    return true;
  };

  const countFacetValues = (scoredItems, key) => {
    const counts = new Map();
    scoredItems.forEach(({ item }) => {
      if (!matchesSelectedFacets(item, key)) return;
      facetValues(item, key).forEach((rawValue) => {
        const value = normaliseFacetValue(rawValue);
        if (!value) return;
        counts.set(value, (counts.get(value) || 0) + 1);
      });
    });
    return counts;
  };

  const renderFacetGroups = (scoredItems) => {
    facetGroups.forEach(({ el, key, label, limit }) => {
      const counts = countFacetValues(scoredItems, key);
      const selected = selectedFacets.get(key) || new Set();
      const options = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
        .slice(0, limit);

      selected.forEach((value) => {
        if (!counts.has(value)) options.push([value, 0]);
      });

      if (!options.length) {
        el.innerHTML = `<h2>${label}</h2><p class="facwa-filter-empty">선택할 필터가 없습니다.</p>`;
        return;
      }

      const rows = options.map(([value, count]) => {
        const checked = selected.has(value) ? "checked" : "";
        const disabled = count === 0 && !selected.has(value) ? "disabled" : "";
        const escapedValue = escapeHTML(value);
        return `
          <label class="facwa-check-row facwa-facet-row">
            <input type="checkbox" data-facet-key="${key}" value="${escapedValue}" ${checked} ${disabled}>
            <span>${escapedValue}</span>
            <em>${count}</em>
          </label>
        `;
      }).join("");

      el.innerHTML = `<h2>${label}</h2><div class="facwa-facet-list">${rows}</div>`;
    });
  };

  const renderResults = (items, total) => {
    currentResults = items;
    currentTotal = total || items.length;
    resultsEl.innerHTML = "";
    resultsEl.classList.toggle("is-thumbnail-view", viewMode === "thumbnail");
    resultsEl.classList.toggle("is-list-view", viewMode === "list");

    if (!items.length) {
      setStatus("검색 결과가 없습니다.");
      paginationEl.innerHTML = "";
      return;
    }

    setStatus(`${total || items.length}개 결과를 찾았습니다.`);
    const fragment = document.createDocumentFragment();

    items.forEach((item) => {
      const result = normaliseResult(item);
      const node = template.content.firstElementChild.cloneNode(true);
      const linkEls = node.querySelectorAll(".search_link");
      const titleEl = node.querySelector(".search_title");
      const descriptionEl = node.querySelector(".search_description");
      const categoryEl = node.querySelector(".search_category");
      const dateEl = node.querySelector(".search_date");
      const thumbEl = node.querySelector(".facwa-result-card__thumb");
      const imageEl = node.querySelector(".search_image");

      linkEls.forEach((link) => {
        link.href = result.permalink;
      });
      titleEl.textContent = result.title;
      descriptionEl.textContent = result.description || "설명 정보가 없습니다.";
      categoryEl.textContent = result.category;
      dateEl.textContent = result.date;

      if (result.image) {
        imageEl.src = result.image;
        imageEl.alt = result.title;
        thumbEl.hidden = false;
        node.classList.remove("has-no-image");
      } else if (viewMode === "thumbnail") {
        imageEl.removeAttribute("src");
        imageEl.alt = "";
        thumbEl.hidden = false;
        node.classList.add("has-no-image");
      }

      fragment.appendChild(node);
    });

    resultsEl.appendChild(fragment);
  };

  const renderPagination = (total) => {
    const pages = Math.max(1, Math.ceil(total / pageSize));

    if (pages <= 1) {
      paginationEl.innerHTML = "";
      return;
    }

    const buttons = [];
    const windowSize = 5;
    const start = Math.max(1, Math.min(page - 2, pages - windowSize + 1));
    const end = Math.min(pages, start + windowSize - 1);

    buttons.push(`<button type="button" data-page="${Math.max(1, page - 1)}" ${page === 1 ? "disabled" : ""}>‹</button>`);
    for (let i = start; i <= end; i += 1) {
      buttons.push(`<button type="button" data-page="${i}" ${i === page ? "class=\"is-active\"" : ""}>${i}</button>`);
    }
    buttons.push(`<button type="button" data-page="${Math.min(pages, page + 1)}" ${page === pages ? "disabled" : ""}>›</button>`);
    paginationEl.innerHTML = buttons.join("");
  };

  const runLocalSearch = async (query) => {
    const index = await fetchIndex();
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const scoredByQuery = index
      .map((item) => ({ item, score: scoreItem(item, terms) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    renderFacetGroups(scoredByQuery);
    collectSelectedFacets();

    const filtered = scoredByQuery.filter(({ item }) => matchesSelectedFacets(item));
    const total = filtered.length;
    const results = filtered
      .slice((page - 1) * pageSize, page * pageSize)
      .map(({ item, score }) => ({ ...item, score }));

    return { results, total };
  };

  const search = async () => {
    const query = input.value.trim();
    collectSelectedFacets();
    renderChips(query);
    setStatus("검색 중입니다.");

    try {
      const payload = await runLocalSearch(query);
      renderChips(query);
      renderResults(payload.results, payload.total);
      renderPagination(payload.total);
    } catch (error) {
      setStatus("검색 인덱스를 불러오지 못했습니다.");
      resultsEl.innerHTML = "";
      paginationEl.innerHTML = "";
    }
  };

  const scheduleSearch = () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      page = 1;
      search();
    }, 180);
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    page = 1;
    search();
  });

  input.addEventListener("input", scheduleSearch);
  filtersEl.addEventListener("change", (event) => {
    if (!event.target.matches("input[data-facet-key]")) return;
    collectSelectedFacets();
    scheduleSearch();
  });
  resetButton.addEventListener("click", () => {
    selectedFacets = new Map();
    filtersEl.querySelectorAll("input[data-facet-key]").forEach((checkbox) => {
      checkbox.checked = false;
    });
    scheduleSearch();
  });
  clearButton.addEventListener("click", () => {
    input.value = "";
    selectedFacets = new Map();
    filtersEl.querySelectorAll("input[data-facet-key]").forEach((checkbox) => {
      checkbox.checked = false;
    });
    input.focus();
    scheduleSearch();
  });
  activeFiltersEl.addEventListener("click", (event) => {
    const chip = event.target.closest(".facwa-filter-chip");
    if (!chip) return;

    if (chip.dataset.chipType === "query") {
      input.value = "";
      input.focus();
      scheduleSearch();
      return;
    }

    if (chip.dataset.chipType === "facet") {
      const key = chip.dataset.facetKey;
      const value = chip.dataset.facetValue;
      filtersEl.querySelectorAll("input[data-facet-key]").forEach((checkbox) => {
        if (checkbox.dataset.facetKey === key && checkbox.value === value) {
          checkbox.checked = false;
        }
      });
      collectSelectedFacets();
      scheduleSearch();
    }
  });
  if (filterToggle) {
    filterToggle.addEventListener("click", () => {
      const isOpen = filtersEl.classList.toggle("is-open");
      filterToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }
  paginationEl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-page]");
    if (!button) return;
    page = Number(button.dataset.page);
    search();
  });
  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      viewMode = button.dataset.view || "list";
      viewButtons.forEach((viewButton) => {
        const isActive = viewButton === button;
        viewButton.classList.toggle("is-active", isActive);
        viewButton.setAttribute("aria-pressed", String(isActive));
      });
      renderResults(currentResults, currentTotal);
    });
  });

  const initialQuery = new URLSearchParams(window.location.search).get("q") || "";
  input.value = initialQuery;
  search();
})();
