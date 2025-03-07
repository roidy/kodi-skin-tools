import * as vscode from 'vscode';
import { config } from './configuration';
import { logger } from './logging';
import { po } from './po-file';


export function activate(context: vscode.ExtensionContext) {

    const disposable = vscode.commands.registerCommand('kodi-skin-tools.Localize', () => {

        logger.log(po.getString(31000));
        
        vscode.window.showInformationMessage('Hello World from Kodi Skin Tools!');
    });

    context.subscriptions.push(disposable);

    vscode.workspace.onDidChangeConfiguration(() => {
        config.loadConfig();
        logger.log('Kodi Skin Tools - config changed');
        logger.log(`Decorator Color: ${config.decoratorColor}`);
    });
}

// This method is called when your extension is deactivated
export function deactivate() { }
