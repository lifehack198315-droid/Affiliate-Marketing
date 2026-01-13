const state = {
  data: null,
  filtered: [],
  category: "all",
  query: ""
};

const $ = (sel) => document.querySelector(sel);

function esc(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[m]));
}

function ratingStars(rating) {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  const full = Math.floor(r);
  const half = (r - full) >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty);
}

function applyFilters() {
  const products = state.data?.products ?? [];
  const q = state.query.trim().toLowerCase();

  state.filtered = products.filter(p => {
    const matchesCategory = state.category === "all" || p.category === state.category;

    const haystack = [
      p.title, p.summary, p.badge, p.price, p.category
    ].join(" ").toLowerCase();

    const matchesQuery = !q || haystack.includes(q);
    return matchesCategory && matchesQuery;
  });

  render();
}

function render() {
  const brand = state.data?.site?.brand ?? "Affiliate Store";
  const tagline = state.data?.site?.tagline ?? "";
  const disclaimer = state.data?.site?.disclaimer ?? "";
  const categories = state.data?.categories ?? [];

  // Optional elements if your index.html includes them
  const brandEl = $("#brandName");
  const taglineEl = $("#tagline");
  const disclaimerEl = $("#disclaimer");
  const gridEl = $("#grid");
  const countEl = $("#resultCount");
  const catEl = $("#categorySelect");

  if (brandEl) brandEl.textContent = brand;
  if (taglineEl) taglineEl.textContent = tagline;
  if (disclaimerEl) disclaimerEl.textContent = disclaimer;

  if (catEl && catEl.options.length <= 1) {
    // Populate categories once
    categories.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      catEl.appendChild(opt);
    });
  }

  const items = state.filtered;
  if (countEl) countEl.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;

  if (!gridEl) return;

  if (!items.length) {
    gridEl.innerHTML = `
      <div class="card" style="grid-column: span 12; padding: 18px;">
        <div class="content">
          <h3 class="title">No matches found</h3>
          <p class="summary">Try a different category or search keyword.</p>
        </div>
      </div>
    `;
    return;
  }

  gridEl.innerHTML = items.map(p => `
    <article class="card">
      <div class="thumb">
        <img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy" />
        ${p.badge ? `<div class="badge">${esc(p.badge)}</div>` : ""}
      </div>
      <div class="content">
        <h3 class="title">${esc(p.title)}</h3>
        <div class="meta">
          <span>${esc(p.price || "")}</span>
          <span title="Rating">${ratingStars(p.rating)} <span class="small">${esc(p.rating)}</span></span>
        </div>
        <p class="summary">${esc(p.summary || "")}</p>
        <div class="cta">
          <a class="btn primary" href="${esc(p.affiliateUrl)}" target="_blank" rel="noopener noreferrer">
            View Deal
          </a>
          <button class="btn" data-copy="${esc(p.affiliateUrl)}" type="button">
            Copy Link
          </button>
        </div>
      </div>
    </article>
  `).join("");

  // Copy link buttons
  gridEl.querySelectorAll("button[data-copy]").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = "Copy Link"), 1200);
      } catch {
        // Fallback
        const ta = document.createElement("textarea");
        ta.value = btn.dataset.copy;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = "Copy Link"), 1200);
      }
    });
  });
}

async function init() {
  try {
    const res = await fetch("./data.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load data.json");
    state.data = await res.json();
    state.filtered = state.data.products ?? [];
    render();

    // Wire up UI if present
    const searchEl = $("#searchInput");
    const catEl = $("#categorySelect");

    if (searchEl) {
      searchEl.addEventListener("input", (e) => {
        state.query = e.target.value;
        applyFilters();
      });
    }

    if (catEl) {
      catEl.addEventListener("change", (e) => {
        state.category = e.target.value;
        applyFilters();
      });
    }

  } catch (err) {
    const gridEl = $("#grid");
    if (gridEl) {
      gridEl.innerHTML = `
        <div class="card" style="grid-column: span 12; padding: 18px;">
          <div class="content">
            <h3 class="title">Setup error</h3>
            <p class="summary">${esc(err.message)}</p>
            <p class="small">Make sure data.json is in the same folder as index.html.</p>
          </div>
        </div>
      `;
    }
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", init);
