import * as vscode from 'vscode';
import { logger, LogLevel } from './logging';
import { config } from './configuration';
import { localize } from './localize';

/**
 * Activate the Kodi Skin Tools extension.
 */
export function activate(context: vscode.ExtensionContext) {
    logger.log('Kodi Skin Tools is active.', LogLevel.Info);

    /**
     *  Register all commands.
     */
    context.subscriptions.push(
        vscode.commands.registerCommand('kodi-skin-tools.Localize', () => {
            localize.run();
        })
    );

    /**
     * Register all events.
     */
    vscode.workspace.onDidChangeConfiguration(() => {
        config.loadConfig();
    });
}

/**
 * Deactivate the Kodi Skin Tools extension.
 */
export function deactivate() {
    logger.log('Kodi Skin Tools deactivated.', LogLevel.Info);
}
