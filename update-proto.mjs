/*
 * WAProto Automatic Updater
 *
 * This script automatically downloads and updates the WAProto files
 * used by Baileys from the official repository:
 *
 * https://github.com/wppconnect-team/wa-proto
 *
 * REQUIREMENTS:
 *
 * 1. Node.js support for ES modules and top-level await.
 *
 * 2. The `npx` command must be installed and available on the system.
 * The script uses `npx` to execute:
 *
 * protobufjs-cli@1.1.3
 *
 * There is no need to install protobufjs-cli globally; `npx`
 * downloads/executes it automatically.
 *
 * 3. By default, the script will look for the following package:
 *
 * baileys
 *
 * using:
 *
 * import.meta.resolve('baileys/package.json')
 *
 * Therefore, `baileys` must be correctly installed and
 * resolvable from this project.
 *
 * 4. If your Baileys installation uses a different package name,
 * location, or custom path, you must correctly modify
 * `#getBaileysPath()` to point to the actual folder
 * where your Baileys installation is located.
 *
 * For example, the script currently uses:
 *
 * import.meta.resolve('baileys/package.json')
 *
 * If your installation does not correspond to `baileys`, you must change that
 * reference to the path/package name you actually use. *
 * 5. The Baileys folder must contain the expected structure,
 * including:
 *
 * WAProto/
 *
 * and within it:
 *
 * WAProto/fix-imports.js
 *
 * The process performs the following:
 *
 * - Checks the remote version of WAProto.
 * - Checks the locally installed version.
 * - Downloads the updated WAProto.proto.
 * - Adapts the .proto file for use with Baileys.
 * - Regenerates `index.js` using protobufjs-cli via npx.
 * - Executes `fix-imports.js`.
 * - Validates that the generated WAProto works correctly.
 * - Creates a backup of the previous `index.js`.
 * - Replaces the file only when the new version is valid.
 * - Saves the locally installed version.
 *
 * IMPORTANT:
 *
 * The script requires the ability to execute `npx` correctly from the terminal.
 * If `npx` does not exist or is not available in the PATH, WAProto
 * generation will fail.
 *
 * You must also ensure that the path/name of your Baileys
 * installation is correct. By default, the `baileys` package will be used.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

class ProtoUpdate {
	#baseUrl = 'https://raw.githubusercontent.com/wppconnect-team/wa-proto/refs/heads/main';

	#getBaileysPath() {
		try {
			const resolved = import.meta.resolve('baileys/package.json');
			return path.dirname(fileURLToPath(resolved));
		} catch {
			// Custom install: this trimmed repo has no "exports" for self-reference
			// (header note 4), so fall back to the folder holding this script.
			return path.dirname(fileURLToPath(import.meta.url));
		}
	}

	#outputPath = path.join(this.#getBaileysPath(), 'WAProto');
	#targetPath = path.join(this.#outputPath, 'index.js');
	#backupPath = path.join(this.#outputPath, 'index.backup.js');
	#tempDir = path.join(this.#outputPath, '.proto-update');
	#tempProtoPath = path.join(this.#tempDir, 'WAProto.proto');
	#tempIndexPath = path.join(this.#tempDir, 'index.js');
	#tempFixImportsPath = path.join(this.#tempDir, 'fix-imports.js');
	#versionPath = path.join(this.#outputPath, '.proto-version.json');

	#hash(content) {
		return crypto.createHash('sha256').update(content).digest('hex');
	}

	async #fetch(url) {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		return Buffer.from(await response.arrayBuffer());
	}

	async #getRemoteVersion() {
		const data = JSON.parse((await this.#fetch(`${this.#baseUrl}/package.json`)).toString('utf8'));

		if (!data?.version || typeof data.version !== 'string') {
			throw new Error('Remote WAProto version not found');
		}

		return data.version;
	}

	#getLocalVersion() {
		try {
			const data = JSON.parse(fs.readFileSync(this.#versionPath, 'utf8'));

			return typeof data?.version === 'string' ? data.version : null;
		} catch {
			return null;
		}
	}

	#saveLocalVersion(version) {
		const tempVersionPath = `${this.#versionPath}.tmp`;

		fs.writeFileSync(tempVersionPath, JSON.stringify({ version }, null, 2), 'utf8');

		fs.renameSync(tempVersionPath, this.#versionPath);
	}

	#processProto(content) {
		return content
			.toString('utf8')
			.replaceAll('package waproto', 'package proto')
			.replace(/^(\s*)required\s+/gm, '$1optional ');
	}

	#run(command, args, cwd) {
		return new Promise((resolve, reject) => {
			const child = spawn(command, args, {
				cwd,
				stdio: ['ignore', 'pipe', 'pipe'],
				// Windows resolves .cmd (npx.cmd) only through a shell; other
				// platforms keep the safer shell-less spawn.
				shell: process.platform === 'win32',
			});

			let stdout = '';
			let stderr = '';

			child.stdout.on('data', data => {
				const text = data.toString();
				stdout += text;
				process.stdout.write(text);
			});

			child.stderr.on('data', data => {
				const text = data.toString();
				stderr += text;
				process.stderr.write(text);
			});

			child.on('error', reject);

			child.on('close', code => {
				if (code === 0) {
					resolve({ stdout, stderr });
					return;
				}

				reject(new Error(`${command} exited with code ${code}\n${stderr || stdout}`));
			});
		});
	}

	async #validate(file) {
		try {
			const module = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);

			if (!module?.proto) {
				throw new Error('proto export not found');
			}

			const proto = module.proto;

			if (!proto.HandshakeMessage || !proto.HandshakeMessage.ServerHello) {
				throw new Error('HandshakeMessage.ServerHello not found');
			}

			if (typeof proto.HandshakeMessage.decode !== 'function') {
				throw new Error('HandshakeMessage.decode is not a function');
			}

			if (typeof proto.HandshakeMessage.ServerHello.decode !== 'function') {
				throw new Error('ServerHello.decode is not a function');
			}

			return true;
		} catch (error) {
			console.log('WAPROTO', 'Validation failed: ' + error.message);

			return false;
		}
	}

	async updateProtoFiles() {
		fs.mkdirSync(this.#outputPath, {
			recursive: true,
		});

		const remoteVersion = await this.#getRemoteVersion();

		const localVersion = this.#getLocalVersion();

		if (localVersion === remoteVersion && fs.existsSync(this.#targetPath)) {
			console.log('WAPROTO', `Version ${remoteVersion} already installed.`);

			const valid = await this.#validate(this.#targetPath);

			if (valid) {
				console.log('WAPROTO', 'Already up to date.');

				return false;
			}

			console.log('WAPROTO', 'Installed version is invalid. Regenerating...');
		} else if (localVersion) {
			console.log('WAPROTO', `Version changed: ${localVersion} -> ${remoteVersion}`);
		} else {
			console.log('WAPROTO', `Installing WAProto ${remoteVersion}...`);
		}

		fs.rmSync(this.#tempDir, {
			recursive: true,
			force: true,
		});

		fs.mkdirSync(this.#tempDir, {
			recursive: true,
		});

		console.log('WAPROTO', 'Downloading latest WAProto.proto...');

		const remoteProto = await this.#fetch(`${this.#baseUrl}/WAProto.proto`);

		const processedProto = this.#processProto(remoteProto);

		fs.writeFileSync(this.#tempProtoPath, processedProto, 'utf8');

		const fixImportsPath = path.join(this.#outputPath, 'fix-imports.js');

		if (!fs.existsSync(fixImportsPath)) {
			throw new Error('waleys/WAProto/fix-imports.js was not found');
		}

		fs.copyFileSync(fixImportsPath, this.#tempFixImportsPath);

		let currentIndex = '';

		try {
			currentIndex = fs.readFileSync(this.#targetPath, 'utf8');
		} catch {}

		console.log('WAPROTO', 'Generating index.js...');

		await this.#run('npx', ['--yes', '--package=protobufjs-cli@1.1.3', 'pbjs', '-t', 'static-module', '--no-beautify', '-w', 'es6', '--no-bundle', '--no-delimited', '--no-verify', '--no-comments', '-o', './index.js', './WAProto.proto'], this.#tempDir);

		console.log('WAPROTO', 'Running fix-imports.js...');

		await this.#run(process.execPath, ['./fix-imports.js'], this.#tempDir);

		if (!fs.existsSync(this.#tempIndexPath)) {
			throw new Error('Generated index.js was not created');
		}

		const newIndex = fs.readFileSync(this.#tempIndexPath, 'utf8');

		console.log('WAPROTO', 'Validating generated index.js...');

		const valid = await this.#validate(this.#tempIndexPath);

		if (!valid) {
			throw new Error('Generated WAProto/index.js is invalid');
		}

		if (currentIndex && this.#hash(currentIndex) === this.#hash(newIndex)) {
			this.#saveLocalVersion(remoteVersion);

			console.log('WAPROTO', `Already up to date (${remoteVersion}).`);

			fs.rmSync(this.#tempDir, {
				recursive: true,
				force: true,
			});

			return false;
		}

		if (currentIndex) {
			fs.rmSync(this.#backupPath, {
				force: true,
			});

			fs.copyFileSync(this.#targetPath, this.#backupPath);
		}

		const finalTemp = path.join(this.#outputPath, 'index.new.js');

		fs.rmSync(finalTemp, {
			force: true,
		});

		fs.copyFileSync(this.#tempIndexPath, finalTemp);

		fs.renameSync(finalTemp, this.#targetPath);

		fs.rmSync(this.#tempDir, {
			recursive: true,
			force: true,
		});

		this.#saveLocalVersion(remoteVersion);

		console.log('WAPROTO', `Updated successfully to ${remoteVersion} !!`);

		return true;
	}
}

const updater = new ProtoUpdate();

try {
	await updater.updateProtoFiles();
} catch (error) {
	console.log('ERROR', 'WAProto updating files: ' + error.message);
}
