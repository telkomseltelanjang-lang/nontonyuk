const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');

const app = express();
app.use(cors());

app.get('/api/stream-video', async (req, res) => {
    const videoId = req.query.id;
    if (!videoId) return res.status(400).json({ error: "ID kosong" });

    try {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        // Ambil info video
        const info = await ytdl.getInfo(videoUrl);
        
        // Pilih format yang ada audio & videonya (kualitas terendah biar cepat loading)
        const format = ytdl.chooseFormat(info.formats, { quality: 'lowest', filter: 'audioandvideo' });
        
        if (!format) {
            throw new Error("Tidak ada format video yang ditemukan");
        }

        // Set Header Wajib untuk Streaming di HP
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Tangani Range Request (Supaya video bisa di-load bertahap)
        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : format.contentLength - 1;
            
            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${format.contentLength}`);
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Content-Length', (end - start) + 1);
        }

        // Mulai stream
        const stream = ytdl.downloadFromInfo(info, { format });
        stream.pipe(res);

    } catch (error) {
        console.error(error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Gagal streaming: " + error.message });
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server di port ${PORT}`));
