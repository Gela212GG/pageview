import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import axios from 'axios';
import helmet from 'helmet';
import requestIp from 'request-ip';
import axiosRetry from 'axios-retry';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

app.use(helmet());
app.use(bodyParser.json());
app.use(requestIp.mw());
app.use(cookieParser());
axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

// Example: middleware untuk log request
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Fungsi bantu
function hashSHA256(value) {
  return value ? crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex') : null;
}

function getClientIP(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const ips = xff.split(',');
    return ips[0].trim();
  }
  return requestIp.getClientIp(req);
}

function sanitizeUserData(userData) {
  if (userData.country) {
    userData.country = hashSHA256(userData.country);
  }
  return Object.fromEntries(Object.entries(userData).filter(([_, v]) => v !== undefined && v !== null));
}

// Validasi FBP / FBC
function validateFBData(body) {
  let fbp = body.fbp || body.user_data?.fbp;
  let fbc = body.fbc || body.user_data?.fbc;

  if (fbp && !/^fb\.1\.\d+\.\d+$/.test(fbp)) {
    return { error: true, message: 'Invalid FBP format' };
  }
  if (fbc && !/^fb\.1\.\d+\.[a-zA-Z0-9_-]+$/.test(fbc)) {
    fbc = undefined;
  }
  return { error: false, fbp, fbc };
}

// Route untuk PageView
app.post('/capi', async (req, res) => {
  const body = req.body;
  if (!body.event_id) {
    return res.status(400).json({ error: 'event_id wajib disertakan' });
  }
  const { error, fbp, fbc, message } = validateFBData(body);
  if (error) {
    return res.status(400).json({ error: message });
  }

  const clientIP = getClientIP(req);
  const user_data = sanitizeUserData({
    client_user_agent: req.headers['user-agent'] || 'unknown',
    client_ip_address: clientIP || null,
    fbp,
    fbc,
    country: body.user_data?.country || null
  });

  const payload = {
    event_name: 'PageView',
    event_time: Math.floor(Date.now() / 1000),
    event_id: body.event_id,
    user_data,
    custom_data: {
      source: 'website'
    }
  };

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v20.0/${process.env.MABAR_PIXEL_ID}/events`,
      { data: [payload], access_token: process.env.MABAR_ACCESS_TOKEN }
    );
    console.log('CAPI PageView sent:', payload);
    res.status(200).json({ success: true, data: response.data });
      console.log(`🔍 fbp: ${fbp}, fbc: ${fbc}, IP: ${clientIP}`);
  } catch (err) {
    console.error('Error sending PageView to Meta:', err.response?.data || err.message);
    res.status(500).json({ error: 'Error mengirim data ke Meta' });
  }
});

app.listen(PORT, () => {
  console.log(`Server CAPI berjalan pada port ${PORT}`);
});

