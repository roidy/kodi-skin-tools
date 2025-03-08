import * as vscode from 'vscode';
import { logger, LogLevel } from './logging';
import { config } from './configuration';
import { localize } from './localize';
import { decorator } from './decorator';
import { po } from './po-file';
import { reloadKodiSkin } from './utils';

/**
 * Activate the Kodi Skin Tools extension.
 */
export function activate(context: vscode.ExtensionContext) {
    logger.log('Kodi Skin Tools is active.', LogLevel.Info);

    decorator.updateDecorations();

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
    }, null, context.subscriptions);
    
    vscode.window.onDidChangeActiveTextEditor(async editor => {
        if (editor) {
            decorator.activeEditor = editor;
            decorator.updateDecorations();
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        if (decorator.activeEditor && event.document === decorator.activeEditor.document) {
            decorator.updateDecorations();
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidSaveTextDocument(document => {
        if (document.uri.fsPath.endsWith('.po')) {
            po.loadSkinPO();
        }
        const hasExtension = config.reloadExtensions!.some(extension => document.uri.fsPath.endsWith(extension));
        if (hasExtension) { reloadKodiSkin(); }
    });
}


/**
 * Deactivate the Kodi Skin Tools extension.
 */
export function deactivate() {
    logger.log('Kodi Skin Tools deactivated.', LogLevel.Info);
}
