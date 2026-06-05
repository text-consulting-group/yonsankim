const AI_USER_AGENTS = [
  'googlebot',
  'gptbot',
  'bingbot',
  'anthropicai',
  'perplexity',
  'ccbot',
  'yandexbot',
  'baiduspider',
  'duckduckbot',
  'chatgpt',
  'claude',
  'llm'
];

const PUBLIC_PATH_PREFIXES = [
  '/robots.txt',
  '/sitemap.xml',
  '/favicon.ico',
  '/static/',
  '/images/'
];

function isAiCrawler(request) {
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  if (!ua) return false;
  return AI_USER_AGENTS.some((token) => ua.includes(token));
}

function isPublicPath(pathname) {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

function parseBasicAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Basic ')) return null;
  try {
    const raw = atob(authHeader.slice(6));
    const idx = raw.indexOf(':');
    if (idx === -1) return null;
    return {
      username: raw.slice(0, idx),
      password: raw.slice(idx + 1),
    };
  } catch {
    return null;
  }
}

function isAuthorized(request, env) {
  const headerSecret = env.YJ_AUTH_PASSWORD;
  if (!headerSecret) {
    return false;
  }

  if (isAiCrawler(request)) return true;
  if (isPublicPath(new URL(request.url).pathname)) return true;

  const auth = parseBasicAuth(request.headers.get('authorization'));
  if (auth && auth.password === headerSecret) return true;
  return false;
}

export function onRequest(context) {
  const { request } = context;

  if (isAuthorized(request, context.env)) {
    return context.next();
  }

  return new Response('로그인 정보가 안전하게 저장됩니다. 전여대협디지털아카이브 관련된 정보를 확인하고 싶다면 hello@textconsulting.io로 문의 메일을 보내주세요. 이 아카이브는 개인적인 자료 열람 목적을 위해 만들어졌습니다.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="archivej", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
