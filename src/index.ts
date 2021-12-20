import fs from "fs";
import { Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const outputFile: string = "./listings.csv";

const outputHeaders: string[] = [
  "Listing Url",
  "Price",
  "Bedrooms",
  "Bathrooms",
  "Address",
  "ZEstimate",
  "Rent Estimate",
  "City",
  "Zip",
  "Estimated Payment",
  "Square Footage",
  "Time On Zillow",
  "MLS Number",
  "Year Build",
  "HOA Fee"
];

const buildSession = async (): Promise<Page> => {
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();

  return page;
}

const processPage = async (page: Page) => {
  console.log("Processing page...");

  const listings = await page.$$("a.list-card-link list-card-link-top-margin list-card-img");

  console.log(`Found ${listings.length} listings on page.`);

  await page.screenshot({path: `./page.png`});

  for (var i = 0; i < listings.length; i++) {
    console.log(listings[i]);
    await listings[i].evaluate(l => (l as HTMLElement).click());
    await page.waitForTimeout(5000);
    await page.screenshot({path: `./listing${i}.png`});
    await processListing(page);
  }

  console.log("Done processing page.");
}
 
const processListing = async (page: Page) => {
  console.log("Processing listing...");

  const listingUrl = page.url();
  const price = await (await (await page.$(".ds-chip span span"))?.getProperty("innerText"))?.jsonValue();
  const bedrooms = await (await (await page.$(".ds-chip .ds-bed-bath-living-area-container > span:nth-of-type(1) span:nth-of-type(1)"))?.getProperty("innerText"))?.jsonValue();
  const bathrooms = await (await (await page.$(".ds-chip .TriggerText-c11n-8-53-2__sc-139r5uq-0 span:nth-of-type(1) span:nth-of-type(1)"))?.getProperty("innerText"))?.jsonValue();
  const address = await (await (await page.$(".ds-chip .StyledHeading-c11n-8-53-2__sc-ktujwe-0 span:nth-of-type(1)"))?.getProperty("innerText"))?.jsonValue();
  const zestimate = await (await (await page.$("	span.Text-c11n-8-53-2__sc-aiai24-0"))?.getProperty("innerText"))?.jsonValue();
  const rentEstimate = await (await (await page.$("#ds-rental-home-values span"))?.getProperty("innerText"))?.jsonValue();
  const city = await (await (await page.$(".hdp__sc-1tsvzbc-1 .StyledHeading-c11n-8-53-2__sc-ktujwe-0 span:nth-of-type(2)"))?.getProperty("innerText"))?.jsonValue();
  const zip = await (await (await page.$(".ds-chip .StyledHeading-c11n-8-53-2__sc-ktujwe-0 span:nth-of-type(2)"))?.getProperty("innerText"))?.jsonValue();
  const estimatedPayment = await (await (await page.$(".hdp__sc-1tsvzbc-1 .Spacer-c11n-8-53-2__sc-17suqs2-0 span:nth-of-type(2)"))?.getProperty("innerText"))?.jsonValue();
  const squareFootage = await (await (await page.$(".hdp__sc-1tsvzbc-1 span:nth-of-type(4) span:nth-of-type(1)"))?.getProperty("innerText"))?.jsonValue();
  const timeOnZillow = await (await (await page.$("div.hdp__sc-qe1dn6-1:nth-of-type(1) div.duChdW"))?.getProperty("innerText"))?.jsonValue();
  const mlsNumber = await (await (await page.$("span.iBdXNb:nth-of-type(2)"))?.getProperty("innerText"))?.jsonValue();
  const yearBuilt = await (await (await page.$("li:nth-of-type(2) span.dpf__sc-2arhs5-3"))?.getProperty("innerText"))?.jsonValue();
  const hoaFee = await (await (await page.$("li:nth-of-type(6) span.dpf__sc-2arhs5-3"))?.getProperty("innerText"))?.jsonValue();

  writeLine(`${listingUrl},${price},${bedrooms},${bathrooms},${address},${zestimate},${rentEstimate},${city},${zip},${estimatedPayment},${squareFootage},${timeOnZillow},${mlsNumber},${yearBuilt},${hoaFee}`);

  await page.goBack();

  await page.waitForTimeout(5000);
}

const writeLine = (text: string) => {
  fs.writeFile(outputFile, `${text}\n`, { flag: 'a+' }, err => {
    if (err) {
      console.error(err);
    }
  });
}

(async () => {
  // clear output file contents
  fs.truncate(outputFile, 0, () => {});

  // write output file headers
  writeLine(outputHeaders.join(","));

  const page = await buildSession();
  await page.goto("https://www.zillow.com/homes/Minneapolis,-MN_rb/");
  await page.waitForTimeout(5000);

  while (true)
  {
    await processPage(page);

    const nextPageButton = await page.$("a[title='Next page']:not([disabled])");
    if (nextPageButton) {
      // if the "next page" button is active, click it and process the next page
      await nextPageButton.click();
      await page.waitForNetworkIdle();
    } else {
      // if the "next page" button doesn't exist, or is disabled, we're done
      break;
    }
  }

  page.browser().close();
})();
