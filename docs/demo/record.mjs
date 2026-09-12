import { chromium } from 'playwright-core';
const b = await chromium.launch({ channel: 'chrome', args:['--force-device-scale-factor=1','--hide-scrollbars'] });
const ctx = await b.newContext({
  viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1,
  recordVideo: { dir: 'out', size: { width: 1280, height: 720 } },
});
const p = await ctx.newPage();
await p.goto('file:///Users/aryand/Desktop/MoveLog/docs/demo/index.html');
await p.waitForTimeout(121000);
await ctx.close(); await b.close();
console.log('recorded');
