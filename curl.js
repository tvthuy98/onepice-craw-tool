const childProcess = require('child_process');
const DOMParser = require('dom-parser');
const fs = require('fs');

const downloadLimit = 5;
const currentChap = 940;
const downloadLoc = `one_piece_${currentChap}-${currentChap + downloadLimit}`;

if (!fs.existsSync(downloadLoc)) {
    fs.mkdirSync(downloadLoc, { recursive: true });
}

async function main() {
    let url = 'http://www.nettruyenpro.com/truyen-tranh/dao-hai-tac/chap-940/460087';
    let currentDownload = 1;

    while (currentDownload < downloadLimit) {
        try {
            const chapterId = await downloadFiles(url, getImageUrls(url));
            url = getNextChapter(url, chapterId);
            currentDownload += 1;
        } catch(err) {
            console.log(err);
            break;
        }
    }
}

main();
// =========================

function getImageUrls(chapterUrl) {
    const html = childProcess.execSync(`curl '${chapterUrl}' \
        -H 'Connection: keep-alive' \
        -H 'Cache-Control: max-age=0' \
        -H 'Upgrade-Insecure-Requests: 1' \
        -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.54 Safari/537.36' \
        -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9' \
        -H 'Referer: http://www.nettruyenpro.com/' \
        -H 'Accept-Language: en-US,en;q=0.9,vi;q=0.8' \
        --compressed \
        --insecure`).toString('utf-8');
    fs.writeFileSync('curl.html', Buffer.from(html));
    const parser = new DOMParser();
    const dom = parser.parseFromString(html);
    const pageChapters = dom.getElementsByClassName("page-chapter");
    return Array.from(pageChapters).map(i => 'http:' + i.firstChild.getAttribute('src'));
}

async function downloadImage(url, chapterName) {
    return new Promise((resolve, reject) => {
        const fileNameStart = url.lastIndexOf('/') + 1;
        const fileNameEnd = url.indexOf('?') - fileNameStart;
        const fileName = url.substr(fileNameStart, fileNameEnd);
        const saveLoc = `${downloadLoc}/${chapterName}-${fileName}`;
        childProcess.exec(`curl '${url}' \
        -H 'Connection: keep-alive' \
        -H 'Cache-Control: max-age=0' \
        -H 'Upgrade-Insecure-Requests: 1' \
        -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.54 Safari/537.36' \
        -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9' \
        -H 'Referer: http://www.nettruyenpro.com/' \
        -H 'Accept-Language: en-US,en;q=0.9,vi;q=0.8' \
        --compressed \
        --insecure > ${saveLoc}`, (err, out) => {
            if (err) return reject(err);
            console.log(saveLoc);
            resolve(saveLoc);
        });
    });
}

function resizeImage(path) {
    return new Promise((resolve, reject) => {
        console.log('[x] resizing...', path);
        childProcess.exec(`convert ${path} -resize 600x800\! ${path}`, (err, out) => {
            if (err) return reject(`resize image failed: ${path}`);
            resolve(true);
        });
    })
}

async function downloadFiles(baseurl, imageUrls) {
    const chapterStart = baseurl.indexOf('chap-');
    const chapterEnd = baseurl.lastIndexOf('/') - chapterStart;
    const chapterName = baseurl.substr(chapterStart, chapterEnd);
    const downloadedFiles = await Promise.all(imageUrls.map((chapurl) => downloadImage(chapurl, chapterName)));
    await Promise.all(downloadedFiles.map(resizeImage));
    console.log('[x] : done', baseurl);
    return baseurl.substr(baseurl.lastIndexOf('/') + 1);
}

function getNextChapter(url, chapId) {
    const res = childProcess.execSync(`curl 'http://www.nettruyenpro.com/Comic/Services/ComicService.asmx/GetNextChapter?chapterId=${chapId}' \
    -H 'Referer: ${url}' \
    -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36 Edg/94.0.992.31' \
    --compressed \
    --insecure`).toString('utf-8');
    return JSON.parse(res).url;
}

