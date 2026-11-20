/**
 * ConvoCard v0.1 — Browser Card Engine
 * ---------------------------------------------------------------------------
 * Lightweight, zero-build browser adapter mirroring the core TypeScript
 * pipeline in `src/`:
 *   - `processHistory.ts` -> `processHistory()`
 *   - `generateCard.ts`   -> `generateCard()`
 *   - `registerAgent.ts`  -> `prepareArcRegistration()`
 *
 * TODO(astra): When adding a lightweight bundler (e.g. Vite) or build step,
 * you can import `processHistory` and `generateCard` directly from `../src/`
 * and replace `prepareArcRegistration` with real wallet + IPFS + ERC-8004
 * contract calls.
 */

export const ARC_TESTNET_CONFIG = {
  chainId: 5042002,
  chainIdHex: '0x4cef52',
  networkName: 'Arc Testnet',
  rpcUrl: 'https://rpc.testnet.arc.io',
  gasToken: 'USDC',
  // TODO(astra): Set the deployed ERC-8004 IdentityRegistry contract address on Arc Testnet
  identityRegistryAddress: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
};

const KNOWN_SKILLS = [
  'TypeScript', 'JavaScript', 'Solidity', 'Rust', 'Python', 'React', 'Next.js',
  'Node.js', 'Ethereum', 'Arc', 'ERC-8004', 'ERC-721', 'IPFS', 'Zero-Knowledge',
  'AI Agents', 'LLM', 'OCR', 'Smart Contracts', 'DeFi', 'USDC', 'GraphQL',
  'PostgreSQL', 'Docker', 'Viem', 'Wagmi', 'Ethers.js', 'Hardhat', 'Foundry',
];

const TOPIC_KEYWORDS = {
  'On-Chain Agent Identity': ['erc-8004', 'agentcard', 'identity', 'registry', 'did', 'reputation'],
  'Blockchain & Web3': ['arc', 'testnet', 'blockchain', 'wallet', 'smart contract', 'usdc', 'on-chain', 'onchain', 'gas'],
  'AI & LLM Workflows': ['prompt', 'llm', 'claude', 'chatgpt', 'agent', 'rag', 'embedding', 'ocr'],
  'Product & Founder Strategy': ['founder', 'mvp', 'roadmap', 'onboarding', 'user', 'launch', 'vision', 'business card'],
  'Full-Stack Engineering': ['typescript', 'frontend', 'backend', 'api', 'react', 'node', 'github', 'repo'],
  'Decentralized Storage': ['ipfs', 'cid', 'pinata', 'filecoin', 'metadata', 'tokenuri'],
};

/**
 * Parse GitHub repository URLs into normalized metadata objects.
 * @param {string} rawReposText
 * @returns {Array<{ url: string, owner: string, repo: string, slug: string }>}
 */
export function parseGitHubRepos(rawReposText = '') {
  const lines = rawReposText
    .split(/[\n,]+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = [];
  const seen = new Set();

  for (const line of lines) {
    const match = line.match(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i);
    if (match) {
      const owner = match[1];
      const repo = match[2].replace(/\.git$/i, '');
      const slug = `${owner}/${repo}`;
      if (!seen.has(slug)) {
        seen.add(slug);
        parsed.push({
          url: `https://github.com/${slug}`,
          owner,
          repo,
          slug,
        });
      }
    }
  }

  return parsed;
}

/**
 * Browser counterpart to `src/processHistory.ts`.
 * Extracts conversation metrics, detected skills, core domains, and key signals
 * from raw or OCR'd AI chat transcripts.
 *
 * @param {string} rawOcrText
 * @param {Array} githubRepos
 */
export function processHistory(rawOcrText, githubRepos = []) {
  const cleaned = rawOcrText.replace(/\r\n/g, '\n').trim();
  const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);
  const lower = cleaned.toLowerCase();

  // Estimate conversation turns (looks for User:/Human:/Assistant:/AI: markers or fallback line chunks)
  const speakerLines = lines.filter((l) =>
    /^(user|human|me|founder|assistant|ai|chatgpt|claude|gemini)\s*:/i.test(l)
  );
  const estimatedTurns = speakerLines.length > 0
    ? speakerLines.length
    : Math.max(1, Math.ceil(lines.length / 3));

  const wordCount = cleaned.split(/\s+/).filter(Boolean).length;

  // Detect technical & domain skills mentioned in conversation or repo names
  const repoText = githubRepos.map((r) => r.slug).join(' ').toLowerCase();
  const combinedLower = `${lower} ${repoText}`;

  const detectedSkills = KNOWN_SKILLS.filter((skill) =>
    combinedLower.includes(skill.toLowerCase())
  );

  // Detect high-level domains/topics
  const detectedTopics = [];
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some((kw) => combinedLower.includes(kw))) {
      detectedTopics.push(topic);
    }
  }

  // Extract up to 4 representative founder/builder signal lines
  const signalCandidates = lines
    .map((l) => l.replace(/^(user|human|me|founder|assistant|ai|chatgpt|claude|gemini)\s*:\s*/i, ''))
    .filter((l) => l.length >= 28 && l.length <= 220);

  const uniqueSignals = [];
  for (const candidate of signalCandidates) {
    if (uniqueSignals.length >= 4) break;
    if (!uniqueSignals.includes(candidate)) {
      uniqueSignals.push(candidate);
    }
  }

  if (uniqueSignals.length === 0 && cleaned.length > 0) {
    uniqueSignals.push(cleaned.slice(0, 160) + (cleaned.length > 160 ? '…' : ''));
  }

  return {
    wordCount,
    lineCount: lines.length,
    estimatedTurns,
    topics: detectedTopics.length > 0 ? detectedTopics : ['General AI Collaboration'],
    skills: detectedSkills.length > 0 ? detectedSkills : ['AI-Assisted Building'],
    signals: uniqueSignals,
  };
}

/**
 * Browser counterpart to `src/generateCard.ts`.
 * Builds an ERC-8004 compatible AgentCard JSON structure.
 *
 * @param {Object} input
 * @param {string} [input.name]
 * @param {string} [input.bio]
 * @param {string} input.ocrHistory
 * @param {string} [input.githubReposText]
 */
export function generateCard({ name, bio, ocrHistory, githubReposText = '' }) {
  const githubRepos = parseGitHubRepos(githubReposText);
  const processed = processHistory(ocrHistory, githubRepos);

  const resolvedName = (name || '').trim() || 'Anonymous ConvoCard Builder';
  const resolvedBio =
    (bio || '').trim() ||
    `Builder exploring ${processed.topics.slice(0, 2).join(' & ')} through ${processed.estimatedTurns} captured conversation turns.`;

  return {
    schema: 'erc8004/v0.1',
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: resolvedName,
    description: resolvedBio,
    active: true,
    domains: processed.topics,
    capabilities: processed.skills,
    proofOfThought: {
      source: 'ocr-conversation-history',
      wordCount: processed.wordCount,
      estimatedTurns: processed.estimatedTurns,
      highlights: processed.signals,
    },
    repositories: githubRepos.map((r) => ({
      slug: r.slug,
      url: r.url,
    })),
    registrations: [
      {
        chainId: ARC_TESTNET_CONFIG.chainId,
        network: 'arc-testnet',
        agentRegistry: `eip155:${ARC_TESTNET_CONFIG.chainId}:${ARC_TESTNET_CONFIG.identityRegistryAddress}`,
      },
    ],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Compute a deterministic SHA-256 digest of the AgentCard JSON in the browser.
 * @param {Object} agentCard
 * @returns {Promise<string>}
 */
export async function computeCardDigest(agentCard) {
  const canonical = JSON.stringify(agentCard);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(canonical);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return '0x' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return '0x' + canonical.length.toString(16).padStart(64, '0');
}

/**
 * Browser counterpart to `src/registerAgent.ts` (v0.1 prep mode).
 * Prepares the Arc Testnet registration payload & CLI instructions.
 *
 * TODO(astra):
 * 1. Connect user's EVM wallet (MetaMask / Circle Passkey / WalletConnect) and switch to Chain ID 5042002.
 * 2. Pin `agentCard` JSON to IPFS (e.g., Pinata / web3.storage) to obtain `ipfs://<CID>`.
 * 3. Call `IdentityRegistry.register(tokenURI)` on Arc Testnet using viem/ethers.
 *
 * @param {Object} agentCard
 */
export async function prepareArcRegistration(agentCard) {
  const digest = await computeCardDigest(agentCard);

  return {
    network: ARC_TESTNET_CONFIG,
    digest,
    // Placeholder URI until Astra wires up IPFS pinning in v0.2
    pendingTokenUri: `ipfs://PENDING_IPFS_PIN/${digest.slice(2, 14)}`,
    agentCard,
    cliCommand: 'npx tsx scripts/register.ts',
  };
}
