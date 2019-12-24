const aws = require('aws-sdk');
const s3 = new aws.S3();
const csv = require('csv-parser')

module.exports = function(bucket, key) {
    return new Promise(resolve => {
        const params = {
            Bucket: bucket,
            Key: decodeURIComponent(key),
        };
        const results = [];

        try {
            let stream = s3.getObject(params).createReadStream();
            stream.pipe(csv({
                    mapValues: ({
                        header,
                        index,
                        value
                    }) => value.trim(),
                }))
                .on('data', (data) => {
                    delete data[''];
                    results.push(data)
                })
                .on('end', () => {
                    console.log('loadCSV is end')
                    resolve(results);
                }).on('error', error => {
                    console.log('loadCSV error',error);
                    throw new Error();
                });
        } catch (err) {
            console.log(err);
            const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
            console.log(message);
            throw new Error(message);
        }
    })
}
