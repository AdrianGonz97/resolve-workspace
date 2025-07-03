import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'yaml';
import { globSync } from 'tinyglobby';

interface Workspace {
	/** The absolute path to the workspace root. */
	root: string; // point to the package.json or the package's directory? 🤔
	/** An array of absolute paths for a workspace's packages. */
	packages: string[];
}

/**
 * Resolves workspace details.
 *
 * @param cwd The starting point.
 *
 * @returns the details of the workspace, `undefined` if `cwd` is not in a workspace.
 */
export function resolve(cwd: string): Workspace | undefined {
	cwd = path.resolve(cwd); // ensure it's an absolute path.

	// find workspace root
	let pkgPath = find(cwd, 'package.json');
	if (!pkgPath) return;

	let workspace: RawWorkspace | undefined;
	while (workspace === undefined && pkgPath !== undefined) {
		const pkg = readJSON(pkgPath);
		workspace = findWorkspace(pkgPath, pkg);
		if (workspace === undefined) {
			pkgPath = find(path.resolve(pkgPath, '..', '..'), 'package.json');
		}
	}

	if (!workspace || !pkgPath) return;

	const packages = resolveWorkspacePackages(workspace);

	return { root: workspace.root, packages };
}

interface RawWorkspace {
	root: string;
	globs: string[];
}

function findWorkspace(pkgPath: string, pkg: any): RawWorkspace | undefined {
	const root = path.resolve(pkgPath, '..');
	// covers npm, yarn, bun, and deno (partially - doesn't include checking `deno.json`)
	if (Array.isArray(pkg.workspaces)) return { root, globs: pkg.workspaces };

	const pnpmWorkspacePath = path.resolve(pkgPath, '..', 'pnpm-workspace.yaml');
	if (fs.existsSync(pnpmWorkspacePath)) {
		const pnpmYaml = fs.readFileSync(pnpmWorkspacePath, 'utf8');
		const { packages = [] } = yaml.parse(pnpmYaml);
		return { root, globs: packages };
	}
}

const trailingSlashRegex = /(\\|\/)$/;

function resolveWorkspacePackages(workspace: RawWorkspace) {
	const packagePaths = globSync(workspace.globs, {
		cwd: workspace.root,
		onlyDirectories: true,
		absolute: true,
	});

	const packages = [];

	for (const pkgDir of packagePaths) {
		const pkgPath = path.resolve(pkgDir, 'package.json');
		if (fs.existsSync(pkgPath)) {
			// removes any trailing slashes
			packages.push(pkgDir.replace(trailingSlashRegex, ''));
		}
	}

	return packages;
}

function find(cwd: string, filename: string): string | undefined {
	const filepath = path.resolve(cwd, filename);
	if (fs.existsSync(filepath)) {
		return filepath;
	}

	const next = path.resolve(cwd, '..');
	// reached the root
	if (cwd === next) {
		return undefined;
	}

	return find(next, filename);
}

function readJSON(path: string) {
	const json = fs.readFileSync(path, 'utf8');
	return JSON.parse(json);
}
