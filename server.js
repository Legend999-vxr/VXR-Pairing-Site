const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, delay } = require("@whiskeysockets/baileys");
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public')); // Serves your HTML

app.get('/pair', async (req, res) => {
    let phone = req.query.number;
    if (!phone) return res.status(400).json({ error: "Number required" });

    // 1. Setup Auth
    const { state, saveCreds } = await useMultiFileAuthState('sessions/' + phone);

    try {
        // 2. Initialize Socket
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: "silent" })
        });

        // 3. The Fix: Listen for credential updates
        sock.ev.on('creds.update', saveCreds);

        // 4. Request Pairing Code
        if (!sock.authState.creds.registered) {
            await delay(1500); // Small delay for stability
            const code = await sock.requestPairingCode(phone);
            res.json({ code: code });
        } else {
            res.json({ code: "ALREADY_CONNECTED" });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Pairing Failed" });
    }
});

app.listen(PORT, () => console.log(`VXR Enterprise Server running on port ${PORT}`));
