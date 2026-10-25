const express = require('express');
const cors = require('cors');
const play = require('play-dl');

const app = express();
app.use(cors());

// Endpoint untuk streaming video
app.get('/api/stream-video', async (req, res) => {
    const videoId = req.query.id;
    if (!videoId) return res.status(400).json({ error: "ID kosong" });

    try {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        // Dapatkan stream video (kualitas terbaik yang memiliki audio & video)
        const stream = await play.stream(videoUrl, { quality: 2 }); // 2 = 360p, 1 = 720p, 0 = 1080p (bisa disesuaikan)

        // Set header agar browser bisa memutar video
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Length', stream.stream.readableLength || 0);

        // Pipe stream video ke response
        stream.stream.pipe(res);
    } catch (error) {
        console.error("Error streaming:", error);
        res.status(500).json({ error: "Gagal memutar video: " + error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server di port ${PORT}`)); 
