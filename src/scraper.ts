import fs from "fs";
import playwright from 'playwright';

const outputFile = "./listings.csv";

const outputHeaders: string[] = [
  "Listing Url",
  "Address",
  "City",
  "State",
  "Zip",
  "Price",
  "Bedrooms",
  "Bathrooms",
  "ZEstimate",
  "Rent Estimate",
  "Estimated Payment",
  "Square Footage",
  "Time On Zillow",
  "MLS Number",
  "Year Built",
  "HOA Fee",
  "Scrubbed At"
];

const processPage = async (page: playwright.Page) => {
  console.log("Processing page...");
  //await page.screenshot({path: "./page.png"});

  let index = 1;

  while (true) {
    try {
      const listing = await page.$(`#grid-search-results ul.photo-cards > li:nth-of-type(${index})`);
      const link = await page.$(`#grid-search-results ul.photo-cards > li:nth-of-type(${index}) article.list-card a.list-card-img`);

      // if the li doesn't exist, we're at the end of the page
      if (!listing) {
        console.log("Found the end of the page, moving to next page.");

        break;
      }

      // if the li exists, but the "a.list-card-img" doesn't exist, it means we found an ad. skip it.
      if (listing && !link) {
        console.log("Found an ad, skipping it.");

        index++;
        continue;
      }

      // listings are lazy loaded, so continually scroll down the page to make sure next items are loaded into DOM
      link?.scrollIntoViewIfNeeded();

      await page.waitForTimeout(1000);

      const addressBlock = await (await page.$(`#grid-search-results ul.photo-cards > li:nth-of-type(${index}) article.list-card address`))?.innerHTML();
      const splitAddress = addressBlock?.split(", ");
      const address = (splitAddress && splitAddress.length === 3 && splitAddress[0]) as string ?? "";
      const city = (splitAddress && splitAddress.length === 3 && splitAddress[1]) as string ?? "";
      const stateZip = splitAddress && splitAddress.length === 3 && splitAddress[2].split(" ");
      const state = (stateZip && stateZip.length === 2 && stateZip[0]) as string ?? "";
      const zip = (stateZip && stateZip.length === 2 && stateZip[1]) as string ?? "";

      const price = ((await (await page.$(`#grid-search-results ul.photo-cards > li:nth-of-type(${index}) article.list-card div.list-card-price`))?.innerHTML()) as string ?? "").replace(/,/g, "");

      const bedrooms = ((await (await page.$(`#grid-search-results ul.photo-cards > li:nth-of-type(${index}) article.list-card ul.list-card-details li:nth-of-type(1)`))?.innerText()) as string ?? "").replace(" bds", "");

      const bathrooms = ((await (await page.$(`#grid-search-results ul.photo-cards > li:nth-of-type(${index}) article.list-card ul.list-card-details li:nth-of-type(2)`))?.innerText()) as string ?? "").replace(" ba", "");

      const squareFeet = ((await  (await page.$(`#grid-search-results ul.photo-cards > li:nth-of-type(${index}) article.list-card ul.list-card-details li:nth-of-type(3)`))?.innerText()) as string ?? "").replace(/,/g, "").replace(" sqft", "");

      link?.evaluate(l => (l as HTMLElement).click());
      await page.waitForTimeout(8000);
      //await page.screenshot({path: `./listing${index}.png`});
      await processListing(page, address, city, state, zip, price, bedrooms, bathrooms, squareFeet);

      index++;
    } catch (err) {
      // wtf
      index++;
    }
  }
}
  
const processListing = async (page: playwright.Page, address: string, city: string, state: string, zip: string, price: string, bedrooms: string, bathrooms: string, squareFootage: string) => {
  console.log("Processing listing...");

  const listingUrl = page.url();

  // zestimate
  const zestimate1 = (await (await page.$("#ds-container .ds-chip button#dsChipZestimateTooltip + span"))?.textContent() as string ?? "").replace(/,/g, "");
  const zestimate2 = (await (await page.$("#details-page-container button + span.Text-c11n-8-53-2__sc-aiai24-0 > span"))?.textContent() as string ?? "").replace(/,/g, "");
  var zestimate = "";
  if (zestimate1)
    zestimate = zestimate1;
  else if (zestimate2)
    zestimate = zestimate2;

  // rent estimate
  const rentEstimate = ((await (await page.$("#ds-rental-home-values #ds-primary-zestimate-tooltip + div span"))?.innerHTML()) as string ?? "" ).replace(/,/g, "").replace("/mo", "");
  
  // estimated payment
  const estimatedPayment1 = ((await (await page.$("#skip-link-monthly-costs + div span:nth-of-type(2)"))?.textContent()) as string ?? "").replace(/,/g, "").replace("/mo", "");
  const estimatedPayment2 = ((await (await page.$("#ds-container .ds-mortgage-row > div > div > span:nth-of-type(2)"))?.textContent()) as string ?? "").replace(/,/g, "").replace("/mo", "");
  const estimatedPayment3 = ((await (await page.$(".summary-container > div > div > div:nth-of-type(4) > div > span:nth-of-type(2)"))?.textContent()) as string ?? "").replace(/,/g, "").replace("/mo", "");
  var estimatedPayment = ""  
  if (estimatedPayment1)
    estimatedPayment = estimatedPayment1;
  else if (estimatedPayment2)
    estimatedPayment = estimatedPayment2;
  else if (estimatedPayment3)
    estimatedPayment = estimatedPayment3;

  // time on zillow
  const timeOnZillow = (await (await page.$("#skip-link-overview + div > div > div:nth-of-type(2) > div > div > div > div:nth-of-type(2)"))?.innerText()) as string ?? "";
  
  // mls number
  const mlsNumberBlock = (await (await page.$("#skip-link-overview + div > div > div:nth-of-type(2) > div > div:nth-of-type(4) > span:nth-of-type(2)"))?.innerText()) as string ?? "";
  const mlsNumber = mlsNumberBlock.includes("MLS") ? mlsNumberBlock : "";

  // year built
  const yearBuilt = ((await (await page.$("#skip-link-facts-features + div li:nth-of-type(2)"))?.innerText()) as string ?? "").replace("Built in ", "");
  
  // hoa fee
  const hoaFeeBlock = ((await (await page.$("#skip-link-facts-features + div li:nth-of-type(6)"))?.innerText()) as string ?? "" ).replace(/,/g, "");
  const hoaFee = hoaFeeBlock.includes("HOA") ? hoaFeeBlock : "";

  writeLine(`${listingUrl},${address},${city},${state},${zip},${price},${bedrooms},${bathrooms},${zestimate},${rentEstimate},${estimatedPayment},${squareFootage},${timeOnZillow},${mlsNumber},${yearBuilt},${hoaFee},${getDateTime()}`);

  const backButton = await page.$(".ds-close-lightbox-icon");
  backButton?.click();
  
  await page.waitForTimeout(5000);
}

const writeLine = (text: string) => {
  fs.writeFile(outputFile, `${text}\n`, { flag: 'a+' }, err => {
    if (err) {
      console.error(err);
    }
  });
}

const getDateTime = () => {
  const date_ob = new Date();

  // current date
  // adjust 0 before single digit date
  const date = ("0" + date_ob.getDate()).slice(-2);

  // current month
  const month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

  // current year
  const year = date_ob.getFullYear();

  // current hours
  const hours = date_ob.getHours();

  // current minutes
  const minutes = date_ob.getMinutes();

  // current seconds
  const seconds = date_ob.getSeconds();

  return year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
}
  
async function main() {
  try {
    // print process.argv
    const url = process.argv[2];

    // clear output file contents
    fs.truncate(outputFile, 0, () => {});

    // write output file headers
    writeLine(outputHeaders.join(","));

    const browser = await playwright.firefox.launch({
      headless: false
    });

    const page = await browser.newPage();

    await page.goto(url);
    await page.waitForTimeout(8000);

    while (true)
    {
      await processPage(page);

      const nextPageButton = await page.$("a[title='Next page']:not([disabled])");
      if (nextPageButton) {
        // if the "next page" button is active, click it and process the next page
        nextPageButton.click();
        await page.waitForTimeout(8000);
      } else {
        // if the "next page" button doesn't exist, or is disabled, we're done
        break;
      }
    }
    await browser.close();
  } catch (err) {
    // wtf
  }
}

main();