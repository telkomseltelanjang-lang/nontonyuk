 const express = require('express');
const cors = require('cors');
const { Youtube } = require('youtube-explode');

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
        const youtube = new Youtube();
        const streamInfo = await youtube.videos.streams.getManifestAsync(videoId);
        const muxedStream = streamInfo.getMuxedStream();
        videoCache[videoId] = { url: muxedStream.url, timestamp: Date.now() };
        res.json({ status: "success", url: muxedStream.url });
    } catch (error) {
        res.status(500).json({ error: "Gagal bongkar video" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server di port ${PORT}`));
