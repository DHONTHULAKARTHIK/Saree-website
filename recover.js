const fs = require('fs');
const path = require('path');

const brainDir = 'C:/Users/karth/.gemini/antigravity/brain/';
const dirs = fs.readdirSync(brainDir);

let latestContent = "";
let latestTime = 0;

for (const d of dirs) {
    const logPath = path.join(brainDir, d, '.system_generated/logs/overview.txt');
    if (fs.existsSync(logPath)) {
        const lines = fs.readFileSync(logPath, 'utf8').split('\n');
        for (const line of lines) {
            try {
                if (line.startsWith('{"step_index":')) {
                    const obj = JSON.parse(line);
                    if (obj.tool_calls) {
                        for (const tc of obj.tool_calls) {
                            if (tc.name === 'replace_file_content' || tc.name === 'write_to_file' || tc.name === 'multi_replace_file_content') {
                                // Not easily reconstructed without the full file text
                            }
                        }
                    }
                    if (obj.type === 'TOOL_RESPONSE' && obj.content) {
                        if (obj.content.includes('File Path: `file:///c:/Users/karth/OneDrive/Desktop/saree%20website/profile.js`')) {
                            // Found a view_file output!
                            // If it contains the whole file... wait, view_file outputs format:
                            // "1: line1\n2: line2\n..."
                            // Let's grab it and reconstruct what we can.
                        }
                    }
                }
            } catch (e) {}
        }
    }
}
// This is too complex. 
// Instead of this, I'll just restore profile.js to the git commit, then check if there is an easy way to restore the missing functions!
