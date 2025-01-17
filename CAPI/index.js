import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(
    cors({
        origin: '*', // Ubah dengan domain asal Anda jika diketahui
        methods: 'GET,POST,OPTIONS',
        allowedHeaders: 'Content-Type,Authorization',
    })
);

app.get('/', (req, res) => {
    res.send('Server berjalan dengan benar. Gunakan endpoint POST /capi untuk mengirim data.');
});

app.post('/capi', async (req, res) => {
    console.log('Data diterima:', req.body);

    if (!req.body.event_name) {
        return res.status(400).send({ error: 'event_name is required' });
    }

    try {
        const payload = {
            event_name: req.body.event_name,
            user_data: {
                ...(req.body.user_data.fbp && { fbp: req.body.user_data.fbp }),
                ...(req.body.user_data.fbc && { fbc: req.body.user_data.fbc }),
                client_ip_address: req.ip,
                client_user_agent: req.get('User-Agent'),
            },
            event_time: Math.floor(Date.now() / 1000),
            event_id: req.body.event_id || 'event_' + Math.random().toString(36).substring(2),
        };

        console.log('Payload ke API tujuan:', payload);

        const response = await fetch(`https://graph.facebook.com/v13.0/${process.env.PIXEL_ID}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ data: [payload] }),
        });

        const responseData = await response.json();
        console.log('Response dari API:', responseData);
        res.status(200).send(responseData);
    } catch (err) {
        console.error('Error saat fetch:', err);
        res.status(500).send({ error: 'Error mengirim data ke API' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
