import assert from "node:assert/strict";
import test from "node:test";

import {
  allowedByRobots,
  classifyOpportunityCategory,
  extractOpportunityFromHtml,
  groupRecommendation,
  isExpired,
  normalizeTitle,
  parseRobots,
  parseSitemap,
  saveOpportunity,
  scoreOpportunity,
} from "../services/opportunities.js";
import { extractArtisanOpportunity } from "../services/aiService.js";

const handloomSource = {
  name: "Official handloom source",
  origin: "https://handlooms.gov.in",
  startUrl: "https://handlooms.gov.in/",
  hosts: new Set(["handlooms.gov.in", "www.handlooms.gov.in"]),
};

test("normalizes titles and identifies only the supported opportunity categories", () => {
  assert.equal(
    normalizeTitle("Women's Weaver Support & Training"),
    "women-s-weaver-support-and-training",
  );
  assert.equal(
    classifyOpportunityCategory("Financial assistance for weavers"),
    "GOVERNMENT_SCHEME",
  );
  assert.equal(classifyOpportunityCategory("Skill development course"), "COURSE_OR_TRAINING");
  assert.equal(classifyOpportunityCategory("Handloom trade fair registration"), "MARKET_LINKAGE");
  assert.equal(classifyOpportunityCategory("General department news"), null);
});

test("parses sitemap pages and nested sitemap links only from trusted hosts", () => {
  const xml = `<?xml version="1.0"?>
    <sitemapindex>
      <sitemap><loc>https://handlooms.gov.in/sitemap-schemes.xml</loc></sitemap>
      <sitemap><loc>https://example.com/outside.xml</loc></sitemap>
    </sitemapindex>
    <urlset><url><loc>https://handlooms.gov.in/schemes/weaver-support</loc></url></urlset>`;

  assert.deepEqual(parseSitemap(xml, handloomSource), [
    {
      url: "https://handlooms.gov.in/sitemap-schemes.xml",
      title: "",
      type: "sitemap",
    },
    {
      url: "https://handlooms.gov.in/schemes/weaver-support",
      title: "",
      type: "page",
    },
  ]);
});

test("extracts bounded page text, metadata and source-page links from HTML", () => {
  const page = extractOpportunityFromHtml(
    handloomSource,
    "https://handlooms.gov.in/schemes/weaver-support",
    `<html lang="en-IN">
      <head>
        <title>Weaver Support Scheme</title>
        <meta name="description" content="Financial support for handloom artisans.">
      </head>
      <body>
        <h1>Weaver Support Scheme</h1>
        <a href="/apply">Apply now</a>
        <a href="https://example.org/details">More details</a>
      </body>
    </html>`,
  );

  assert.equal(page.title, "Weaver Support Scheme");
  assert.equal(page.language, "en");
  assert.match(page.text, /Financial support for handloom artisans/);
  assert.deepEqual(page.links, [
    { url: "https://handlooms.gov.in/apply", title: "Apply now" },
    { url: "https://example.org/details", title: "More details" },
  ]);
});

test("uses the matching robots group, longest path rule and explicit content signals", () => {
  const robots = parseRobots(`
    User-agent: *
    Disallow: /private
    Allow: /private/public
    User-agent: HConnectOpportunityBot
    Disallow: /internal
    Content-Signal: search=yes, ai-input=no
    Sitemap: https://handlooms.gov.in/sitemap.xml
  `);

  assert.equal(allowedByRobots(robots.rules, "https://handlooms.gov.in/public"), true);
  assert.equal(allowedByRobots(robots.rules, "https://handlooms.gov.in/private/records"), true);
  assert.equal(allowedByRobots(robots.rules, "https://handlooms.gov.in/internal"), false);
  assert.equal(robots.aiInputAllowed, false);
  assert.deepEqual(robots.sitemaps, ["https://handlooms.gov.in/sitemap.xml"]);

  const wildcard = parseRobots(
    "User-agent: *\nDisallow: /private\nAllow: /private/public\nDisallow: /search/*",
  );
  assert.equal(allowedByRobots(wildcard.rules, "/private/records"), false);
  assert.equal(allowedByRobots(wildcard.rules, "/private/public/info"), true);
  assert.equal(allowedByRobots(wildcard.rules, "/search/admin"), false);
  assert.equal(
    allowedByRobots(parseRobots("User-agent: *\nDisallow: /same\nAllow: /same").rules, "/same"),
    true,
  );
});

test("marks only a past deadline or event date expired", () => {
  const now = new Date("2026-01-15T12:00:00Z");
  assert.equal(isExpired("2026-01-14", null, now), true);
  assert.equal(isExpired("2026-01-20", "2026-01-10", now), true);
  assert.equal(isExpired("2026-01-20", null, now), false);
  assert.equal(isExpired(null, null, now), false);
});

test("matches explicit eligibility criteria without asserting eligibility", () => {
  const opportunity = {
    location: "Telangana",
    business_category: "Handloom and crafts",
    product_category: "Handloom and textiles",
    content_language: "en",
    age_min: 18,
    age_max: 35,
    gender_eligibility: "female",
    eligibility_text: "Only women handloom artisans aged 18 to 35 years.",
  };
  const profile = {
    age: 30,
    gender: "female",
    state: "Telangana",
    craft_type: "Handloom artisan",
    product_category: "Handloom textiles",
    language: "en",
  };

  const match = scoreOpportunity(profile, opportunity);
  assert.equal(match.eligibility, "criteria_match_unconfirmed");
  assert.equal(groupRecommendation(match), "highly_relevant");
  assert.ok(match.why.includes("Location matches your profile"));

  const mismatch = scoreOpportunity({ ...profile, gender: "male" }, opportunity);
  assert.equal(mismatch.eligibility, "criteria_mismatch");
  assert.equal(mismatch.score, 0);

  const unknown = scoreOpportunity({ ...profile, age: null, gender: "" }, opportunity);
  assert.equal(unknown.eligibility, "not_verified");
  assert.equal(groupRecommendation(unknown), "eligibility_not_verified");
});

test("does not interpret missing age or experience as zero", () => {
  const match = scoreOpportunity(
    { age: null, experience_years: null, gender: null, state: "Karnataka" },
    {
      location: "Karnataka",
      age_min: 18,
      experience_min: 2,
      gender_eligibility: "female",
    },
  );

  assert.equal(match.eligibility, "not_verified");
  assert.notEqual(match.eligibility, "criteria_mismatch");
});

test("upserts a normalized-title duplicate and retains every original URL", async () => {
  const record = {
    id: "existing",
    title: "Weaver Training Programme",
    normalized_title: "weaver-training-programme",
    category: "COURSE_OR_TRAINING",
    source_name: "Existing source",
    source_url: "https://handlooms.gov.in/training",
    source_urls: ["https://handlooms.gov.in/training"],
    provider: "National Institute",
    description: "Original description",
    status: "active",
    review_status: "approved",
    is_removed: false,
  };
  const supabase = opportunityStore([record]);

  const result = await saveOpportunity(supabase, {
    ...record,
    id: undefined,
    source_name: "Another source",
    source_url: "https://nsdcindia.org/training",
    source_urls: ["https://nsdcindia.org/training"],
    description: "Updated source description",
    last_checked_at: "2026-01-01T00:00:00.000Z",
    last_crawled_at: "2026-01-01T00:00:00.000Z",
    last_verified_at: null,
    updated_at: "2026-01-01T00:00:00.000Z",
  });

  assert.equal(result, "updated");
  assert.equal(supabase.rows.length, 1);
  assert.equal(supabase.rows[0].source_url, "https://handlooms.gov.in/training");
  assert.deepEqual(supabase.rows[0].source_urls, [
    "https://handlooms.gov.in/training",
    "https://nsdcindia.org/training",
  ]);
  assert.equal(supabase.rows[0].review_status, "pending");
  assert.equal(supabase.rows[0].status, "unverified");
});

test("extracts structured opportunity data and rejects unlisted application URLs", async () => {
  const previous = {
    apiKey: process.env.LLM_API_KEY,
    baseUrl: process.env.LLM_BASE_URL,
    model: process.env.LLM_MODEL,
    fetch: globalThis.fetch,
  };
  const expected = {
    category: "GOVERNMENT_SCHEME",
    title: "Weaver Support Scheme",
    description: "Financial assistance for registered handloom weavers.",
    provider: "Handloom Development Department",
    location: "Karnataka",
    business_category: "Handloom",
    product_category: "Textiles",
    target_audience: "Registered handloom weavers",
    eligibility_requirements: "Applicants must be registered weavers.",
    benefits: "Financial assistance",
    fees: null,
    start_date: null,
    deadline: "2027-11-30",
    application_url: "https://example.org/not-in-page-links",
    application_procedure: null,
    duration: null,
    delivery_mode: null,
    certification: null,
    event_date: null,
    venue: null,
    accepted_products: null,
    buyer_details: null,
    experience_min: null,
    age_min: 18,
    age_max: null,
    gender_eligibility: "female",
  };

  process.env.LLM_API_KEY = "test-key";
  process.env.LLM_BASE_URL = "https://llm.example/v1";
  process.env.LLM_MODEL = "test-model";
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ choices: [{ message: { content: JSON.stringify(expected) } }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  try {
    const extracted = await extractArtisanOpportunity({
      sourceUrl: "https://handlooms.gov.in/schemes/weaver-support",
      text: "A source-backed opportunity page with enough description and eligibility information to extract.",
      links: ["https://handlooms.gov.in/schemes/weaver-support"],
    });

    assert.equal(extracted.category, "GOVERNMENT_SCHEME");
    assert.equal(extracted.business_category, "Handloom");
    assert.equal(extracted.product_category, "Textiles");
    assert.equal(extracted.application_url, null);
    assert.equal(extracted.deadline, "2027-11-30");
    assert.equal(extracted.age_min, 18);
  } finally {
    if (previous.apiKey === undefined) delete process.env.LLM_API_KEY;
    else process.env.LLM_API_KEY = previous.apiKey;
    if (previous.baseUrl === undefined) delete process.env.LLM_BASE_URL;
    else process.env.LLM_BASE_URL = previous.baseUrl;
    if (previous.model === undefined) delete process.env.LLM_MODEL;
    else process.env.LLM_MODEL = previous.model;
    globalThis.fetch = previous.fetch;
  }
});

function opportunityStore(rows) {
  return {
    rows,
    from(table) {
      assert.equal(table, "opportunities");
      const filters = [];
      let update = null;
      const query = {
        select() {
          return this;
        },
        eq(column, value) {
          filters.push([column, value]);
          return this;
        },
        limit() {
          return this;
        },
        async maybeSingle() {
          const row = rows.find((item) => filters.every(([key, value]) => item[key] === value));
          return { data: row ?? null, error: null };
        },
        insert(record) {
          rows.push({ ...record, id: "inserted" });
          return Promise.resolve({ error: null });
        },
        update(record) {
          update = record;
          return this;
        },
        then(resolve, reject) {
          const id = filters.find(([key]) => key === "id")?.[1];
          const row = rows.find((item) => item.id === id);
          if (update) {
            if (row) Object.assign(row, update);
            return Promise.resolve({ error: null }).then(resolve, reject);
          }
          const matchingRows = rows.filter((item) =>
            filters.every(([key, value]) => item[key] === value),
          );
          return Promise.resolve({ data: matchingRows, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
}
