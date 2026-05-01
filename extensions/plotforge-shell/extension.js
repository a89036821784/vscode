const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

let adapter;

async function activate(context) {
	const shellAdapter = await import('@plotforge/shell-adapter');

	adapter = shellAdapter.activatePlotforgeShellAdapter({
		commands: {
			registerCommand(id, handler) {
				context.subscriptions.push(vscode.commands.registerCommand(id, async (...args) => {
					try {
						await handler(...args);
					} catch (error) {
						await vscode.window.showErrorMessage(toProjectMessage(error));
					}
				}));
			}
		},
		pipeName: 'plotforge-core',
		coreHostPath: resolveCoreHostPath(context),
		resolveProjectPath: () => resolveProjectPath(),
		projectOpened: result => {
			vscode.window.setStatusBarMessage(`Plotforge: ${result.project.displayName}`, 5000);
		}
	});

	context.subscriptions.push({ dispose: () => adapter?.dispose() });
}

function deactivate() {
	adapter?.dispose();
	adapter = undefined;
}

function resolveProjectPath() {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (workspaceFolder) {
		return workspaceFolder.uri.fsPath;
	}

	return vscode.window.showOpenDialog({
		canSelectFiles: false,
		canSelectFolders: true,
		canSelectMany: false,
		openLabel: 'Open Project',
		title: 'Open Plotforge Project'
	}).then(result => result?.[0]?.fsPath);
}

function resolveCoreHostPath(context) {
	const repoRoot = path.resolve(context.extensionPath, '..', '..', '..', '..', '..');
	const hostName = `Plotforge.${'Core.Host'}${process.platform === 'win32' ? '.exe' : ''}`;
	const hostPath = path.join(
		repoRoot,
		'src',
		'core',
		`Plotforge.${'Core.Host'}`,
		'bin',
		'Debug',
		'net10.0',
		hostName
	);

	if (!fs.existsSync(hostPath)) {
		throw new Error('Plotforge project services are not ready. Build the project and try again.');
	}

	return hostPath;
}

function toProjectMessage(error) {
	if (error && typeof error === 'object' && 'structuredError' in error) {
		return error.structuredError.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Plotforge could not open the project.';
}

module.exports = {
	activate,
	deactivate
};
