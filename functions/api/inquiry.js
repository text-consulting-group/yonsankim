const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

export async function onRequestPost({ request, env }) {
  try {
    const payload = await request.json();
    const config = getConfig(env);

    if (!config.githubToken) {
      return json({ error: "GITHUB_TOKEN is not configured." }, 500);
    }

    const item = normalizePayload(payload);
    if (!item.title) {
      return json({ error: "제목을 입력해주세요." }, 400);
    }

    const slug = createSlug(item.path || item.title);
    const filePath = `${config.targetDir}/${slug}.md`;
    const markdown = buildMarkdown(item, slug);

    const githubResult = await createGitHubFile(config, filePath, markdown, item.title);
    if (!githubResult.ok) {
      const body = await safeJson(githubResult.response);
      const status = githubResult.response.status === 422 ? 409 : githubResult.response.status;
      const message = status === 409
        ? "같은 경로의 Markdown 파일이 이미 있습니다. 기본경로 URL을 바꿔주세요."
        : body?.message || "GitHub 파일 생성에 실패했습니다.";

      return json({ error: message, detail: body }, status);
    }

    const body = await githubResult.response.json();
    return json({
      ok: true,
      path: filePath,
      commit: body.commit?.html_url,
      content: body.content?.html_url,
    }, 201);
  } catch (error) {
    return json({ error: error.message || "신청 처리 중 오류가 발생했습니다." }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: JSON_HEADERS,
  });
}

function getConfig(env) {
  return {
    githubToken: env.GITHUB_TOKEN,
    owner: env.GITHUB_OWNER || "team-durumi",
    repo: env.GITHUB_REPO || "facwa",
    branch: env.GITHUB_BRANCH || "main",
    targetDir: trimSlashes(env.INQUIRY_TARGET_DIR || "content/items/default"),
  };
}

function normalizePayload(payload) {
  const tags = Array.isArray(payload.tags) ? payload.tags : [];
  const files = Array.isArray(payload.files) ? payload.files : [];

  return {
    title: cleanText(payload.title),
    path: cleanText(payload.path),
    description: cleanText(payload.description),
    tags: tags.map(cleanText).filter(Boolean),
    files: files
      .map((file) => ({
        name: cleanText(file.name),
        size: Number(file.size) || 0,
      }))
      .filter((file) => file.name),
  };
}

function buildMarkdown(item, slug) {
  const today = new Date().toISOString().slice(0, 10);
  const description = item.description || "inquiry submitted item";
  const components = item.files.map((file) => file.name);
  const tags = item.tags.length ? item.tags : ["inquiry"];

  return `---
slug: ${yamlString(slug)}
acquisition_transfer: "신청"
public_access_status: "TRUE"
level__rg: "default"
date: ${yamlString(today)}
tags:
${yamlList(tags)}
title: ${yamlString(item.title)}
description_status: ${yamlString(description)}
description: ${yamlString(description)}
media_type: "inquiry"
components:
${yamlList(components)}
inquiry_files:
${yamlFileList(item.files)}
---

${description}
`;
}

async function createGitHubFile(config, filePath, markdown, title) {
  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodedPath}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${config.githubToken}`,
      "content-type": "application/json",
      "user-agent": "archivej-inquiry-pages-function",
      "x-github-api-version": "2022-11-28",
    },
    body: JSON.stringify({
      message: `Add inquiry item: ${title}`,
      content: toBase64(markdown),
      branch: config.branch,
    }),
  });

  return { ok: response.ok, response };
}

function createSlug(value) {
  const slug = cleanText(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || `inquiry-${Date.now()}`;
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function trimSlashes(value) {
  return String(value || "").replace(/^\/+|\/+$/g, "");
}

function yamlString(value) {
  return JSON.stringify(String(value || ""));
}

function yamlList(values) {
  if (!values.length) return "  []";
  return values.map((value) => `  - ${yamlString(value)}`).join("\n");
}

function yamlFileList(files) {
  if (!files.length) return "  []";
  return files
    .map((file) => `  - name: ${yamlString(file.name)}\n    size: ${Number(file.size) || 0}`)
    .join("\n");
}

function toBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}
