import { Client } from "discord.js-selfbot-v13";
import { streamLivestreamVideo, Streamer } from "@dank074/discord-video-stream";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Setup logging
const logStream = fs.createWriteStream(`streamer_${new Date().toISOString().split('T')[0]}.log`, { flags: 'a' });

function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} [${level}] ${message}\n`;
    logStream.write(logMessage);
    console.log(logMessage);
}

dotenv.config();
const TOKEN = process.env.TOKEN;
const HEIGHT = process.env.HEIGHT || 1920;
const WIDTH = process.env.WIDTH || 1080;
const FPS = process.env.FPS || 30;
const streamer = new Streamer(new Client());

// Queue to store incoming requests
let requestQueue = [];

// Process requests only after client is ready
streamer.client.on("ready", () => {
    log(`Streamer client ready - Logged in as ${streamer.client.user.tag}`);
    // Process any queued requests
    processQueuedRequests();
});

function processQueuedRequests() {
    while (requestQueue.length > 0) {
        handleStreamRequest(requestQueue.shift());
    }
}

async function handleStreamRequest(message) {
    log(`Processing stream request for channel ${message.channel_id}`);
    const channel = await streamer.client.channels.fetch(message.channel_id);
    if (!channel) {
        log(`Channel ${message.channel_id} not found`, 'ERROR');
        return;
    }
    
    log(`Joining voice channel ${message.guild_id}/${message.channel_id}`);
    await streamer.joinVoice(message.guild_id, message.channel_id);
    
    log('Creating stream with default settings');
    const streamUdpConn = await streamer.createStream({
        width: WIDTH,
        height: HEIGHT,
        fps: FPS,
        bitrateKbps: 1000,
        maxBitrateKbps: 2000,
        hardwareAcceleratedDecoding: true
    });
    
    log(`Starting video stream for URL: ${message.video_url}`);
    try {
        log('Starting video playback');
        await streamLivestreamVideo(message.video_url, streamUdpConn, true);
        log('Video stream started successfully');
    } catch (e) {
        log(`Stream playback error: ${e.message}`, 'ERROR');
        log(e.stack, 'ERROR');
    } finally {
        log('Cleaning up stream resources');
        streamer.stopStream();
        streamer.leaveVoice();
    }
}

process.stdin.on('data', async (data) => {
    try {
        const message = JSON.parse(data);
        if (!streamer.client.isReady()) {
            log('Client not ready, queueing request');
            requestQueue.push(message);
        } else {
            await handleStreamRequest(message);
        }
    } catch (error) {
        log(`Fatal error: ${error.message}`, 'ERROR');
        log(error.stack, 'ERROR');
    }
});

streamer.client.login(TOKEN).catch(error => {
    log(`Login failed: ${error.message}`, 'ERROR');
    log(error.stack, 'ERROR');
});

// Cleanup on exit
process.on('exit', () => {
    log('Shutting down streamer client');
    logStream.end();
});