# WebScraper

WebScraper, as the name implies, scrapes data from web sites using browser automation powered by Playwright.

## Instructions

1. From the root, run `npm install`
2. From the root, run `npx playwright install`
3. From the root, run `npm run build`
4. From the root, run `node ./dist/scraper.js <url>` replacing `<url>` with whatever site you want to scrape, ie: `node ./dist/scraper.js https://www.zillow.com/homes/Minneapolis,-MN_rb/`
5. You should see Firefox launch, and things should start running
6. View output in listings.csv

## Notes

- As of right now, this is hardcoded to scrape property listings from Zillow. It shouldn't be too difficult to build in some abstraction that allows you to scrape multiple sites. Or else just create different scripts for each site.
- Zillow has anti-scraping measures deployed. My first attempt at this used `puppeteer`, but Zillow immediately flagged headless chrome as a bot. I got further using `puppeteer-extra-plugin-stealth`, but even that was flagged as bot, and blocked by Captcha. I tried a bunch of different things, including spoofing the user-agent, randomizing the viewport, etc, but `puppeteer` was always flagged as a bot. I had much better luck using Playwright. As far as I can tell, Mozilla driven by Playwright has a totally legitimate user-agent, so Zillow doesn't flag it as a bot. I suspect they would have to implement some more sophisticated client-side detection to do so (heuristic based, for example).
- Zillow also seems to have some insane front-end code deployed. The CSS classes change seemingly at random, and the DOM structure changes as well. I'm not sure if they just have a really messy CMS system, or if they are intentionally complicating things to prevent scrubbing of their site. I have most CSS selectors working reliably, but I would not be surprised if some fields were not being found consistently. I would also not be surprised if this code were to completely break in the not-too-distant future. But fixing it would probably be as simple as updating the CSS selectors.
- Due to the above, I'm often looking for a certain field using more than one selector, and then looking to see which one returned something. It's not perfect.
- Also due to the above, I wasn't able to reliably use the `.waitForSelector()` type awaiters in Playwright, and instead I'm just using `.waitForTimeout()`. This is unfortunate, because the script is often stuck waiting far longer than it needs to, but it was the only way I could get this working reliably.