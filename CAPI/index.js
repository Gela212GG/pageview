import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import cors from 'cors'; // Import cors

const app = express();

// Middleware untuk parsing JSON
app.use(bodyParser.json());

// Middleware CORS
app.use(cors({
    origin: '*', // Ganti dengan domain asal Anda
    methods: 'GET,POST,OPTIONS', // Metode HTTP yang diizinkan
    allowedHeaders: 'Content-Type,Authorization' // Header yang diizinkan
}));

// Endpoint untuk Root Path
app.get('/', (req, res) => {
    res.send('Server berjalan dengan benar. Gunakan endpoint POST /capi untuk mengirim data.');
});

// Endpoint menerima data dari GTM
app.post('/capi', async (req, res) => {
    console.log('Data diterima:', req.body);

    try {
        const payload = {
            event_name: req.body.event_name,
            user_data: {
                fbp: req.body.user_data.fbp,
                fbc: req.body.user_data.fbc,
                client_ip_address: req.ip,
                client_user_agent: req.get('User-Agent'),
            },
            event_time: Math.floor(Date.now() / 1000),
            event_id: req.body.event_id || 'event_' + Math.random().toString(36).substring(2),
        };

        console.log('Payload ke API tujuan:', payload);

        const response = await fetch('https://tusukgigi.top/api/capi_pageview.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const responseData = await response.json();
        console.log('Response dari API:', responseData);
        res.status(200).send(responseData);
    } catch (err) {
        console.error('Error saat fetch:', err);
        res.status(500).send({ error: 'Error mengirim data ke API' });
    }
});

// Jalankan server di port 3000 atau port default
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
