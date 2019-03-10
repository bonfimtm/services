const cors = require('cors')
const express = require('express');
const https = require('https');
const admin = require('firebase-admin');

const firebaseMonacoCredentials = JSON.parse(process.env.FIREBASE_MONACO_CREADENTIALS || "");

admin.initializeApp({
    credential: admin.credential.cert(firebaseMonacoCredentials)
});

const db = admin.firestore();

const app = express();
const port = process.env.PORT || 80;

const baseUrl = 'https://api.instagram.com/v1/users/self';

const endPointBio = '/';
const endPointMediaRecent = '/media/recent';

const albertAccessToken = process.env.ALBERT_IG_ACCESS_TOKEN || '';
const albertCorsWhitelist = process.env.ALBERT_CORS_WHITE_LIST || '';

const mayorAccessToken = process.env.MAYOR_IG_ACCESS_TOKEN || '';
const mayorCorsWhitelist = process.env.MAYOR_CORS_WHITE_LIST || '';

const albertCorsOptions = cors(getCorsOptions(albertCorsWhitelist));
const mayorCorsOptions = cors(getCorsOptions(mayorCorsWhitelist));

app.get('/', (request, response) => {
    response.send('Welcome!');
});

app.options('/monaco/*', albertCorsOptions);

app.get('/monaco/driving_requests', (request, response) => {
    db.collection('driving_requests').doc('current').get()
        .then(doc => {
            if (!doc.exists) {
                console.error('Document not found!');
            } else {
                const docData = doc.data()
                console.log('Document data:', docData);

                const arrayBuffer = new ArrayBuffer(8);
                const buffer = Buffer.from(arrayBuffer);
                const view = new Float32Array(arrayBuffer);

                view[0] = docData.steering;
                view[1] = docData.powertrain;

                console.log('Array buffer:', arrayBuffer);
                console.log('Buffer:', buffer);
                console.log('View:', view);

                response.contentType('application/octet-stream');
                response.send(buffer);
            }
        })
        .catch(err => {
            console.error('Error getting document', err);
        });
});

app.options('/albert/*', albertCorsOptions);

app.get('/albert/instagram', albertCorsOptions, (request, response) => {
    getInstagramBio(albertAccessToken, data => processData(data, response));
});

app.get('/albert/instagram/feed', albertCorsOptions, (request, response) => {
    getInstagramFeed(albertAccessToken, data => processData(data, response));
});

app.options('/mayor/*', mayorCorsOptions);

app.get('/mayor/instagram', mayorCorsOptions, (request, response) => {
    getInstagramBio(mayorAccessToken, data => processData(data, response));
});

app.get('/mayor/instagram/feed', mayorCorsOptions, (request, response) => {
    getInstagramFeed(mayorAccessToken, data => processData(data, response));
});

app.listen(port, _ => {
    console.log(`Listening on ${port}`);
});

function getCorsOptions(corsWhitelist) {
    const whiteList = corsWhitelist.split(' ');
    return {
        origin: (origin, callback) => {
            if (!origin || whiteList.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    };
}

function processData(data, response) {
    response.setHeader('Content-Type', 'application/json');
    if (data) {
        response.send(data);
    } else {
        response.send(500, JSON.stringify({
            result: 'Error'
        }));
    }
}

function getInstagramBio(accessToken, callback) {
    getInstagramData(accessToken, endPointBio, callback);
}

function getInstagramFeed(accessToken, callback) {
    getInstagramData(accessToken, endPointMediaRecent, callback);
}

function getInstagramData(accessToken, endPoint, callback) {
    const url = `${baseUrl}${endPoint}?access_token=${accessToken}`;
    https.get(url, (resp) => {

        let data = '';

        resp.on('data', (chunk) => {
            data += chunk;
        });

        resp.on('end', () => {
            callback(JSON.parse(data));
        });

    }).on('error', (err) => {
        callback(false);
    });
}