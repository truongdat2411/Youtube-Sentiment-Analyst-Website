import { chromium } from "playwright";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";
const ANALYZE_ENDPOINT = "http://localhost:8000/api/analyze";
const VALID_YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const TIMEOUT_MESSAGE = "Analyze request timed out after 90s.";

function line(title, value) {
  console.log(`${title}: ${value}`);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(30_000);
  const consoleLogs = [];

  page.on("console", (message) => {
    consoleLogs.push(message.text());
  });

  line("step", "open frontend");
  await page.goto(FRONTEND_URL, { waitUntil: "domcontentloaded" });

  const youtubeInput = page.getByPlaceholder("https://www.youtube.com/watch?v=...");
  line("step", "submit valid analyze request");
  await youtubeInput.fill(VALID_YOUTUBE_URL);
  await page.locator("form select").first().selectOption("50");
  await page.getByRole("button", { name: "Analyze" }).click();

  await page.getByText("Analyzing comments... Please wait.").waitFor({ timeout: 120_000 });
  await page.getByText("Analyzing comments... Please wait.").waitFor({
    state: "hidden",
    timeout: 120_000,
  });

  line("step", "wait for visible result rows");
  await page.waitForFunction(
    () => {
      const summary = Array.from(document.querySelectorAll("p")).find((node) =>
        (node.textContent || "").includes("Video:")
      );
      const text = summary?.textContent || "";
      const match = text.match(/Total:\s*(\d+)/);
      return !!match && Number(match[1]) > 0;
    },
    { timeout: 120_000 }
  );

  const tableRows = await page.locator("tbody tr").count();
  const cards = await page.locator("article").count();
  const renderedRows = tableRows + cards;

  line("step", "submit invalid url");
  await youtubeInput.fill("https://example.com/not-youtube");
  await youtubeInput.press("Tab");
  await page.getByText("Please enter a valid YouTube link.").waitFor({ timeout: 20_000 });

  const failureRoute = async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 504,
      contentType: "application/json",
      body: JSON.stringify({ detail: TIMEOUT_MESSAGE }),
    });
    await page.unroute(ANALYZE_ENDPOINT, failureRoute);
  };

  line("step", "submit timeout/failure case");
  await page.route(ANALYZE_ENDPOINT, failureRoute);
  await youtubeInput.fill(VALID_YOUTUBE_URL);
  await page.getByRole("button", { name: "Analyze" }).click();
  await page.getByText(TIMEOUT_MESSAGE).waitFor({ timeout: 20_000 });

  const appLogs = consoleLogs.filter(
    (entry) => entry.includes("[analyze]") || entry.includes("[comment-table]")
  );
  const markers = [
    "[analyze] submitted",
    "[analyze] request started",
    "[analyze] items length before normalization",
    "[analyze] normalized rows length",
    "[analyze] loading state changed",
    "[analyze] error state changed",
    "[comment-table] received row count",
  ];

  line("UI rendered rows/cards", renderedRows);
  line("Captured frontend debug logs", appLogs.length);
  line("Sample frontend log", appLogs[0] ?? "none");
  const successRaw = appLogs.find(
    (entry) => entry.includes("[analyze] raw response received") && entry.includes("video_id")
  );
  const invalidRaw = appLogs.find((entry) =>
    entry.includes("[analyze] raw response received")
  );
  const timeoutRaw = appLogs.find(
    (entry) =>
      entry.includes("[analyze] raw response received") &&
      entry.includes("Analyze request timed out after 90s.")
  );
  const successKeys = appLogs.find(
    (entry) => entry.includes("[analyze] response keys") && entry.includes("items")
  );
  const timeoutKeys = appLogs.find(
    (entry) => entry.includes("[analyze] response keys") && entry.includes("detail")
  );
  line("Success raw response marker", successRaw ?? "not found");
  line("Success response keys marker", successKeys ?? "not found");
  line("Invalid URL raw response marker", invalidRaw ?? "frontend blocked before request");
  line("Timeout raw response marker", timeoutRaw ?? "not found");
  line("Timeout response keys marker", timeoutKeys ?? "not found");
  for (const marker of markers) {
    const matched = appLogs.filter((entry) => entry.includes(marker));
    line(`Marker ${marker}`, matched.length > 0 ? matched[matched.length - 1] : "not found");
  }

  await browser.close();
}

run().catch((error) => {
  console.error("e2e-browser-submit failed:", error);
  process.exit(1);
});
