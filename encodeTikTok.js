const { spawn } = require('child_process');

/**
 * Check if a media file contains at least one audio stream.
 * @param {string} inputPath
 * @returns {Promise<boolean>}
 */
function hasAudioStream(inputPath) {
  return new Promise((resolve, reject) => {
    let output = '';
    const probe = spawn('ffprobe', [
      '-v', 'error',
      '-select_streams', 'a',
      '-show_entries', 'stream=index',
      '-of', 'csv=p=0',
      inputPath
    ]);
    probe.stdout.on('data', data => {
      output += data.toString();
    });
    probe.on('error', reject);
    probe.on('close', () => {
      resolve(output.trim().length > 0);
    });
  });
}

/**
 * Re-encode a video to settings compatible with TikTok, Instagram Reels and
 * YouTube Shorts. Ensures constant 30 fps, 1080x1920 vertical output and
 * adds a silent audio track when the source lacks audio.
 *
 * @param {string} inputPath - path to the source video file
 * @param {string} outputPath - path to write the re-encoded file
 * @returns {Promise<void>} resolves when ffmpeg finishes successfully
 */
async function encodeForTikTok(inputPath, outputPath) {
  const hasAudio = await hasAudioStream(inputPath);

  return new Promise((resolve, reject) => {
    const filter = [
      'scale=1080:1920:force_original_aspect_ratio=increase',
      'crop=1080:1920',
      'fps=30',
      'format=yuv420p',
      'setsar=1',
      'setdar=9/16'
    ].join(',');

    const args = [
      '-fflags', '+genpts+igndts',
      '-r', '30',
      '-i', inputPath
    ];

    if (!hasAudio) {
      // add a silent stereo track
      args.push('-f', 'lavfi', '-t', '9999', '-i', 'anullsrc=cl=stereo:r=44100');
    }

    args.push(
      '-vf', filter,
      '-vsync', 'cfr',
      '-video_track_timescale', '30000',
      '-c:v', 'libx264',
      '-profile:v', 'baseline',
      '-level', '3.1',
      '-pix_fmt', 'yuv420p',
      '-b:v', '5M',
      '-maxrate', '5M',
      '-bufsize', '10M',
      '-x264-params', 'cabac=0:ref=1:bframes=0:keyint=60:min-keyint=60:scenecut=0:nal-hrd=cbr:force-cfr=1'
    );

    if (hasAudio) {
      args.push('-map', '0:v:0', '-map', '0:a:0');
    } else {
      args.push('-map', '0:v:0', '-map', '1:a:0');
    }

    args.push(
      '-c:a', 'aac',
      '-profile:a', 'aac_low',
      '-ar', '44100',
      '-b:a', '128k',
      '-ac', '2',
      '-movflags', '+faststart',
      '-avoid_negative_ts', 'make_zero',
      '-map_metadata', '-1',
      '-map_chapters', '-1',
      '-brand', 'mp42',
      '-shortest',
      outputPath
    );

    const ffmpeg = spawn('ffmpeg', args);

    ffmpeg.stderr.on('data', data => {
      process.stderr.write(data);
    });

    ffmpeg.on('error', reject);
    ffmpeg.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });
}

module.exports = { encodeForTikTok };

// Allow running from the command line: `node encodeTikTok.js in.mp4 out.mp4`
if (require.main === module) {
  const [,, input, output] = process.argv;
  if (!input || !output) {
    console.error('Usage: node encodeTikTok.js <input> <output>');
    process.exit(1);
  }
  encodeForTikTok(input, output).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
