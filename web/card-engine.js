/**
 * ConvoCard v0.1 — zero-build browser adapter for the TypeScript core.
 * Input and preview fields mirror src/types.ts, processHistory.ts and generateCard.ts.
 * The CLI adds the authoritative Keccak-256 contentHash; browser SHA-256 is only
 * a checksum of the exported preview JSON, never an on-chain identity or CID.
 * TODO(v0.2): Share the core module once a browser build is introduced; keep the
 * parity tests until then. No external scripts are needed for this adapter.
 */

export const ARC_TESTNET_CONFIG = Object.freeze({
  chainId: 5042002,
  chainIdHex: '0x4cef52',
  networkName: 'Arc Testnet',
  rpcUrl: 'https://rpc.testnet.arc.io',
  gasToken: 'USDC',
  explorerUrl: 'https://explorer.testnet.arc.io',
  identityRegistryAddress: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
});

// Keep extraction order and limits aligned with src/processHistory.ts.
const TOPICS = [
  'ai agents', 'agentic', 'blockchain', 'solidity', 'rust', 'typescript',
  'react', 'next.js', 'smart contracts', 'defi', 'stablecoins', 'usdc',
  'arc', 'flare', 'ethereum', 'machine learning', 'llm', 'gemini',
  'chatgpt', 'rag', 'orchestration', 'microservices', 'api', 'security',
  'ownership', 'identity', 'reputation', 'erc-8004', 'github',
];
const SKILLS = [
  'typescript', 'javascript', 'python', 'rust', 'solidity', 'go',
  'react', 'next.js', 'node.js', 'viem', 'ethers', 'hardhat', 'foundry',
  'docker', 'kubernetes', 'aws', 'gcp', 'ai engineering', 'prompt engineering',
  'system design', 'smart contract development', 'agent development',
];

/** Normalize repository links for ConversationInput.githubRepos. */
export function parseGitHubRepos(rawReposText = '') {
  const repos = [];
  const seen = new Set();
  for (const line of rawReposText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)) {
    let url;
    try { url = new URL(line); } catch { /* Report the invalid input below. */ }
    const match = url?.pathname.match(/^\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_.-]+)\/?$/);
    if (!url || url.protocol !== 'https:' || url.hostname !== 'github.com'
      || url.username || url.password || url.port || url.search || url.hash || !match) {
      throw new Error('Use full GitHub repository URLs, such as https://github.com/owner/repo.');
    }
    const repo = match[2].replace(/\.git$/i, '');
    if (!repo || repo === '.' || repo === '..') throw new Error('Enter a valid GitHub repository name.');
    const normalized = `https://github.com/${match[1]}/${repo}`;
    if (!seen.has(normalized.toLowerCase())) {
      seen.add(normalized.toLowerCase());
      repos.push(normalized);
    }
  }
  return repos;
}

/** Form adapter. The result is accepted directly by the TypeScript CLI. */
export function createConversationInput({ name = '', bio = '', rawHistory = '', githubReposText = '' }) {
  if (typeof rawHistory !== 'string' || !rawHistory.trim()) {
    throw new Error('Please paste some conversation history first.');
  }
  return { name: name.trim(), bio: bio.trim(), rawHistory, githubRepos: parseGitHubRepos(githubReposText) };
}

/** Browser counterpart to src/processHistory.ts; extraction is local and rule-based. */
export function processHistory(input) {
  const cleanedText = (input.rawHistory || '')
    .replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
  const lower = cleanedText.toLowerCase();
  return {
    cleanedText,
    historySummary: cleanedText.length > 420 ? cleanedText.slice(0, 400).trim() + '...' : cleanedText,
    keyTopics: TOPICS.filter((topic) => lower.includes(topic)).slice(0, 12),
    skills: SKILLS.filter((skill) => lower.includes(skill)).slice(0, 15),
  };
}

/** AgentCard preview: same core fields as src/generateCard.ts, without contentHash. */
export function generateCard(input) {
  const processed = processHistory(input);
  const github = (input.githubRepos || []).map((g) => g.trim()).filter(Boolean);
  return {
    name: input.name?.trim() || 'Founder',
    description: input.bio?.trim() || 'Founder whose living resume is their real AI conversation history and work.',
    historySummary: processed.historySummary,
    keyTopics: processed.keyTopics,
    skills: processed.skills,
    github,
    // Legacy v0.1 source label, also used by the TypeScript core; no provider inference.
    source: github.length > 0 ? 'mixed' : 'gemini-history',
    version: '0.1',
    generatedAt: new Date().toISOString(),
    extra: { originalLength: input.rawHistory.length, cleanedLength: processed.cleanedText.length },
  };
}

/** SHA-256 of the exact pretty-printed preview download (including generatedAt). */
export async function computeCardDigest(card) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Preview checksums require HTTPS or localhost. Serve web with python3 -m http.server 8080 -d web.');
  }
  const bytes = new TextEncoder().encode(JSON.stringify(card, null, 2));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return '0x' + Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Local preparation only. No wallet, RPC call, upload or transaction happens here. */
export async function prepareArcRegistration(card) {
  if (!card?.name || !card?.historySummary || card.version !== '0.1') {
    throw new Error('Generate a card before preparing registration.');
  }
  // TODO(astra): Connect an EIP-1193 wallet on an explicit user action, request the
  // account, switch/check chain 5042002, and revalidate account/chain before signing.
  // Never collect a private key in this frontend.
  // TODO(v0.2): Pin the finalized registration metadata via an authenticated server
  // integration (no pinning secrets in /web), and use only the returned ipfs:// CID.
  // TODO(astra): After review, simulate and call IdentityRegistry.register(agentURI),
  // wait for a successful receipt, then read Registered from that receipt only.
  // Add registrations/agentId only after confirmation; see src/registerAgent.ts.
  return {
    status: 'prepared',
    submitted: false,
    network: ARC_TESTNET_CONFIG,
    checksum: { algorithm: 'SHA-256', scope: 'preview-json', value: await computeCardDigest(card) },
    cardPreview: card,
    metadataURI: null, // The CLI finalizes metadata as a real data URI; IPFS is optional later.
    cli: {
      inputFile: 'conversation-input.json',
      generate: 'npm run generate -- --input conversation-input.json',
      dryRun: 'npm run register -- --input conversation-input.json --dry-run',
      register: 'npm run register -- --input conversation-input.json',
    },
  };
}
