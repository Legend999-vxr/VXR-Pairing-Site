const express = require('express');
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    Browsers, 
    delay, 
    fetchLatestBaileysVersion 
} = require("@whiskeysockets/baileys");
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/pair', async (req, res) => {
    let num = req.query.number.replace(/[^0-9]/g, '');
    if (!num) return res.status(400).json({ error: "Valid number required" });

    const { state, saveCreds } = await useMultiFileAuthState('sessions/' + num);
    const { version } = await fetchLatestBaileysVersion();

    try {
        const sock = makeWASocket({
            auth: state,
            version: version,
            printQRInTerminal: false,
            logger: pino({ level: "silent" }),
            browser: Browsers.macOS("Desktop"), // Bypasses linking errors
            syncFullHistory: false
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection } = update;
            if (connection === 'open') {
                console.log(`[SUCCESS] ${num} Linked!`);
                
                // Initial Online Message
                await sock.sendMessage(num + "@s.whatsapp.net", { 
                    text: "🔱 *VXR-MD SYSTEM ONLINE*\nStatus: *Active*\nSecurity: *Bypassed*" 
                });

                // --- COMMAND LISTENER ---
                sock.ev.on('messages.upsert', async (chat) => {
                    const msg = chat.messages[0];
                    if (!msg.message || msg.key.fromMe) return;

                    const from = msg.key.remoteJid;
                    const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase();

                    // Command: !alive
                    if (text === "!alive") {
                        await sock.sendMessage(from, { text: "🚀 *SYSTEM STATUS: BYPASSED*\nVXR-MD is operational and active." });
                    }

                    // Command: !reap (Host Hunter)
                    if (text === "!reap") {
                        await sock.sendMessage(from, { text: "🛰️ *VXR-MD: Scanning Subdomains...*\n_Reaping active hosts for VPN configs._" });
                    }
                });

                // --- ANTI-DELETE TOOL ---
                sock.ev.on('messages.update', async (update) => {
                    for (const { key, update: messageUpdate } of update) {
                        if (messageUpdate.revoked) {
                            await sock.sendMessage(num + "@s.whatsapp.net", { 
                                text: `⚠️ *DETECTION:* A message was deleted in ${key.remoteJid}` 
                            });
                        }
                    }
                });
            }
        });

        if (!sock.authState.creds.registered) {
            await delay(1500);
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
    console.log(`VXR SERVER LIVE ON PORT ${PORT}`);
});
