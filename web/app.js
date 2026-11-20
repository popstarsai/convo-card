/**
 * ConvoCard v0.1 — UI Controller (`web/app.js`)
 * ---------------------------------------------------------------------------
 * Wires DOM events to `card-engine.js`. Kept intentionally clean and modular
 * so ChatGPT Astra can extend it with wallet connection, IPFS pinning, and
 * live Arc Testnet transactions in v0.2.
 */

import { createConversationInput, generateCard, prepareArcRegistration } from './card-engine.js';

const SAMPLE_OCR_CONVERSATION = `User: I want my AI conversation history to be my business card.
Assistant: That's a strong concept — instead of a static resume, your real problem-solving sessions with AI become verifiable proof-of-thought.
User: Exactly. We're turning OCR'd chat transcripts + GitHub activity into an ERC-8004 AgentCard on Arc blockchain.
Assistant: On Arc Testnet (Chain ID 5042002), gas is paid in USDC and finality is sub-second. You can store the structured AgentCard JSON off-chain (e.g. IPFS) and register the tokenURI in the ERC-8004 Identity Registry.
User: Let's keep v0.1 super focused: TypeScript core, a simple web UI, and a clean registration prep flow.`;

const SAMPLE_REPOS = `https://github.com/popstarsai/convo-card`;

// Application state
const state = {
  currentCard: null,
  currentInput: null,
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
  arcNetwork: document.getElementById('arc-network'),
  arcRegistry: document.getElementById('arc-registry'),
  arcRpc: document.getElementById('arc-rpc'),
  arcGas: document.getElementById('arc-gas'),
  arcError: document.getElementById('arc-error'),
  arcRegisterCmd: document.getElementById('arc-register-cmd'),
  downloadInputBtn: document.getElementById('download-input-btn'),
  downloadPrepBtn: document.getElementById('download-prep-btn'),
  arcCliCmd: document.getElementById('arc-cli-cmd'),
  copyPayloadBtn: document.getElementById('copy-payload-btn'),
  toast: document.getElementById('toast'),
};

let toastTimer = null;
let prepVersion = 0;

function resetPreparation() {
  prepVersion += 1; // Ignore any digest still computing for the previous card.
  state.registrationPrep = null;
  els.arcPanel.hidden = true;
  els.arcError.hidden = true;
  els.registerArcBtn.disabled = false;
  els.registerArcBtn.textContent = 'Prepare Arc Registration';
  els.registerArcBtn.setAttribute('aria-busy', 'false');
}

function invalidateCard() {
  state.currentCard = null;
  state.currentInput = null;
  resetPreparation();
  setView(state.activeView);
}

function downloadJson(value, filename) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`Downloaded ${filename}`);
}

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
    { label: 'Topics', value: card.keyTopics.length },
    { label: 'Skills', value: card.skills.length },
    { label: 'Repos', value: card.github.length },
  ];
  for (const m of metrics) {
    const box = document.createElement('div');
    box.className = 'metric-box';
    box.innerHTML = `<span class="metric-value">${m.value}</span><span class="metric-label">${m.label}</span>`;
    els.cardMetrics.appendChild(box);
  }

  renderTagList(els.cardTopics, card.keyTopics.length ? card.keyTopics : ['No topics detected']);
  renderTagList(els.cardSkills, card.skills.length ? card.skills : ['No skills detected'], 'tag-skill');

  // Signals
  els.cardSignals.innerHTML = '';
  for (const signal of [card.historySummary]) {
    const li = document.createElement('li');
    li.textContent = signal;
    els.cardSignals.appendChild(li);
  }

  // GitHub repos
  if (card.github.length > 0) {
    els.cardReposSection.hidden = false;
    els.cardRepos.innerHTML = '';
    for (const repo of card.github) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = repo;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = repo.replace('https://github.com/', '');
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

async function copyText(text, successMessage, failureMessage = 'Copy failed — use the JSON download instead.') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch {
    showToast(failureMessage);
  }
}

// Inputs and exports must always describe the same generated snapshot.
els.form.addEventListener('input', () => {
  if (state.currentCard) {
    invalidateCard();
    showToast('Inputs changed. Generate a new card to continue.');
  }
});

// Event Listeners
els.ocrHistory.addEventListener('input', () => {
  const len = els.ocrHistory.value.length;
  els.ocrCharCount.textContent = `${len.toLocaleString()} chars`;
  if (len > 0) els.formError.hidden = true;
});

els.loadSampleBtn.addEventListener('click', () => {
  invalidateCard();
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
  invalidateCard();
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
  resetPreparation();
  try {
    const input = createConversationInput({
      name: els.founderName.value,
      bio: els.founderBio.value,
      rawHistory: els.ocrHistory.value,
      githubReposText: els.githubRepos.value,
    });
    state.currentInput = input;
    state.currentCard = generateCard(input);
    renderCard(state.currentCard);
    showToast('Card preview generated. Nothing has been published.');
  } catch (error) {
    invalidateCard();
    els.formError.textContent = error.message || 'Could not generate the card.';
    els.formError.hidden = false;
  }
});

els.tabCard.addEventListener('click', () => setView('card'));
els.tabJson.addEventListener('click', () => setView('json'));

els.copyJsonBtn.addEventListener('click', () => {
  if (!state.currentCard) return;
  copyText(JSON.stringify(state.currentCard, null, 2), 'Card preview JSON copied!');
});

els.downloadJsonBtn.addEventListener('click', () => {
  if (state.currentCard) downloadJson(state.currentCard, 'agent-card-preview.json');
});

els.registerArcBtn.addEventListener('click', async () => {
  if (!state.currentCard || els.registerArcBtn.disabled) return;
  const card = state.currentCard;
  const version = ++prepVersion;
  state.registrationPrep = null;
  els.arcError.hidden = true;
  els.registerArcBtn.disabled = true;
  els.registerArcBtn.textContent = 'Preparing…';
  els.registerArcBtn.setAttribute('aria-busy', 'true');
  try {
    const prep = await prepareArcRegistration(card);
    if (version !== prepVersion || state.currentCard !== card) return;
    state.registrationPrep = prep;
    els.arcNetwork.textContent = `${prep.network.networkName} (Chain ID: ${prep.network.chainId})`;
    els.arcRegistry.textContent = prep.network.identityRegistryAddress;
    els.arcRpc.textContent = prep.network.rpcUrl;
    els.arcGas.textContent = `${prep.network.gasToken} (testnet)`;
    els.arcDigest.textContent = prep.checksum.value;
    els.arcCliCmd.textContent = prep.cli.dryRun;
    els.arcRegisterCmd.textContent = prep.cli.register;
    els.arcPanel.hidden = false;
    els.arcPanel.focus({ preventScroll: true });
    els.arcPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    if (version !== prepVersion) return;
    els.arcError.textContent = error.message || 'Preparation failed. Please try again.';
    els.arcError.hidden = false;
  } finally {
    if (version === prepVersion) {
      els.registerArcBtn.disabled = false;
      els.registerArcBtn.textContent = 'Prepare Arc Registration';
      els.registerArcBtn.setAttribute('aria-busy', 'false');
    }
  }
});

els.closeArcBtn.addEventListener('click', () => {
  resetPreparation();
  els.registerArcBtn.focus();
});

els.downloadInputBtn.addEventListener('click', () => {
  if (state.currentInput) downloadJson(state.currentInput, 'conversation-input.json');
});

els.downloadPrepBtn.addEventListener('click', () => {
  if (state.registrationPrep) downloadJson(state.registrationPrep, 'registration-prep.json');
});

els.copyPayloadBtn.addEventListener('click', () => {
  if (!state.registrationPrep) return;
  copyText(
    JSON.stringify(state.registrationPrep, null, 2),
    'Preparation copied. No transaction has been sent.',
    'Copy failed — use Download Preparation instead.'
  );
});

// TODO(astra): Add an explicit wallet-connect/sign action here. Keep preparation
// available offline, and render success only after a confirmed registry receipt.
