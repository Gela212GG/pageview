app.post('/capi', async (req, res) => {
    console.log('Data diterima:', req.body);

    if (!req.body.event_name) {
        return res.status(400).send({ error: 'event_name is required' });
    }

    try {
        const user_data = {
            client_ip_address: req.body.user_data.client_ip_address || req.ip, // Tambahkan fallback ke req.ip
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
            event_time: Math.floor(Date.now() / 1000), // Waktu dalam detik
            event_id: req.body.event_id || 'event_' + Math.random().toString(36).substring(2),
            user_data: user_data,
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
