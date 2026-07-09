const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PRIVATE_SRC = path.join(ROOT, 'private-src');
const PUBLIC_SRC = path.join(ROOT, 'src');
const ITERATIONS = 50000;

const assetPassphrase = process.env.ASSET_PASSPHRASE || 'maltese-local-assets-2026-07';
const letterPassphrase = process.env.LETTER_PASSWORD;

if (!letterPassphrase) {
    console.error('Missing LETTER_PASSWORD environment variable.');
    process.exit(1);
}

const resources = [
    { input: '1.png', output: '1.png.enc', passphrase: assetPassphrase, mime: 'image/png' },
    { input: '2.png', output: '2.png.enc', passphrase: assetPassphrase, mime: 'image/png' },
    { input: 'password.png', output: 'password.png.enc', passphrase: assetPassphrase, mime: 'image/png' },
    { input: 'letter.txt', output: 'letter.txt.enc', passphrase: letterPassphrase, mime: 'text/plain; charset=utf-8' }
];

fs.mkdirSync(PUBLIC_SRC, { recursive: true });

for (const resource of resources) {
    const inputPath = path.join(PRIVATE_SRC, resource.input);
    const outputPath = path.join(PUBLIC_SRC, resource.output);

    const plaintext = fs.readFileSync(inputPath);
    const encrypted = encrypt(plaintext, resource.passphrase, resource.mime);

    fs.writeFileSync(outputPath, JSON.stringify(encrypted));
    console.log(`Encrypted ${resource.input} -> src/${resource.output}`);
}

function encrypt(plaintext, passphrase, mime) {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = crypto.pbkdf2Sync(passphrase, salt, ITERATIONS, 32, 'sha256');
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
        version: 1,
        algorithm: 'AES-256-GCM',
        kdf: 'PBKDF2-SHA256',
        iterations: ITERATIONS,
        mime,
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
        ciphertext: Buffer.concat([ciphertext, tag]).toString('base64')
    };
}
