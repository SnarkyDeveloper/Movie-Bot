import discord.ext
from discord.ext import commands
import json
import subprocess
import dotenv
import os
import httpx
dotenv.load_dotenv()
TOKEN = os.getenv('TOKEN') 
omdb_key = os.getenv('OMDB_KEY')
prefix = '!'
bot = commands.Bot(command_prefix=prefix, description='A bot that plays movies via vidsrc, discord.js, ffmpeg. All you need is to sit badck and watch the magic.')
def search_movie(movie):
    response = httpx.get(f"https://omdbapi.com/?s={movie}&apikey={omdb_key}")
    data = response.json()
    try:
        return data.get('Search')[0].get('imdbID')
    except:
        return None
@bot.event
async def on_ready():
    print('Logged in as')
    print(bot.user.name)
    print(bot.user.id)
    print('------')

def stream_video(guild_id, channel_id, video_url):
    message = {
        "guild_id": guild_id,
        "channel_id": channel_id,
        "video_url": video_url
    }

    process = subprocess.Popen(
        ['node', './streamer.js'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    stdout, stderr = process.communicate(input=json.dumps(message).encode())

    if process.returncode != 0:
        print(f"Error: {stderr.decode()}")
    else:
        print(f"Output: {stdout.decode()}")

@bot.command()
async def play(ctx, movie: str, channel: discord.VoiceChannel = None):
    if channel is None:
        if ctx.author.voice:
            channel = ctx.author.voice.channel
        else:
            await ctx.send('You are not connected to a voice channel.')
            return
            
    guild_id = ctx.guild.id
    channel_id = channel.id
    
    movie_id = search_movie(movie)
    if movie_id:
        await ctx.send(f"Found movie. Starting stream...")
        video_url = f"http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        
        message = {
            "command": "$play-live",
            "guild_id": str(guild_id),
            "channel_id": str(channel_id),
            "video_url": video_url
        }
        
        process = subprocess.Popen(
            ['node', './streamer.js'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        stdout, stderr = process.communicate(input=json.dumps(message).encode())
        if stderr:
            await ctx.send(f"Error starting stream: {stderr.decode()}")
    else:
        await ctx.send('Movie not found')
bot.run(TOKEN)