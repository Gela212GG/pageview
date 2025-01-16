// Import library
import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

const app = express();

// Middleware untuk parsing JSON
app.use(bodyParser.json());

// Fungsi untuk menghasilkan event_id unik
function generateEventId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Endpoint untuk Root Path
app.get('/', (req, res) => {
    res.send('Server berjalan dengan benar. Gunakan endpoint POST /capi untuk mengirim data.');
});

// Endpoint menerima data dari GTM
app.post('/capi', async (req, res) => {
    console.log('Data diterima:', req.body);

    try {
        const fbp = req.body.user_data?.fbp;
        const fbc = req.body.user_data?.fbc;

        const payload = {
            event_name: req.body.event_name,
            user_data: {
                ...(fbp && { fbp }), // Kirim fbp hanya jika ada
                ...(fbc && { fbc }), // Kirim fbc hanya jika ada
                client_ip_address: req.ip,
                client_user_agent: req.get('User-Agent'),
            },
            event_time: Math.floor(Date.now() / 1000),
            event_id: generateEventId(),
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

// Jalankan server di port 3000 atau port default dari Replit
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
