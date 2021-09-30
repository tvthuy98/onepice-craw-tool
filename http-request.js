const childProcess = require('child_process');
const DOMParser = require('dom-parser');
const fs = require('fs');
const httpGet = require('./httpGet');
const parser = new DOMParser();

const imageSize = '900x1200';
let downloadLoc = '';

main(10).catch(err => {
    console.log('[x] ERROR: ', err);
});

async function main(downloadLimit) {
    let url = fs.readFileSync('last-stop.txt').toString('utf-8');
    console.log('url', url);
    let currentDownload = 0;
    const currentChap = +getChapterName(url).split('-')[1]
    downloadLoc = `one_piece_${currentChap}-${currentChap + downloadLimit-1}`;

    if (!fs.existsSync(downloadLoc)) {
        fs.mkdirSync(downloadLoc, { recursive: true });
    }

    while (currentDownload < downloadLimit) {
        const chapterId = await downloadBatchImages(url, await getImageUrls(url));
        
        console.log('[x] : download finised: ', url);
        url = await getNextChapter(url, chapterId);
        console.log('[x] next chapter url: ', url);
        currentDownload += 1;
        fs.writeFileSync('last-stop.txt', Buffer.from(url));
        await sleep(3000);
    }
}
// =========================

function sleep(time) {
    let start = Date.now();
    let threshold = 1000;
    console.log('resting...');
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            if (Date.now() > start + time) {
                clearInterval(interval);
                resolve();
            }
            else console.log('.')
        }, time < threshold ? time : threshold)
    });
}

function getChapterName(url) {
    const chapterStart = url.indexOf('chap-');
    const chapterEnd = url.lastIndexOf('/') - chapterStart;
    const chapterName = url.substr(chapterStart, chapterEnd);

    return chapterName;
}


async function getImageUrls(chapterUrl) {
    const html = await httpGet(chapterUrl);
    const dom = parser.parseFromString(html);
    const pageChapters = dom.getElementsByClassName("page-chapter");
    return pageChapters.map(i => 'http:' + i.firstChild.getAttribute('src'));
}

async function downloadImage(url, chapterName) {
    const fileNameStart = url.lastIndexOf('/') + 1;
    const fileNameEnd = url.indexOf('?') - fileNameStart;
    const fileName = url.substr(fileNameStart, fileNameEnd);
    const saveLoc = `${downloadLoc}/${chapterName}-${fileName}`;
    const file = fs.createWriteStream(saveLoc);

    await httpGet(url, {
        headers: {
            'Referer': 'http://www.nettruyenpro.com/'
        }
    }, file);

    return saveLoc;
}

function resizeImage(path) {
    return new Promise((resolve, reject) => {
        console.log('[x] resizing...', path);
        childProcess.exec(`magick ${path} -resize ${imageSize}\\! ${path}`, (err, out) => {
            if (err) {
                console.log(`resize image failed: ${path}`);
                return reject(err);
            }
            resolve(true);
        });
    })
}

async function downloadBatchImages(baseurl, imageUrls) {
    const chapterName = getChapterName(baseurl);
    let downloadedFiles = [];
    let chuck = [];
    while (imageUrls.length > 0) {
        chuck = imageUrls.splice(0, 5);
        downloadedFiles = downloadedFiles.concat(await Promise.all(
            chuck.map((chapurl) => downloadImage(chapurl, chapterName))
        ));
        await sleep(1000);
    }
    await Promise.all(downloadedFiles.map(resizeImage));
    return baseurl.substr(baseurl.lastIndexOf('/') + 1);
}

function getNextChapter(url, chapId) {
    return httpGet(`http://www.nettruyenpro.com/Comic/Services/ComicService.asmx/GetNextChapter?chapterId=${chapId}`, {
        headers: {
            'Referer': url
        }
    }).then(res => res.url);
}

