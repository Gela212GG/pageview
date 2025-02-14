import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const PIXEL_ID = process.env.PIXEL_ID;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

if (!PIXEL_ID || !ACCESS_TOKEN) {
    console.error('❌ Error: PIXEL_ID atau ACCESS_TOKEN tidak ditemukan dalam environment variables.');
    process.exit(1);
}

app.use(bodyParser.json());
app.use(cors({
    origin: '*',
    methods: 'GET,POST,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
}));

// Middleware CORS untuk menangani preflight request
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
});

// Fungsi untuk hash SHA256
function hashSHA256(value) {
    return value ? crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex') : null;
}

// Validasi format FBC
function isValidFbc(fbc) {
    return /^fb\.1\.\d+\.\w+$/.test(fbc);
}

// **CAPI PageView** (Endpoint tetap)
app.post('/capi', async (req, res) => {
    console.log('📥 Data PageView diterima:', req.body);

    if (!req.body.event_name) {
        return res.status(400).send({ error: 'event_name is required' });
    }

    try {
        const user_data = {
            client_ip_address: req.body.user_data.client_ip_address || req.ip,
            client_user_agent: req.body.user_data.client_user_agent || req.get('User-Agent'),
        };

        if (req.body.user_data.fbp) {
            user_data.fbp = req.body.user_data.fbp;
        }
        if (req.body.user_data.fbc && isValidFbc(req.body.user_data.fbc)) {
            user_data.fbc = req.body.user_data.fbc;
        }

        const payload = {
            event_name: req.body.event_name,
            event_time: Math.floor(Date.now() / 1000),
            event_id: req.body.event_id || 'event_' + Math.random().toString(36).substring(2),
            user_data: user_data,
        };

        console.log('📡 Payload ke Facebook API:', payload);

        const response = await fetch(`https://graph.facebook.com/v13.0/${PIXEL_ID}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ data: [payload] }),
        });

        const responseData = await response.json();
        console.log('✅ Response dari API:', responseData);
        res.status(200).send(responseData);
    } catch (err) {
        console.error('❌ Error saat fetch:', err);
        res.status(500).send({ error: 'Error mengirim data ke API' });
    }
});

// **CAPI Pendaftaran (CompleteRegistration)**
app.post('/capi-pendaftaran', async (req, res) => {
    console.log('📥 Data Pendaftaran diterima:', req.body);

    if (!req.body.event_name || req.body.event_name !== 'CompleteRegistration') {
        return res.status(400).send({ error: 'Invalid event_name, harus "CompleteRegistration"' });
    }

    if (!req.body.event_time || typeof req.body.event_time !== 'number' || req.body.event_time < 1000000000) {
        return res.status(400).send({ error: 'Invalid event_time' });
    }

    try {
        const user_data = {
            em: req.body.user_data.em ? hashSHA256(req.body.user_data.em) : null,
            ph: req.body.user_data.ph ? hashSHA256(req.body.user_data.ph) : null,
            client_ip_address: req.body.user_data.client_ip_address || req.ip,
            client_user_agent: req.body.user_data.client_user_agent || req.get('User-Agent'),
            fbp: req.body.user_data.fbp,
            fbc: isValidFbc(req.body.user_data.fbc) ? req.body.user_data.fbc : null,
        };

        const payload = {
            event_name: "CompleteRegistration",
            event_time: req.body.event_time,
            user_data: user_data,
            custom_data: {
                currency: req.body.custom_data?.currency || "IDR",
                value: req.body.custom_data?.value || 0,
            }
        };

        console.log('📡 Payload ke Facebook API:', payload);

        const response = await fetch(`https://graph.facebook.com/v13.0/${PIXEL_ID}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ data: [payload] }),
        });

        const responseData = await response.json();
        console.log('✅ Response dari API:', responseData);

        // Simpan log ke file
        fs.appendFileSync('capi_pendaftaran.log', JSON.stringify({ request: req.body, payload, response: responseData }) + '\n');

        res.status(200).send(responseData);
    } catch (err) {
        console.error('❌ Error mengirim data ke Facebook:', err);
        res.status(500).send({ error: 'Gagal mengirim data ke Facebook' });
    }
});

// Jalankan server
app.listen(PORT, () => console.log(`🚀 Server berjalan di port ${PORT}`));
