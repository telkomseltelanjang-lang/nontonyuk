const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');

const app = express();
app.use(cors());

// Baca file cookies dengan pengaman
let agent;
try {
    if (fs.existsSync('cookies.txt')) {
        const rawCookies = fs.readFileSync('cookies.txt', 'utf8');
        try {
            const cookies = JSON.parse(rawCookies);
            agent = ytdl.createAgent(cookies);
            console.log("Cookies berhasil dimuat.");
        } catch (e) {
            console.warn("Format cookies.txt salah (bukan JSON). Lanjut tanpa cookies.");
        }
    } else {
        console.warn("File cookies.txt tidak ditemukan. Lanjut tanpa cookies.");
    }
} catch (error) {
    console.warn("Gagal memuat cookies:", error.message);
}

app.get('/api/stream-video', async (req, res) => {
    const videoId = req.query.id;
    if (!videoId) return res.status(400).json({ error: "ID kosong" });

    try {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        // Ambil info video (pakai agent cookies jika ada)
        const info = await ytdl.getInfo(videoUrl, agent ? { agent } : {});
        
        // STRATEGI 1: Coba cari format gabungan (Audio + Video)
        let format = ytdl.chooseFormat(info.formats, { quality: 'lowest', filter: 'audioandvideo' });
        
        // STRATEGI 2: Kalau gagal, cari manual format yang punya audio dan video
        if (!format) {
            format = info.formats.find(f => f.hasAudio && f.hasVideo);
        }

        // STRATEGI 3: Kalau tetap gagal, ambil format video apa saja (mungkin tanpa audio)
        if (!format) {
            format = info.formats.find(f => f.hasVideo);
        }
        
        if (!format) throw new Error("Tidak ada format video yang bisa diputar dari YouTube.");

        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Penanganan Range Request (Supaya video bisa di-load bertahap)
        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            
            // Cek apakah contentLength tersedia
            const totalLength = format.contentLength ? parseInt(format.contentLength) : 0;
            const end = parts[1] ? parseInt(parts[1], 10) : (totalLength > 0 ? totalLength - 1 : undefined);
            
            res.status(206);
            if (totalLength > 0 && end !== undefined) {
                res.setHeader('Content-Range', `bytes ${start}-${end}/${totalLength}`);
                res.setHeader('Content-Length', (end - start) + 1);
            }
            res.setHeader('Accept-Ranges', 'bytes');
        }

        // Mulai streaming
        const stream = ytdl.downloadFromInfo(info, { format: format, agent: agent });
        
        // Tangkap error saat streaming (jika koneksi putus)
        stream.on('error', (err) => {
            console.error("Stream error:", err);
            if (!res.headersSent) res.status(500).end();
        });
        
        stream.pipe(res);

    } catch (error) {
        console.error("API Error:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Gagal streaming: " + error.message });
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server di port ${PORT}`));
