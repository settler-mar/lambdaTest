console.log('Loading function');

const aws = require('aws-sdk');

const loader = require('./app/loadCSV');
const db = require('./app/db')();

exports.handler = async (event, context, callback) => {
    let countInsert = 0;
    let out = {};
    let file = false;

    return new Promise(resolve => {
       loader(process.env.S3_BUCKET, process.env.S3_KEY).then(_file => {
            file = _file;
            out.recordCountInFile = file.length;

            file = [...new Set(file.map(item => JSON.stringify(item)))].map(s => JSON.parse(s));
            out.recordCountInFileUniq = file.length;
            return db.init();
        }).then(async () => {
            let testUniq = ((process.env.TEST_UNIQ_IN_BD==1) && (process.env.TRUNCATE_DB!=1));
            console.log({testUniq})
            for (let item of file) {
                if (await db.insert(item, testUniq)) {
                    countInsert++;
                }
            }
            db.end();

            out.countInsert = countInsert;
            callback(null, {
                statusCode: 200,
                body: JSON.stringify(out),
                headers: {'Content-Type': 'application/json'}
            });
            resolve(out);
        })
    })
};