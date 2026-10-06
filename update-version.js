#!/usr/bin/env node
/**
 * Script to update WhatsApp Web version across the codebase.
 * Fetches the latest version from web.whatsapp.com and updates:
 * - lib/Defaults/index.js
 * - lib/Utils/generics.js
 *
 * Usage: node update-version.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { fetchLatestWaWebVersion } from './lib/Utils/generics.js';

const __filename = fileURLToPath(import.meta.url);
const ROOT_DIR = dirname(__filename);

export function updateGenerics(version) {
    const filePath = join(ROOT_DIR, 'lib/Utils/generics.js');

    try {
        const content = readFileSync(filePath, 'utf-8');
        const versionRegex = /const baileysVersion = \[(\d+),\s*(\d+),\s*(\d+)\]/;
        const match = content.match(versionRegex);

        if (!match) {
            throw new Error('Could not find baileysVersion declaration in generics.js');
        }

        const currentVersion = [+match[1], +match[2], +match[3]];

        if (currentVersion[0] === version[0] && currentVersion[1] === version[1] && currentVersion[2] === version[2]) {
            console.log('✓ lib/Utils/generics.js already up to date');
            return false;
        }

        const newContent = content.replace(
            versionRegex,
            `const baileysVersion = [${version[0]}, ${version[1]}, ${version[2]}]`
        );

        writeFileSync(filePath, newContent);
        console.log(`✓ Updated lib/Utils/generics.js: [${currentVersion.join(', ')}] → [${version.join(', ')}]`);
        return true;
    } catch (error) {
        console.error('✗ Failed to update lib/Utils/generics.js:', error);
        throw error;
    }
}

export function updateIndex(version) {
    const filePath = join(ROOT_DIR, 'lib/Defaults/index.js');

    try {
        const content = readFileSync(filePath, 'utf-8');
        const versionRegex = /const version = \[(\d+),\s*(\d+),\s*(\d+)\]/;
        const match = content.match(versionRegex);

        if (!match) {
            throw new Error('Could not find version declaration in index.js');
        }

        const currentVersion = [+match[1], +match[2], +match[3]];

        if (currentVersion[0] === version[0] && currentVersion[1] === version[1] && currentVersion[2] === version[2]) {
            console.log('✓ lib/Defaults/index.js already up to date');
            return false;
        }

        const newContent = content.replace(
            versionRegex,
            `const version = [${version[0]}, ${version[1]}, ${version[2]}]`
        );

        writeFileSync(filePath, newContent);
        console.log(`✓ Updated lib/Defaults/index.js: [${currentVersion.join(', ')}] → [${version.join(', ')}]`);
        return true;
    } catch (error) {
        console.error('✗ Failed to update lib/Defaults/index.js:', error);
        throw error;
    }
}

export async function updateWhatsAppVersion(customVersion) {
    let targetVersion = customVersion;
    if (!targetVersion) {
        console.log('Fetching latest WhatsApp Web version...\n');
        const result = await fetchLatestWaWebVersion();
        if (!result.isLatest) {
            throw new Error(`Failed to fetch latest version: ${result.error}`);
        }
        targetVersion = result.version;
    }

    console.log(`Target version: [${targetVersion.join(', ')}]\n`);

    const updates = [
        updateGenerics(targetVersion),
        updateIndex(targetVersion)
    ];

    const hasUpdates = updates.some(Boolean);

    if (hasUpdates) {
        console.log('Version update complete!');
        if (process.env.GITHUB_OUTPUT) {
            const { appendFileSync } = await import('fs');
            appendFileSync(process.env.GITHUB_OUTPUT, `updated=true\n`);
            appendFileSync(process.env.GITHUB_OUTPUT, `version=${targetVersion.join('.')}\n`);
        }
    } else {
        console.log('All files are already up to date.');
        if (process.env.GITHUB_OUTPUT) {
            const { appendFileSync } = await import('fs');
            appendFileSync(process.env.GITHUB_OUTPUT, `updated=false\n`);
        }
    }

    return { updated: hasUpdates, version: targetVersion };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    updateWhatsAppVersion().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
