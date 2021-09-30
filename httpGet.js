const get = require('http').get;
const stream = require('stream');

function httpGet(url, options = {}, writeable) {
    const headers = Object.assign({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36 Edg/94.0.992.31',
    }, (options.headers));
    delete options.headers;
    return new Promise((resolve, reject) => {
        get(url, {
            headers,
            ...options,
        }, (res) => {
            let result = '';
            if (writeable instanceof stream.Writable) {
                res.pipe(writeable);
            } else {
                res.on('data', (chuck) => {
                    result += chuck;
                });
            }

            res.on('end', () => {
                if (res.statusCode !== 200) {
                    return reject(result);
                }

                try {
                    resolve(JSON.parse(result));
                } catch (e) {
                    resolve(result);
                }

            });

            res.on('error', (error) => {
                reject(error);
            });
        })
    });
}

module.exports = httpGet;