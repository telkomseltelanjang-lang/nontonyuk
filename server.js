const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');

const app = express();
app.use(cors());

const videoCache = {};

app.get('/api/get-video', async (req, res) => {
    const videoId = req.query.id;
    if (!videoId) return res.status(400).json({ error: "ID kosong" });

    if (videoCache[videoId] && (Date.now() - videoCache[videoId].timestamp < 7200000)) {
        return res.json({ status: "success", url: videoCache[videoId].url });
    }

    try {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const info = await ytdl.getInfo(videoUrl);
        
        // Cari format yang memiliki audio dan video (muxed)
        let format = info.formats.find(f => f.hasAudio && f.hasVideo);
        
        // Jika tidak ada yang muxed, ambil video quality tertinggi (mungkin tanpa audio, tapi ini darurat)
        if (!format) {
            format = info.formats.find(f => f.hasVideo);
        }

        if (!format) {
            throw new Error("Tidak ada format video yang ditemukan");
        }

        videoCache[videoId] = { url: format.url, timestamp: Date.now() };
        res.json({ status: "success", url: format.url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Gagal bongkar video: " + error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server di port ${PORT}`));
