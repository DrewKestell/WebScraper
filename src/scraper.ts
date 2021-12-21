import fs from "fs";
import playwright from 'playwright';

const timeout = 8000;
const outputFile = "./listings.csv";

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

const processPage = async (page: playwright.Page) => {
  console.log("Processing page...");
  await page.screenshot({path: "./page.png"});

  let index = 0;

  while (true) {
    const listings = await page.$$("a.list-card-img");
    const listing = listings[index];

    if (!listing) {
      break;
    }

    listing.scrollIntoViewIfNeeded();

    await page.waitForTimeout(timeout);

    const li = await page.$(`#grid-search-results ul.photo-cards > li:nth-of-type(${index})`);
    console.log(await li?.getProperty("classList"));
    console.log(await li?.getProperty("class"));

    const addressBlock = await (await page.$(`#grid-search-results ul.photo-cards > li:nth-of-type(${index}) article.list-card address`))?.innerText();
    const splitAddress = addressBlock?.split(", ");
    const address = (splitAddress && splitAddress.length === 3 && splitAddress[0]) as string ?? "";
    const city = (splitAddress && splitAddress.length === 3 && splitAddress[1]) as string ?? "";
    const stateZip = splitAddress && splitAddress.length === 3 && splitAddress[2].split(" ");
    const state = (stateZip && stateZip.length === 2 && stateZip[0]) as string ?? "";
    const zip = (stateZip && stateZip.length === 2 && stateZip[1]) as string ?? "";

    const price = (await (await page.$(`#grid-search-results ul.photo-cards > li:nth-of-type(${index}) article.list-card div.list-card-price`))?.innerText()) as string ?? "";;

    const bedrooms = (await (await page.$(`#grid-search-results ul.photo-cards > li:nth-of-type(${index}) article.list-card ul.list-card-details li:nth-of-type(1)`))?.innerText()) as string ?? "";;

    const bathrooms = (await (await page.$(`#grid-search-results ul.photo-cards > li:nth-of-type(${index}) article.list-card ul.list-card-details li:nth-of-type(2)`))?.innerText()) as string ?? "";;

    const squareFeet = (await  (await page.$(`#grid-search-results ul.photo-cards > li:nth-of-type(${index}) article.list-card ul.list-card-details li:nth-of-type(3)`))?.innerText()) as string ?? "";;

    await listing.evaluate(l => (l as HTMLElement).click());
    await page.waitForTimeout(timeout);
    await page.screenshot({path: `./listing${index}.png`});
    await processListing(page, address, city, state, zip, price, bedrooms, bathrooms, squareFeet);

    index++;
  }
  
  const footer = await page.$("#region-info-footer");
  await footer?.scrollIntoViewIfNeeded();

  console.log("Done processing page.");
}
  
const processListing = async (page: playwright.Page, address: string, city: string, state: string, zip: string, price: string, bedrooms: string, bathrooms: string, squareFeet: string) => {
  console.log("Processing listing...");

  const listingUrl = page.url();

  // zestimate
  const zestimate = await (await (await page.$(".ds-chip div.hdp__sc-11h2l6b-2 span.Text-c11n-8-53-2__sc-aiai24-0"))?.getProperty("innerText"))?.jsonValue();
  
  // rent estimate
  const rentEstimate = await (await (await page.$("#ds-rental-home-values span.Text-c11n-8-53-2__sc-aiai24-0"))?.getProperty("innerText"))?.jsonValue();
  
  // estimated payment
  const estimatedPayment = await (await (await page.$("div[class='hdp__sc-1tsvzbc-1 ds-chip'] div[class='Spacer-c11n-8-53-2__sc-17suqs2-0 dAArjJ'] span:nth-child(1)"))?.getProperty("innerText"))?.jsonValue();
  
  // square footage
  const squareFootage = await (await (await page.$("body > div:nth-child(4) > div:nth-child(10) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(5) > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(2) > div:nth-child(4) > div:nth-child(4) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > span:nth-child(1) > span:nth-child(5) > span:nth-child(1)"))?.getProperty("innerText"))?.jsonValue();
  
  // time on zillow
  const timeOnZillow = await (await (await page.$("div[class='hdp__sc-qe1dn6-0 jAEoY'] div:nth-child(1) div:nth-child(1)"))?.getProperty("innerText"))?.jsonValue();
  
  // mls number
  const mlsNumber = await (await (await page.$("div[class='Flex-c11n-8-53-2__sc-n94bjd-0 eLPOfN'] span:nth-child(1)"))?.getProperty("innerText"))?.jsonValue();
  
  // year built
  const yearBuilt = await (await (await page.$("div[class='Spacer-c11n-8-53-2__sc-17suqs2-0 eRCcvt'] li:nth-child(1) span:nth-child(1)"))?.getProperty("innerText"))?.jsonValue();
  
  // hoa fee
  const hoaFee = await (await (await page.$("div[class='Spacer-c11n-8-53-2__sc-17suqs2-0 eRCcvt'] li:nth-child(1) span:nth-child(1)"))?.getProperty("innerText"))?.jsonValue();

  writeLine(`${listingUrl},${price},${bedrooms},${bathrooms},${address},${zestimate},${rentEstimate},${city},${zip},${estimatedPayment},${squareFootage},${timeOnZillow},${mlsNumber},${yearBuilt},${hoaFee}`);

  page.goBack();

  await page.waitForTimeout(timeout);
}

const writeLine = (text: string) => {
  fs.writeFile(outputFile, `${text}\n`, { flag: 'a+' }, err => {
    if (err) {
      console.error(err);
    }
  });
}
  
async function main() {
  // clear output file contents
  fs.truncate(outputFile, 0, () => {});

  // write output file headers
  writeLine(outputHeaders.join(","));

  const browser = await playwright.firefox.launch({
    headless: false
  });

  const page = await browser.newPage();

  await page.goto("https://www.zillow.com/homes/Minneapolis,-MN_rb/");
  await page.waitForTimeout(timeout);

  while (true)
  {
    await processPage(page);

    const nextPageButton = await page.$("a[title='Next page']:not([disabled])");
    if (nextPageButton) {
      // if the "next page" button is active, click it and process the next page
      await nextPageButton.click();
      await page.waitForTimeout(timeout);
    } else {
      // if the "next page" button doesn't exist, or is disabled, we're done
      break;
    }
  }

  await browser.close();
}

main();