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

                // 4. Connection Status & Command Handling
        sock.ev.on('connection.update', async (update) => {
            const { connection } = update;
            if (connection === 'open') {
                console.log(`[SUCCESS] ${num} Linked!`);
                
                // Send confirmation to you
                await sock.sendMessage(num + "@s.whatsapp.net", { 
                    text: "🔱 *VXR-MD SYSTEM ONLINE*\nStatus: *Active*\nSecurity: *Bypassed*" 
                });

                // --- START LISTENING FOR COMMANDS ---
                sock.ev.on('messages.upsert', async (chat) => {
                    const msg = chat.messages[0];
                    if (!msg.message || msg.key.fromMe) return;

                    const from = msg.key.remoteJid;
                    const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase();

                    // !alive command
                    if (text === "!alive") {
                        await sock.sendMessage(from, { text: "🚀 *VXR-MD* is active. Security: *HIGH*" });
                    }

                    // !reap command (Host Hunter)
                    if (text === "!reap") {
                        await sock.sendMessage(from, { text: "🛰️ *VXR-MD: Scanning Subdomains...*\n_Reaping active hosts._" });
                        // Add your Termux host-scan logic here
                    }
                });

                // --- ANTI-DELETE TOOL ---
                sock.ev.on('messages.update', async (update) => {
                    for (const { key, update: messageUpdate } of update) {
                        if (messageUpdate.revoked) {
                            console.log("Deleted message detected from:", key.remoteJid);
                            // You can add logic here to forward the deleted content to your number
                        }
                    }
                });
            }
        });
        
