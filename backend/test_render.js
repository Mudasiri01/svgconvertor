import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    console.log("Starting backend server for test render...");
    const server = spawn('node', ['server/index.js'], { cwd: __dirname });
    
    let testStarted = false;

    server.stdout.on('data', (data) => {
        const output = data.toString();
        // Wait for the server to be ready
        if (output.includes('Listening on http://localhost:3001') && !testStarted) {
            testStarted = true;
            console.log("Backend server started. Running smoke test...");
            const test = spawn('node', ['server/smoke_test.js'], { cwd: __dirname, stdio: 'inherit' });
             
            test.on('close', (code) => {
                console.log(`Test finished with code ${code}`);
                server.kill();
                process.exit(code);
            });
        }
    });

    server.stderr.on('data', (data) => {
        console.error(`Server Error: ${data}`);
    });

    // Handle case where server fails to start
    server.on('close', (code) => {
        if (!testStarted) {
            console.error(`Server closed with code ${code} before test could start.`);
            process.exit(code || 1);
        }
    });
}

run();
