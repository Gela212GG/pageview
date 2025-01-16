// Import library
import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

const app = express();

// Middleware untuk parsing JSON
app.use(bodyParser.json());

// Endpoint untuk Root Path
app.get('/', (req, res) => {
    res.send('Server berjalan dengan benar. Gunakan endpoint POST /capi untuk mengirim data.');
});

// Endpoint menerima data dari GTM
app.post('/capi', async (req, res) => {
    console.log('Data diterima:', req.body);

    try {
        const response = await fetch('https://tusukgigi.top/api/capi_pageview.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const responseData = await response.text();
        console.log('Response dari API:', responseData);
        res.status(response.status).send(responseData);
    } catch (err) {
        console.error('Error saat fetch:', err);
        res.status(500).send({ error: 'Error mengirim data ke API' });
    }
});

// Jalankan server di port 3000 atau port default dari Replit
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
