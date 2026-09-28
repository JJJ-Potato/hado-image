const fs = require("fs");
const path = require("path");
const mustache = require("mustache");
const { chromium } = require("playwright");

async function main() {
  const [, , templateArg, dataArg, outArg] = process.argv;
  const templatePath = path.resolve(templateArg || "templates/infographic.html");
  const dataPath = path.resolve(dataArg || "data/sample.json");
  const outPath = path.resolve(outArg || "output/infographic.png");

  const templateHtml = fs.readFileSync(templatePath, "utf-8");
  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const html = mustache.render(templateHtml, data);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  // 상대경로(css, ../fonts/*)가 풀리도록 템플릿과 같은 폴더에 임시로 렌더링한 뒤 file://로 연다
  const tmpPath = path.join(path.dirname(templatePath), `.__render_${Date.now()}.html`);
  fs.writeFileSync(tmpPath, html, "utf-8");

  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ deviceScaleFactor: 2 });
    await page.goto(`file://${tmpPath}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    const canvas = page.locator(".canvas");
    const box = await canvas.boundingBox();
    await page.setViewportSize({ width: Math.ceil(box.width), height: Math.ceil(box.height) });
    await canvas.screenshot({ path: outPath });
  } finally {
    await browser?.close();
    fs.rmSync(tmpPath, { force: true });
  }

  console.log(`저장됨: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
