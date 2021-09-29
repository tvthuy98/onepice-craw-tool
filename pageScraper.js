const fs = require('fs');
const request = require('request');
const childProcess = require('child_process');

const downloadLoc = 'downloaded';

function download(uri, filename, callback) {
  return new Promise((resolve, reject) => {
    request({
      url: uri,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.54 Safari/537.36',
      },
    }).pipe(fs.createWriteStream(filename)).on('close', resolve).on('error', reject);
  })
};

const scraperObject = {
  //Change url to link you're scraping from
  url: 'http://www.nettruyenpro.com/truyen-tranh/dao-hai-tac/chap-932/441780',
  async scraper(browser) {
    let page = await browser.newPage();

    console.log(`Navigating to ${this.url}...`);
    await page.goto(this.url);
    // await page.waitForTimeout(500);

    const chapterStart = this.url.indexOf('chap-');
    const chapterEnd = this.url.lastIndexOf('/') - chapterStart;
    const chapterName = this.url.substr(chapterStart, chapterEnd);
    const saveLoc = `${downloadLoc}/${chapterName}`;

    const imageUrls = await page.evaluate(() => {
      return Array.from(document.querySelector("#ctl00_divCenter > div > div.reading-detail.box_doc").querySelectorAll('.page-chapter')).map(i => i.querySelector('img').src);
    });

    if (!fs.existsSync(downloadLoc)) {
      fs.mkdirSync(saveLoc, { recursive: true });
    }
    const downloadedFiles = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      const fileNameStart = url.lastIndexOf('/') + 1;
      const fileNameEnd = url.indexOf('?') - fileNameStart;
      const fileName = url.substr(fileNameStart, fileNameEnd);
      childProcess.execSync(`curl '${url}' \
        -H 'Connection: keep-alive' \
        -H 'Cache-Control: max-age=0' \
        -H 'Upgrade-Insecure-Requests: 1' \
        -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.54 Safari/537.36' \
        -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9' \
        -H 'Referer: http://www.nettruyenpro.com/' \
        -H 'Accept-Language: en-US,en;q=0.9,vi;q=0.8' \
        --compressed \
        --insecure > ${saveLoc}/${fileName}`)
      downloadedFiles.push(`${saveLoc}/${fileName}`);
    }

    for (let i = 0; i < downloadedFiles.length; i++) {
      childProcess.execSync(`convert ${downloadedFiles[i]} -resize 600x800\! ${downloadedFiles[i]}`);
    }
    //Program successfully completed
    await browser.close();
    console.log('Program completed!')
  }
}

module.exports = scraperObject;
