/**
 * Interfaces with ffmpeg.wasm or server-side FFmpeg to apply advanced encoding profiles.
 */
export const configureFFmpegPipeline = (settings) => {
    const { format, preset, crf, hardwareAcceleration } = settings;
    
    let args = [];
    
    if (format === 'mp4') {
        if (hardwareAcceleration === 'prefer-hardware') {
            args.push('-c:v', 'h264_nvenc'); // NVIDIA
            // Alternatively: h264_qsv (Intel), h264_amf (AMD)
        } else {
            args.push('-c:v', 'libx264');
        }
        args.push('-preset', preset || 'p4');
        args.push('-crf', crf || '23');
    } else if (format === 'webm') {
        args.push('-c:v', 'libvpx-vp9');
        args.push('-crf', crf || '30');
        args.push('-b:v', '0');
        if (settings.transparent) {
            args.push('-auto-alt-ref', '0'); // Required for alpha channel
        }
    }

    return args;
};
