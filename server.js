import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";

// Basic setup
const app = express();
app.use(express.static('public'));
app.use(express.static('.'));
const server = createServer(app);
const io = new Server(server);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Serve the main page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({ 
        status: "OK", 
        message: "Groovebox Server is running!" 
    });
});

// WebSocket connection
io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);
    
    socket.on("disconnect", () => {
        console.log("❌ User disconnected:", socket.id);
    });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🎵 Groovebox Server running at http://localhost:${PORT}`);
    console.log(`✅ Server is ready!`);
});