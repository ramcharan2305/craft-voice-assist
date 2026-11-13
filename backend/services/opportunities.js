import pdfParse from "pdf-parse/lib/pdf-parse.js";

import { extractArtisanOpportunity } from "./aiService.js";

const REQUEST_TIMEOUT_MS = 15000;
const REQUEST_DELAY_MS = 500;
const MAX_PAGES_PER_SOURCE = 10;
const MAX_SITEMAP_URLS = 800;
const MAX_RESPONSE_SIZE = 8_000_000;
const MAX_TEXT_LENGTH = 18000;
let activeCrawl = null;
let activeCrawlStart = null;
let lastRequestAt = 0;

const DISCOVERY_TERMS =
  /\b(scheme|grant|subsidy|financial assistance|handloom|weaver|artisan|craft|training|course|skill development|workshop|exhibition|trade fair|buyer.?seller|market linkage|wholesale|e.?commerce|onboarding|registration|fellowship|incubation|procurement|export)\b/i;

export const OFFICIAL_SOURCES = [
  source("Development Commissioner (Handlooms)", "handlooms.gov.in", ["www.handlooms.gov.in"]),
  source("My Handlooms", "myhandlooms.gov.in", ["www.myhandlooms.gov.in"]),
  source("National Portal of India", "india.gov.in", ["www.india.gov.in"]),
  source("NABARD", "nabard.org", ["www.nabard.org"]),
  source("Skill India Digital", "skillindiadigital.gov.in", ["www.skillindiadigital.gov.in"]),
  source("National Skill Development Corporation", "nsdcindia.org", ["www.nsdcindia.org"]),
  source("National Institute of Fashion Technology", "nift.ac.in", ["www.nift.ac.in"]),
  source("India Trade Promotion Organisation", "indiatradefair.com", ["www.indiatradefair.com"]),
  source("The Cotton Textiles Export Promotion Council", "texprocil.org", ["www.texprocil.org"]),
  source("Export Promotion Council for Handicrafts", "epch.in", ["www.epch.in"]),
];

function source(name, host, aliases = []) {
  return {
    name,
    origin: `https://${host}`,
    startUrl: `https://${host}/`,
    hosts: new Set([host, ...aliases]),
  };
}

export function normalizeTitle(title) {
  return String(title ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function classifyOpportunityCategory(value) {
  const text = String(value ?? "").toLowerCase();
  if (/\b(scheme|grant|subsidy|loan|financial assistance|yojana)\b/.test(text)) {
    return "GOVERNMENT_SCHEME";
  }
  if (/\b(course|training|skill development|workshop|certification|class)\b/.test(text)) {
    return "COURSE_OR_TRAINING";
  }
  if (
    /\b(exhibition|trade fair|buyer.?seller|market linkage|wholesale|e.?commerce|onboarding|procurement|export)\b/.test(
      text,
    )
  ) {
    return "MARKET_LINKAGE";
  }
  return null;
}

export function extractOpportunityFromHtml(sourceInfo, pageUrl, html) {
  const description = metaContent(html, "description") || metaContent(html, "og:description");
  const text = cleanText(`${description} ${htmlToText(html)}`);
  return {
    text: text.slice(0, MAX_TEXT_LENGTH),
    title: metaContent(html, "og:title") || titleContent(html),
    language: html.match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i)?.[1]?.split("-")[0] ?? "",
    links: extractLinks(html, sourceInfo, pageUrl),
  };
}

export function scoreOpportunity(profile, opportunity) {
  const why = [];
  let score = 0;
  const profileLocation = [profile.city, profile.district, profile.state, profile.location]
    .filter(Boolean)
    .join(" ");

  if (opportunity.location && containsText(profileLocation, opportunity.location)) {
    score += 4;
    why.push("Location matches your profile");
  }
  if (
    opportunity.business_category &&
    containsText(
      `${profile.craft_type ?? ""} ${profile.business_size ?? ""}`,
      opportunity.business_category,
    )
  ) {
    score += 3;
    why.push("Business type matches your profile");
  }
  if (
    opportunity.product_category &&
    containsText(profile.product_category, opportunity.product_category)
  ) {
    score += 3;
    why.push("Product category matches your profile");
  }
  if (
    opportunity.content_language &&
    profile.language &&
    opportunity.content_language.toLowerCase() === profile.language.toLowerCase()
  ) {
    score += 1;
    why.push("Available in your preferred language");
  }
  if (
    opportunity.target_audience &&
    containsText(opportunity.target_audience, `${profile.craft_type ?? ""} artisan`)
  ) {
    score += 2;
    why.push("The stated audience includes artisans in your field");
  }

  const age =
    profile.age === null || profile.age === undefined || profile.age === ""
      ? Number.NaN
      : Number(profile.age);
  const ageKnown = Number.isInteger(age) && age > 0;
  const experience =
    profile.experience_years === null ||
    profile.experience_years === undefined ||
    profile.experience_years === ""
      ? Number.NaN
      : Number(profile.experience_years);
  const experienceKnown = Number.isFinite(experience) && experience >= 0;
  const ageMismatch =
    (opportunity.age_min !== null &&
      opportunity.age_min !== undefined &&
      ageKnown &&
      age < opportunity.age_min) ||
    (opportunity.age_max !== null &&
      opportunity.age_max !== undefined &&
      ageKnown &&
      age > opportunity.age_max);
  const gender = String(profile.gender ?? "").toLowerCase();
  const genderCriterion = String(opportunity.gender_eligibility ?? "").toLowerCase();
  const genderMismatch =
    genderCriterion && genderCriterion !== "any" && gender && genderCriterion !== gender;
  const experienceMismatch =
    opportunity.experience_min !== null &&
    opportunity.experience_min !== undefined &&
    experienceKnown &&
    experience < opportunity.experience_min;
  const mandatoryCriteriaUnknown =
    (((opportunity.age_min !== null && opportunity.age_min !== undefined) ||
      (opportunity.age_max !== null && opportunity.age_max !== undefined)) &&
      !ageKnown) ||
    Boolean(genderCriterion && genderCriterion !== "any" && !gender) ||
    (opportunity.experience_min !== null &&
      opportunity.experience_min !== undefined &&
      !experienceKnown);

  if (ageMismatch || genderMismatch || experienceMismatch) {
    return {
      score: 0,
      why: ["Does not match an explicit eligibility requirement"],
      eligibility: "criteria_mismatch",
    };
  }
  const hasExplicitCriteria =
    (opportunity.age_min !== null && opportunity.age_min !== undefined) ||
    (opportunity.age_max !== null && opportunity.age_max !== undefined) ||
    Boolean(genderCriterion && genderCriterion !== "any") ||
    (opportunity.experience_min !== null && opportunity.experience_min !== undefined);
  const eligibility = mandatoryCriteriaUnknown
    ? "not_verified"
    : hasExplicitCriteria
      ? "criteria_match_unconfirmed"
      : "not_verified";

  return {
    score,
    why: why.length ? why : ["May be useful to artisans; confirm details with the provider"],
    eligibility,
  };
}

export function groupRecommendation(scored) {
  if (scored.eligibility === "not_verified") return "eligibility_not_verified";
  return scored.score >= 4 ? "highly_relevant" : "potentially_relevant";
}

export async function crawlOfficialSources(
  supabase,
  { extractOpportunity = extractArtisanOpportunity, run: existingRun } = {},
) {
  const run = existingRun ?? (await createCrawlRun(supabase));

  const errors = [];
  let sitesChecked = 0;
  let recordsFound = 0;
  let recordsAdded = 0;

  try {
    for (const trustedSource of OFFICIAL_SOURCES) {
      try {
        const robots = await fetchRobots(trustedSource);
        if (!robots.aiInputAllowed) {
          throw new Error(
            "Source robots.txt does not permit AI content processing; source skipped.",
          );
        }
        const urls = await discoverSourceUrls(trustedSource, robots);
        sitesChecked += 1;

        for (const page of urls.slice(0, MAX_PAGES_PER_SOURCE)) {
          if (!allowedByRobots(robots.rules, page.url)) continue;
          try {
            const document = await fetchDocument(trustedSource, page.url, robots);
            const candidateText = `${page.title} ${page.url} ${document.title} ${document.text}`;
            if (!classifyOpportunityCategory(candidateText)) continue;

            const extracted = await extractOpportunity({
              sourceUrl: document.url,
              text: document.text.slice(0, MAX_TEXT_LENGTH),
              links: document.links.map((link) => link.url),
            });
            if (!extracted || !extracted.category || !extracted.title || !extracted.description) {
              continue;
            }
            recordsFound += 1;
            const record = toOpportunityRow(trustedSource, document, extracted);
            const result = await saveOpportunity(supabase, record);
            if (result === "added") recordsAdded += 1;
          } catch (error) {
            errors.push({
              source: trustedSource.name,
              message: `${new URL(page.url).pathname}: ${safeMessage(error)}`,
            });
          }
        }
      } catch (error) {
        errors.push({ source: trustedSource.name, message: safeMessage(error) });
      }
      const { error: progressError } = await supabase
        .from("opportunity_crawl_runs")
        .update({
          sites_checked: sitesChecked,
          records_found: recordsFound,
          records_added: recordsAdded,
          errors,
        })
        .eq("id", run.id);
      if (progressError) throw progressError;
    }

    const status = errors.length === 0 ? "completed" : sitesChecked > 0 ? "partial" : "failed";
    const { error: updateError } = await supabase
      .from("opportunity_crawl_runs")
      .update({
        completed_at: new Date().toISOString(),
        status,
        sites_checked: sitesChecked,
        records_found: recordsFound,
        records_added: recordsAdded,
        errors,
      })
      .eq("id", run.id);
    if (updateError) throw updateError;
    return {
      id: run.id,
      status,
      sites_checked: sitesChecked,
      records_found: recordsFound,
      records_added: recordsAdded,
      errors,
    };
  } catch (error) {
    const { error: updateError } = await supabase
      .from("opportunity_crawl_runs")
      .update({
        completed_at: new Date().toISOString(),
        status: "failed",
        errors: [...errors, { message: safeMessage(error) }],
      })
      .eq("id", run.id);
    if (updateError) throw updateError;
    throw error;
  }
}

async function createCrawlRun(supabase) {
  const { data, error } = await supabase
    .from("opportunity_crawl_runs")
    .insert({ started_at: new Date().toISOString(), status: "running" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

function toOpportunityRow(trustedSource, document, extracted) {
  const category = extracted.category;
  const deadline = extracted.deadline;
  const eventDate = extracted.event_date;
  const opportunityType =
    category === "GOVERNMENT_SCHEME"
      ? "scheme"
      : category === "COURSE_OR_TRAINING"
        ? "training"
        : "market";
  return {
    ...extracted,
    title: extracted.title.slice(0, 300),
    normalized_title: normalizeTitle(extracted.title),
    source_name: trustedSource.name,
    source_url: document.url,
    source_urls: [document.url],
    content_language: document.language ?? "",
    location: extracted.location ?? "",
    business_category: extracted.business_category ?? "",
    product_category: extracted.product_category ?? "",
    opportunity_type: opportunityType,
    eligibility_text: extracted.eligibility_requirements ?? "",
    age_min: extracted.age_min,
    age_max: extracted.age_max,
    gender_eligibility: extracted.gender_eligibility ?? "",
    deadline,
    event_date: eventDate,
    last_checked_at: new Date().toISOString(),
    last_crawled_at: new Date().toISOString(),
    last_verified_at: null,
    status: isExpired(deadline, eventDate) ? "expired" : "unverified",
    review_status: "pending",
    updated_at: new Date().toISOString(),
  };
}

export async function saveOpportunity(supabase, record) {
  let existing;
  const { data: byUrl, error: urlError } = await supabase
    .from("opportunities")
    .select("*")
    .eq("source_url", record.source_url)
    .maybeSingle();
  if (urlError) throw urlError;
  existing = byUrl;

  if (!existing) {
    const { data: sameTitle, error: titleError } = await supabase
      .from("opportunities")
      .select("*")
      .eq("normalized_title", record.normalized_title)
      .eq("category", record.category)
      .eq("is_removed", false);
    if (titleError) throw titleError;
    existing =
      sameTitle?.find(
        (item) =>
          !record.provider ||
          !item.provider ||
          normalizeTitle(item.provider) === normalizeTitle(record.provider),
      ) ?? null;
  }

  if (!existing) {
    const { error } = await supabase.from("opportunities").insert(record);
    if (error) throw error;
    return "added";
  }

  if (existing.is_removed) return "unchanged";
  const changed = Object.entries(record).some(
    ([key, value]) =>
      ![
        "source_url",
        "source_urls",
        "last_checked_at",
        "last_crawled_at",
        "last_verified_at",
        "updated_at",
        "review_status",
        "status",
      ].includes(key) && normalizeComparable(existing[key]) !== normalizeComparable(value),
  );
  const sourceUrls = [
    ...new Set([...(existing.source_urls ?? []), existing.source_url, record.source_url]),
  ];
  const nextStatus = isExpired(record.deadline, record.event_date)
    ? "expired"
    : changed
      ? "unverified"
      : existing.status;
  const update = {
    ...record,
    source_url: existing.source_url,
    source_urls: sourceUrls,
    status: nextStatus,
    review_status: changed ? "pending" : existing.review_status,
    last_verified_at: changed ? null : existing.last_verified_at,
  };
  const { error } = await supabase.from("opportunities").update(update).eq("id", existing.id);
  if (error) throw error;
  return "updated";
}

export function isExpired(deadline, eventDate, now = new Date()) {
  const date = [deadline, eventDate].filter(Boolean).map((value) => new Date(`${value}T23:59:59Z`));
  return date.some((value) => !Number.isNaN(value.getTime()) && value < now);
}

export function runOpportunityCrawl(supabase, options) {
  return ensureOpportunityCrawl(supabase, options).completion;
}

export function startOpportunityCrawl(supabase, options) {
  return ensureOpportunityCrawl(supabase, options).started;
}

function ensureOpportunityCrawl(supabase, options) {
  if (activeCrawl) return { started: activeCrawlStart, completion: activeCrawl };

  const started = createCrawlRun(supabase);
  const completion = started.then((run) => crawlOfficialSources(supabase, { ...options, run }));
  activeCrawlStart = started;
  activeCrawl = completion.finally(() => {
    activeCrawl = null;
    activeCrawlStart = null;
  });
  void activeCrawl.catch((error) => {
    console.error("[opportunities] crawl failed:", error);
  });
  return { started: activeCrawlStart, completion: activeCrawl };
}

export function scheduleOpportunityCrawl(getSupabase, intervalMs = 24 * 60 * 60 * 1000) {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const result = await runOpportunityCrawl(getSupabase());
      const summary =
        `[opportunities] scheduled crawl ${result.status}: ` +
        `${result.records_added} added, ${result.records_found} found, ` +
        `${result.sites_checked} sites checked`;
      if (result.errors.length) {
        const details = result.errors
          .slice(0, 3)
          .map(({ source, message }) => `${source ? `${source}: ` : ""}${message}`)
          .join(" | ");
        const remainder = result.errors.length > 3 ? ` | +${result.errors.length - 3} more` : "";
        console.warn(`${summary}; ${result.errors.length} source errors: ${details}${remainder}`);
      } else {
        console.info(summary);
      }
    } catch (error) {
      console.error("[opportunities] scheduled crawl failed:", error);
    } finally {
      running = false;
    }
  };
  const initialTimer = setTimeout(() => void run(), 30000);
  const interval = setInterval(() => void run(), intervalMs);
  initialTimer.unref?.();
  interval.unref?.();
  return { run };
}

async function discoverSourceUrls(trustedSource, robots) {
  const candidates = new Map();
  const root = await fetchDocument(trustedSource, trustedSource.startUrl, robots);
  addCandidates(candidates, root.links, robots, trustedSource);

  const sitemapQueue = [...new Set(robots.sitemaps)];
  for (const path of ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml"]) {
    const url = new URL(path, trustedSource.startUrl).href;
    if (!sitemapQueue.includes(url)) sitemapQueue.push(url);
  }
  let sitemapEntries = 0;
  for (
    let index = 0;
    index < sitemapQueue.length && index < 10 && sitemapEntries < MAX_SITEMAP_URLS;
    index += 1
  ) {
    const sitemapUrl = sitemapQueue[index];
    try {
      if (!allowedByRobots(robots.rules, sitemapUrl)) continue;
      const sitemap = await fetchText(
        trustedSource,
        sitemapUrl,
        "application/xml,text/xml,text/plain",
        robots,
      );
      for (const child of parseSitemap(sitemap, trustedSource)) {
        if (child.type === "sitemap") {
          if (sitemapQueue.length < 10 && !sitemapQueue.includes(child.url)) {
            sitemapQueue.push(child.url);
          }
        } else if (isDiscoveryCandidate(child.url, child.title)) {
          addCandidate(candidates, child, robots, trustedSource);
        }
        sitemapEntries += 1;
        if (sitemapEntries >= MAX_SITEMAP_URLS) break;
      }
    } catch (error) {
      if (!isMissingResource(error)) {
        console.warn(
          `[opportunities] ${trustedSource.name} sitemap skipped: ${safeMessage(error)}`,
        );
      }
    }
  }

  for (const candidate of [...candidates.values()].slice(0, 3)) {
    try {
      const page = await fetchDocument(trustedSource, candidate.url, robots);
      addCandidates(candidates, page.links, robots, trustedSource);
    } catch (error) {
      console.warn(
        `[opportunities] link discovery failed for ${candidate.url}: ${safeMessage(error)}`,
      );
    }
  }
  return [...candidates.values()]
    .filter(({ url }) => !isListingUrl(url))
    .slice(0, MAX_PAGES_PER_SOURCE);
}

function addCandidates(candidates, links, robots, trustedSource) {
  for (const link of links) addCandidate(candidates, link, robots, trustedSource);
}

function addCandidate(candidates, link, robots, trustedSource) {
  if (!isTrustedUrl(trustedSource, link.url) || !allowedByRobots(robots.rules, link.url)) return;
  if (!isDiscoveryCandidate(link.url, link.title)) return;
  if (isListingUrl(link.url)) return;
  candidates.set(link.url, { url: link.url, title: link.title ?? "" });
}

function isDiscoveryCandidate(url, title = "") {
  return (
    DISCOVERY_TERMS.test(`${title} ${new URL(url).pathname}`) ||
    /\.(?:pdf|docx?)(?:$|\?)/i.test(url)
  );
}

export function parseSitemap(xml, trustedSource) {
  const results = [];
  for (const tag of ["sitemap", "url"]) {
    const pattern = new RegExp(
      `<${tag}\\b[^>]*>[\\s\\S]*?<loc\\b[^>]*>\\s*([^<]+)\\s*<\\/loc>[\\s\\S]*?<\\/${tag}>`,
      "gi",
    );
    for (const match of xml.matchAll(pattern)) {
      const value = decodeEntities(match[1].trim());
      let url;
      try {
        url = new URL(value);
      } catch {
        continue;
      }
      if (!isTrustedUrl(trustedSource, url.href)) continue;
      results.push({
        url: url.href,
        title: "",
        type: tag === "sitemap" ? "sitemap" : "page",
      });
      if (results.length >= MAX_SITEMAP_URLS) return results;
    }
  }
  return results;
}

async function fetchRobots(trustedSource) {
  const url = new URL("/robots.txt", trustedSource.startUrl).href;
  const response = await fetchResponse(trustedSource, url);
  if (response.status === 404) {
    return { rules: [], sitemaps: [], aiInputAllowed: true };
  }
  if (!response.ok) {
    throw new Error(`robots.txt returned HTTP ${response.status}; source skipped.`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!/text\/plain|application\/text|application\/xml/i.test(contentType)) {
    throw new Error("robots.txt did not return a plain-text policy; source skipped.");
  }
  return parseRobots(await response.text());
}

export function parseRobots(text, userAgent = "HConnectOpportunityBot") {
  const groups = [];
  let group = null;
  const sitemaps = [];
  let aiInputAllowed = true;
  let hasAiInputSignal = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split("#", 1)[0].trim();
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === "user-agent") {
      if (!group || group.hasRules) {
        group = { agents: [], rules: [], hasRules: false };
        groups.push(group);
      }
      group.agents.push(value.toLowerCase());
    } else if ((key === "allow" || key === "disallow") && group) {
      group.hasRules = true;
      if (value) group.rules.push({ allow: key === "allow", path: value });
    } else if (key === "sitemap" && value) {
      sitemaps.push(value);
    } else if (key === "content-signal" && /\bai-input\s*=\s*no\b/i.test(value)) {
      aiInputAllowed = false;
      hasAiInputSignal = true;
    }
  }

  const specific = groups.filter((item) =>
    item.agents.some((agent) => agent !== "*" && userAgent.toLowerCase().includes(agent)),
  );
  const wildcard = groups.filter((item) => item.agents.includes("*"));
  const selectedGroups = specific.length ? specific : wildcard;
  return {
    rules: selectedGroups.flatMap((item) => item.rules),
    sitemaps,
    aiInputAllowed: !hasAiInputSignal || aiInputAllowed,
  };
}

export function allowedByRobots(rules, value) {
  const url = value instanceof URL ? value : new URL(value, "https://local.invalid");
  const path = `${url.pathname}${url.search}`;
  const matching = rules
    .filter((rule) => matchesRobotsPath(rule.path, path))
    .sort(
      (left, right) =>
        robotsSpecificity(right.path) - robotsSpecificity(left.path) ||
        Number(right.allow) - Number(left.allow),
    );
  return matching.length === 0 || matching[0].allow;
}

function matchesRobotsPath(pattern, path) {
  const expression = escapeRegExp(pattern).replace(/\\\*/g, ".*").replace(/\\\$/g, "$");
  return new RegExp(`^${expression}`).test(path);
}

function robotsSpecificity(path) {
  return path.replace(/[*$]/g, "").length;
}

async function fetchDocument(trustedSource, url, robots) {
  const response = await fetchResponse(trustedSource, url, "*/*", robots);
  if (!response.ok) throw httpError(response.status, url);
  if (Number(response.headers.get("content-length")) > MAX_RESPONSE_SIZE) {
    throw new Error("Response exceeded the crawler size limit.");
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_RESPONSE_SIZE)
    throw new Error("Response exceeded the crawler size limit.");
  const finalUrl = response.url || url;
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const isPdf =
    contentType.includes("application/pdf") || buffer.subarray(0, 5).toString() === "%PDF-";
  if (isPdf) {
    const parsed = await pdfParse(buffer);
    return {
      url: finalUrl,
      text: cleanText(parsed.text).slice(0, MAX_TEXT_LENGTH),
      title: "",
      language: "",
      links: [],
    };
  }
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    throw new Error(`Unsupported document type from ${new URL(finalUrl).hostname}.`);
  }
  const html = buffer.toString("utf8");
  const extracted = extractOpportunityFromHtml(trustedSource, finalUrl, html);
  return { url: finalUrl, ...extracted };
}

async function fetchText(trustedSource, url, accept = "*/*", robots) {
  const response = await fetchResponse(trustedSource, url, accept, robots);
  if (!response.ok) throw httpError(response.status, url);
  if (Number(response.headers.get("content-length")) > MAX_RESPONSE_SIZE) {
    throw new Error("Response exceeded the crawler size limit.");
  }
  const text = await response.text();
  if (text.length > MAX_RESPONSE_SIZE) throw new Error("Response exceeded the crawler size limit.");
  return text;
}

async function fetchResponse(trustedSource, initialUrl, accept = "*/*", robots) {
  let url = new URL(initialUrl);
  if (!isTrustedUrl(trustedSource, url.href))
    throw new Error("URL is outside the trusted source hosts.");
  for (let redirects = 0; redirects <= 4; redirects += 1) {
    if (robots && !allowedByRobots(robots.rules, url)) {
      throw new Error(`robots.txt disallows ${url.pathname}; request skipped.`);
    }
    const wait = REQUEST_DELAY_MS - (Date.now() - lastRequestAt);
    if (wait > 0) await delay(wait);
    lastRequestAt = Date.now();
    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      redirect: "manual",
      headers: {
        Accept: accept,
        "User-Agent": "HConnectOpportunityBot/1.0",
      },
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) return response;
    url = new URL(location, url);
    if (!isTrustedUrl(trustedSource, url.href)) {
      throw new Error(`Cross-source redirect refused: ${url.hostname}.`);
    }
  }
  throw new Error("Too many redirects.");
}

function httpError(status, url) {
  const error = new Error(`HTTP ${status} for ${new URL(url).hostname}.`);
  error.status = status;
  return error;
}

function isMissingResource(error) {
  return error?.status === 404 || error?.status === 410;
}

function isTrustedUrl(trustedSource, value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && trustedSource.hosts.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function extractLinks(html, trustedSource, baseUrl) {
  const links = [];
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = match[1].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    let url;
    try {
      url = new URL(decodeEntities(href), baseUrl);
    } catch {
      continue;
    }
    if (!["http:", "https:"].includes(url.protocol) || url.hash) continue;
    url.hash = "";
    links.push({ url: url.href, title: cleanText(match[2]) });
  }
  return links;
}

function htmlToText(html) {
  return cleanText(
    html
      .replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(?:br|\/p|\/div|\/li|\/h[1-6]|\/section|\/article|\/tr)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );
}

function cleanText(value) {
  return decodeEntities(String(value ?? ""))
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001f]/g, "")
    .trim();
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function metaContent(html, name) {
  const tags = [...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => tag);
  const tag = tags.find((value) => {
    const key = value.match(/\b(?:name|property)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    return key === name.toLowerCase();
  });
  return cleanText(tag?.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1] ?? "");
}

function titleContent(html) {
  return cleanText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
}

function isListingUrl(value) {
  const url = new URL(value);
  return url.pathname === "/" || /\/(?:search|find|directory|events?)\/?$/i.test(url.pathname);
}

function normalizeComparable(value) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return JSON.stringify([...value].sort());
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).trim().toLowerCase();
}

function containsText(haystack, needle) {
  const left = String(haystack ?? "").toLowerCase();
  const right = String(needle ?? "").toLowerCase();
  return Boolean(
    right &&
    (left.includes(right) ||
      right.split(/[\s,;/]+/).some((part) => part.length > 3 && left.includes(part))),
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safeMessage(error) {
  if (!(error instanceof Error)) return "Unexpected crawler error.";
  if (
    error.cause instanceof Error &&
    "code" in error.cause &&
    typeof error.cause.code === "string"
  ) {
    return `${error.message} (${error.cause.code}: ${error.cause.message})`;
  }
  return error.message;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
