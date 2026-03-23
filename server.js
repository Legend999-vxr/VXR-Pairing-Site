const express = require('express');
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    Browsers, 
    delay, 
    fetchLatestBaileysVersion 
} = require("@whiskeysockets/baileys");
const pino = require('pino');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve the 'public' folder for your UI
app.use(express.static('public'));

app.get('/pair', async (req, res) => {
    let num = req.query.number.replace(/[^0-9]/g, ''); // Clean the number
    if (!num) return res.status(400).json({ error: "Valid number required" });

    // 1. Setup Auth State
    const { state, saveCreds } = await useMultiFileAuthState('sessions/' + num);
    const { version } = await fetchLatestBaileysVersion();

    try {
        // 2. Initialize the Engine
        const sock = makeWASocket({
            auth: state,
            version: version,
            printQRInTerminal: false,
            logger: pino({ level: "silent" }),
            // FIX: Identifies as a real Desktop to bypass security blocks
            browser: Browsers.macOS("Desktop"),
            syncFullHistory: false
        });

        // 3. Handle Credential Updates
        sock.ev.on('creds.update', saveCreds);

        // 4. Connection Status Logic
        sock.ev.on('connection.update', async (update) => {
            const { connection } = update;
            if (connection === 'open') {
                console.log(`[SUCCESS] ${num} Linked!`);
                
                // OPTIONAL: Send a confirmation message to the user
                await sock.sendMessage(num + "@s.whatsapp.net", { 
                    text: "🚀 *VXR-MD LINKED SUCCESSFULLY*\nYour pairing terminal is active." 
                });
            }
        });

        // 5. Request the Pairing Code
        if (!sock.authState.creds.registered) {
            await delay(1500); // Small delay to let the engine warm up
            const code = await sock.requestPairingCode(num);
            res.json({ code: code });
        } else {
            res.json({ code: "ALREADY_CONNECTED" });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Pairing Failed" });
    }
});

app.listen(PORT, () => {
    console.log(`
    ====================================
    VXR ENTERPRISE SERVER LIVE
    PORT: ${PORT}
    STATUS: SECURE (MacOS ID)
    ====================================
    `);
});
    
