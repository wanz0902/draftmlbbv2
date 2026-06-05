import PQueue from 'p-queue';
import { getDb, logScrape } from '../db/database.js';

export const USER_AGENT = 'MLBBMaster.gg/3.0 (https://mlbbmaster.gg; dev@mlbbmaster.gg) Draft Analysis Platform';
export const MEDIAWIKI_BASE = 'https://liquipedia.net/mobilelegends/api.php';

export const generalQueue = new PQueue({
  interval: 2500,
  intervalCap: 1,
  carryoverConcurrencyCount: false,
});

export const parseQueue = new PQueue({
  interval: 32000,
  intervalCap: 1,
  carryoverConcurrencyCount: false,
});

export interface WikitextResponse {
  parse?: {
    title: string;
    pageid: number;
    wikitext?: { '*': string };
    text?: { '*': string };
  };
  query?: {
    categorymembers?: Array<{ pageid: number; ns: number; title: string }>;
    pages?: Record<string, {
      pageid: number;
      title: string;
      missing?: boolean;
      revisions?: Array<{ slots: { main: { content: string } } }>;
    }>;
    search?: Array<{ title: string; snippet: string; timestamp: string }>;
  };
  error?: { code: string; info: string };
  batchcomplete?: string;
}

async function gatewayFetch(
  url: string,
  queue: PQueue,
  maxRetries: number = 3
): Promise<WikitextResponse> {
  return queue.add(async () => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); 

        const res = await fetch(url, {
          headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
            'Connection': 'keep-alive',  
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get('Retry-After') ?? '60', 10);
          console.warn(`[Gateway] 429 Too Many Requests — waiting ${retryAfter}s before retry...`);
          await sleep(retryAfter * 1000);
          continue;
        }

        if (res.status === 503) {
          console.warn(`[Gateway] 503 Service Unavailable — waiting 120s...`);
          await sleep(120000);
          continue;
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText} → ${url}`);
        }

        const json = await res.json() as WikitextResponse;

        if (json.error) {
          throw new Error(`MediaWiki API Error: ${json.error.code} — ${json.error.info}`);
        }

        return json;

      } catch (err: unknown) {
        if (attempt === maxRetries) throw err;
        const backoff = Math.pow(2, attempt) * 1000; 
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[Gateway] Attempt ${attempt} failed: ${msg}. Retrying in ${backoff}ms...`);
        await sleep(backoff);
      }
    }
    throw new Error(`[Gateway] All ${maxRetries} retries exhausted for: ${url}`);
  }) as Promise<WikitextResponse>;
}

export async function fetchWikitext(pageName: string): Promise<string> {
  const url = `${MEDIAWIKI_BASE}?action=parse&page=${encodeURIComponent(pageName)}&prop=wikitext&format=json&formatversion=2`;
  console.log(`[Gateway] Fetching wikitext: ${pageName}`);
  const data = await gatewayFetch(url, parseQueue);

  if (!data.parse?.wikitext) {
    throw new Error(`No wikitext content returned for page: "${pageName}"`);
  }
  return data.parse.wikitext['*'] ?? (data.parse.wikitext as unknown as string);
}

export async function fetchParsedHtml(pageName: string): Promise<string> {
  const url = `${MEDIAWIKI_BASE}?action=parse&page=${encodeURIComponent(pageName)}&prop=text&format=json&formatversion=2`;
  console.log(`[Gateway] Fetching parsed HTML: ${pageName}`);
  const data = await gatewayFetch(url, parseQueue);
  return data.parse?.text?.['*'] ?? '';
}

export async function fetchCategoryMembers(
  category: string,
  limit: number = 500
): Promise<Array<{ pageid: number; title: string }>> {
  const url = `${MEDIAWIKI_BASE}?action=query&list=categorymembers&cmtitle=${encodeURIComponent('Category:' + category)}&cmlimit=${limit}&format=json&formatversion=2`;
  const data = await gatewayFetch(url, generalQueue);
  return (data.query?.categorymembers ?? []).map((m: any) => ({
    pageid: m.pageid,
    title: m.title,
  }));
}

export async function searchPages(
  query: string,
  limit: number = 10
): Promise<Array<{ title: string; snippet: string }>> {
  const url = `${MEDIAWIKI_BASE}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&format=json&formatversion=2`;
  const data = await gatewayFetch(url, generalQueue);
  return ((data.query?.search ?? []) as any[]).map((r: any) => ({
    title: r.title,
    snippet: r.snippet ?? '',
  }));
}

export async function checkPageExists(title: string): Promise<boolean> {
  const url = `${MEDIAWIKI_BASE}?action=query&titles=${encodeURIComponent(title)}&format=json&formatversion=2`;
  const data = await gatewayFetch(url, generalQueue);
  const pages = data.query?.pages ?? {};
  const page = Object.values(pages)[0];
  return page ? !('missing' in page) : false;
}

export function getGatewayQueueStatus() {
  return {
    general: {
      size: generalQueue.size,
      pending: generalQueue.pending,
      isPaused: generalQueue.isPaused,
    },
    parse: {
      size: parseQueue.size,
      pending: parseQueue.pending,
      isPaused: parseQueue.isPaused,
    },
    estimatedMinutesRemaining: Math.ceil(
      (parseQueue.size * 32 + generalQueue.size * 2.5) / 60
    ),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
