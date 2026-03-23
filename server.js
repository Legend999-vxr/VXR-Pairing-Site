const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, delay } = require("@whiskeysockets/baileys");
const pino = require("pino");
const app = express();
const port = process.env.PORT || 3000;

app.get('/pair', async (req, res) => {
    let num = req.query.number;
    if (!num) return res.status(400).json({ error: "Number is required" });

    try {
        const { state, saveCreds } = await useMultiFileAuthState('temp_session');
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: "silent" })
        });

        if (!sock.authState.creds.registered) {
            await delay(1500);
            const code = await sock.requestPairingCode(num.trim());
            res.json({ code: code });
        }
    } catch (err) {
        res.status(500).json({ error: "Service Busy" });
    }
});

app.listen(port, () => console.log(`VXR Server running on port ${port}`));

