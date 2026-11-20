/**
 * ConvoCard v0.1 — UI Controller (`web/app.js`)
 * ---------------------------------------------------------------------------
 * Wires DOM events to `card-engine.js`. Kept intentionally clean and modular
 * so ChatGPT Astra can extend it with wallet connection, IPFS pinning, and
 * live Arc Testnet transactions in v0.2.
 */

import { generateCard, prepareArcRegistration } from './card-engine.js';

const SAMPLE_OCR_CONVERSATION = `User: I want my AI conversation history to be my business card.
Assistant: That's a strong concept — instead of a static resume, your real problem-solving sessions with AI become verifiable proof-of-thought.
User: Exactly. We're turning OCR'd chat transcripts + GitHub activity into an ERC-8004 AgentCard on Arc blockchain.
Assistant: On Arc Testnet (Chain ID 5042002), gas is paid in USDC and finality is sub-second. You can store the structured AgentCard JSON off-chain (e.g. IPFS) and register the tokenURI in the ERC-8004 Identity Registry.
User: Let's keep v0.1 super focused: TypeScript core, a simple web UI, and a clean registration prep flow.`;

const SAMPLE_REPOS = `https://github.com/popstarsai/convo-card`;

// Application state
const state = {
  currentCard: null,
  registrationPrep: null,
  activeView: 'card', // 'card' | 'json'
};

// DOM references
const els = {
  form: document.getElementById('card-form'),
  ocrHistory: document.getElementById('ocr-history'),
  ocrCharCount: document.getElementById('ocr-char-count'),
  founderName: document.getElementById('founder-name'),
  founderBio: document.getElementById('founder-bio'),
  githubRepos: document.getElementById('github-repos'),
  formError: document.getElementById('form-error'),
  loadSampleBtn: document.getElementById('load-sample-btn'),
  clearBtn: document.getElementById('clear-btn'),
  tabCard: document.getElementById('tab-card'),
  tabJson: document.getElementById('tab-json'),
  emptyState: document.getElementById('empty-state'),
  cardPreview: document.getElementById('card-preview'),
  jsonPreview: document.getElementById('json-preview'),
  jsonCode: document.getElementById('json-code'),
  cardAvatar: document.getElementById('card-avatar'),
  cardName: document.getElementById('card-name'),
  cardBio: document.getElementById('card-bio'),
  cardMetrics: document.getElementById('card-metrics'),
  cardTopics: document.getElementById('card-topics'),
  cardSkills: document.getElementById('card-skills'),
  cardSignals: document.getElementById('card-signals'),
  cardReposSection: document.getElementById('card-repos-section'),
  cardRepos: document.getElementById('card-repos'),
  copyJsonBtn: document.getElementById('copy-json-btn'),
  downloadJsonBtn: document.getElementById('download-json-btn'),
  registerArcBtn: document.getElementById('register-arc-btn'),
  arcPanel: document.getElementById('arc-panel'),
  closeArcBtn: document.getElementById('close-arc-btn'),
  arcDigest: document.getElementById('arc-digest'),
  arcCliCmd: document.getElementById('arc-cli-cmd'),
  copyPayloadBtn: document.getElementById('copy-payload-btn'),
  toast: document.getElementById('toast'),
};

let toastTimer = null;

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.hidden = true;
  }, 2400);
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function renderTagList(container, items, extraClass = '') {
  container.innerHTML = '';
  for (const item of items) {
    const span = document.createElement('span');
    span.className = `tag ${extraClass}`.trim();
    span.textContent = item;
    container.appendChild(span);
  }
}

function renderCard(card) {
  els.emptyState.hidden = true;
  els.cardAvatar.textContent = getInitials(card.name);
  els.cardName.textContent = card.name;
  els.cardBio.textContent = card.description;

  // Metrics strip
  els.cardMetrics.innerHTML = '';
  const metrics = [
    { label: 'Turns', value: card.proofOfThought.estimatedTurns },
    { label: 'Words', value: card.proofOfThought.wordCount },
    { label: 'Repos', value: card.repositories.length },
  ];
  for (const m of metrics) {
    const box = document.createElement('div');
    box.className = 'metric-box';
    box.innerHTML = `<span class="metric-value">${m.value}</span><span class="metric-label">${m.label}</span>`;
    els.cardMetrics.appendChild(box);
  }

  renderTagList(els.cardTopics, card.domains);
  renderTagList(els.cardSkills, card.capabilities, 'tag-skill');

  // Signals
  els.cardSignals.innerHTML = '';
  for (const signal of card.proofOfThought.highlights) {
    const li = document.createElement('li');
    li.textContent = signal;
    els.cardSignals.appendChild(li);
  }

  // GitHub repos
  if (card.repositories.length > 0) {
    els.cardReposSection.hidden = false;
    els.cardRepos.innerHTML = '';
    for (const repo of card.repositories) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = repo.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = repo.slug;
      li.appendChild(a);
      els.cardRepos.appendChild(li);
    }
  } else {
    els.cardReposSection.hidden = true;
  }

  // Raw JSON
  els.jsonCode.textContent = JSON.stringify(card, null, 2);

  setView(state.activeView);
}

function setView(view) {
  state.activeView = view;
  const hasCard = Boolean(state.currentCard);

  els.tabCard.classList.toggle('active', view === 'card');
  els.tabJson.classList.toggle('active', view === 'json');
  els.tabCard.setAttribute('aria-selected', String(view === 'card'));
  els.tabJson.setAttribute('aria-selected', String(view === 'json'));

  if (!hasCard) {
    els.cardPreview.hidden = true;
    els.jsonPreview.hidden = true;
    els.emptyState.hidden = false;
    return;
  }

  els.emptyState.hidden = true;
  els.cardPreview.hidden = view !== 'card';
  els.jsonPreview.hidden = view !== 'json';
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch {
    showToast('Copy failed — please copy manually from JSON view.');
  }
}

// Event Listeners
els.ocrHistory.addEventListener('input', () => {
  const len = els.ocrHistory.value.length;
  els.ocrCharCount.textContent = `${len.toLocaleString()} chars`;
  if (len > 0) els.formError.hidden = true;
});

els.loadSampleBtn.addEventListener('click', () => {
  els.ocrHistory.value = SAMPLE_OCR_CONVERSATION;
  els.founderName.value = 'Alex Rivera';
  els.founderBio.value = 'Founder turning AI conversation history into on-chain ERC-8004 identities.';
  els.githubRepos.value = SAMPLE_REPOS;
  els.ocrCharCount.textContent = `${SAMPLE_OCR_CONVERSATION.length.toLocaleString()} chars`;
  els.formError.hidden = true;
  showToast('Sample OCR conversation loaded.');
});

els.clearBtn.addEventListener('click', () => {
  els.form.reset();
  els.ocrCharCount.textContent = '0 chars';
  els.formError.hidden = true;
  state.currentCard = null;
  state.registrationPrep = null;
  els.arcPanel.hidden = true;
  setView('card');
});

els.form.addEventListener('submit', (event) => {
  event.preventDefault();
  const ocrHistory = els.ocrHistory.value.trim();

  if (!ocrHistory) {
    els.formError.textContent = 'Please paste some OCR’d conversation history first.';
    els.formError.hidden = false;
    els.ocrHistory.focus();
    return;
  }

  els.formError.hidden = true;
  els.arcPanel.hidden = true;

  const card = generateCard({
    name: els.founderName.value,
    bio: els.founderBio.value,
    ocrHistory,
    githubReposText: els.githubRepos.value,
  });

  state.currentCard = card;
  state.registrationPrep = null;
  renderCard(card);
  showToast('AgentCard generated.');
});

els.tabCard.addEventListener('click', () => setView('card'));
els.tabJson.addEventListener('click', () => setView('json'));

els.copyJsonBtn.addEventListener('click', () => {
  if (!state.currentCard) return;
  copyText(JSON.stringify(state.currentCard, null, 2), 'AgentCard JSON copied!');
});

els.downloadJsonBtn.addEventListener('click', () => {
  if (!state.currentCard) return;
  const blob = new Blob([JSON.stringify(state.currentCard, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'agent-card.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Downloaded agent-card.json');
});

els.registerArcBtn.addEventListener('click', async () => {
  if (!state.currentCard) return;
  const prep = await prepareArcRegistration(state.currentCard);
  state.registrationPrep = prep;
  els.arcDigest.textContent = prep.digest;
  els.arcCliCmd.textContent = prep.cliCommand;
  els.arcPanel.hidden = false;
  els.arcPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

els.closeArcBtn.addEventListener('click', () => {
  els.arcPanel.hidden = true;
});

els.copyPayloadBtn.addEventListener('click', () => {
  if (!state.registrationPrep) return;
  copyText(
    JSON.stringify(state.registrationPrep, null, 2),
    'Arc Testnet registration payload copied!'
  );
});
