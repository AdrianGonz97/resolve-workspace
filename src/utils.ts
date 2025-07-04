import fs from 'node:fs';
import path from 'node:path';

export function find(cwd: string, filenames: string[]): string | undefined {
	for (const filename of filenames) {
		const filepath = path.resolve(cwd, filename);
		if (fs.existsSync(filepath)) {
			return filepath;
		}
	}

	const next = path.resolve(cwd, '..');
	// reached the root
	if (cwd === next) {
		return undefined;
	}

	return find(next, filenames);
}

// could be either a `package.json` or `deno.json`
type PackageConfig = { workspace?: string[] } | { workspaces?: string[] };

export function readJSON(path: string): PackageConfig {
	const json = fs.readFileSync(path, 'utf8');
	return JSON.parse(json);
}
