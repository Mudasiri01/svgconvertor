import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import crypto from 'crypto';

const outDir = path.join(process.cwd(), '../frontend/public', 'out');
const files = fs.readdirSync(outDir).filter(f => f.endsWith('.mp4'));
files.sort((a, b) => fs.statSync(path.join(outDir, b)).mtimeMs - fs.statSync(path.join(outDir, a)).mtimeMs);

if (files.length === 0) {
  console.log("No videos found.");
  process.exit(1);
}

const latestVideo = path.join(outDir, files[0]);
console.log(`Latest video: ${latestVideo}`);

const tempVideo = path.join(process.cwd(), 'temp.mp4');
fs.copyFileSync(latestVideo, tempVideo);

try {
  execSync(`"${ffmpegPath}" -y -i "${tempVideo}" -vf select='eq(n\\,0)+eq(n\\,30)+eq(n\\,59)' -vsync 0 frame_%d.jpg`, { stdio: 'pipe' });
} catch (err) {
  console.error("FFmpeg failed", err.stderr ? err.stderr.toString() : err.message);
}

// Hash them
for (let i = 1; i <= 3; i++) {
  const file = `frame_${i}.jpg`;
  if (fs.existsSync(file)) {
    const data = fs.readFileSync(file);
    const hash = crypto.createHash('md5').update(data).digest('hex');
    console.log(`${file} hash: ${hash}`);
  } else {
    console.log(`${file} missing.`);
  }
}
