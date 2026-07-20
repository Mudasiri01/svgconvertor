import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

const latestVideo = path.join(process.cwd(), '../frontend/public', 'out', 'final_1782098481095.mp4');
console.log(`Extracting from: ${latestVideo}`);

const tempVideo = path.join(process.cwd(), 'temp_user.mp4');
fs.copyFileSync(latestVideo, tempVideo);

try {
  execSync(`"${ffmpegPath}" -y -i "${tempVideo}" -vf select='eq(n\\,0)+eq(n\\,30)+eq(n\\,59)' -vsync 0 "../frontend/public/out/user_frame_%d.jpg"`, { stdio: 'pipe' });
  console.log("Frames extracted successfully to ../frontend/public/out.");
} catch (err) {
  console.error("FFmpeg failed", err.stderr ? err.stderr.toString() : err.message);
}
