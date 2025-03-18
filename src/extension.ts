/**
 * File: extension.ts
 * Author: roidy
 * License: GPL v3 - https://www.gnu.org/licenses/gpl-3.0.html
 */

import * as vscode from 'vscode';
import { logger, LogLevel } from './logging';
import { config } from './configuration';
import { localize } from './localize';
import { decorator } from './decorator';
import { po } from './po-file';
import { reloadKodiSkin } from './utils';
import { DefinitionProvider } from './definition';
import { ReferenceProvider } from './reference';
import { ColorProvider } from './color';
import { colors } from './color';
import { MyTreeDataProvider } from './idview';

let colorProviderDisposable: vscode.Disposable | undefined;

/**
 * Activate the Kodi Skin Tools extension.
 */
export function activate(context: vscode.ExtensionContext) {

    logger.log('Kodi Skin Tools is active.', LogLevel.Info);

    decorator.context = context;

    // Force an initial decoration update.
    decorator.updateDecorations();

    /**
     * Register all commands.
     */
    context.subscriptions.push(
        vscode.commands.registerCommand('kodi-skin-tools.Localize', () => {
            localize.run();
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('kodi-skin-tools.NewTranslation', () => {
            po.generateTranslation();
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.showColorPicker', () => {
            vscode.commands.executeCommand('editor.action.pickColor');
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

        event.contentChanges.forEach(change => {
            // logger.log(`Text changed: ${change.text}`);
            // Optionally, detect if the change is related to a color edit
            if (change.text.length === 8) {
                logger.log(`Color selection finalized: ${change.text}`);
            }
        });



        if (decorator.activeEditor && event.document === decorator.activeEditor.document) {
            decorator.updateDecorations();
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidSaveTextDocument(document => {
        // Saved document was a po file so reload it.
        if (document.uri.fsPath.endsWith('.po')) {
            po.loadSkinPO();
        }
        // Saved document was the color file so reload it.
        if (document.uri.fsPath.includes('colors/defaults.xml')) {
            colors.loadColorFile();
            // Dispose of and re-register the ColorProvider to force any open editors to update.
            if (colorProviderDisposable) {
                colorProviderDisposable.dispose();
            }
            colorProviderDisposable = vscode.languages.registerColorProvider({ language: 'xml', scheme: 'file', pattern: '**/*.xml' },
                new ColorProvider()
            );
        }
        // If document has a known extension then reload the Kodi skin.
        const hasExtension = config.reloadExtensions!.some(extension => document.uri.fsPath.endsWith(extension));
        if (hasExtension) { reloadKodiSkin(); }
    }, null, context.subscriptions);

    // Listen for editor focus changes
    vscode.window.onDidChangeWindowState(event => {
        if (!event.focused) {
            // Skip if focus is lost (e.g., switching away from VSCode entirely)
            return;
        }

        logger.log(`hello even chaged ${event.focused}`);

        // Apply the deferred color edit if available
        if (colors.deferredColorEdit) {
            logger.log('Have a deferred color edit to apply.');
            const { uri, range, text } = colors.deferredColorEdit;

            const edit = new vscode.WorkspaceEdit();
            edit.replace(uri, range, text);

            vscode.workspace.applyEdit(edit).then(() => {
                logger.log(`Final color edit applied: %{text}`);
                colors.deferredColorEdit = null; // Clear the deferred edit
            });
        }
    });

    // vscode.window.createTreeView("package-dependencies", {
     
    // });

    vscode.window.registerTreeDataProvider('package-dependencies', new MyTreeDataProvider());
    vscode.window.registerTreeDataProvider('myTreeView', new MyTreeDataProvider());

    /**
     * Register all providers
     */
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider('xml',
            new DefinitionProvider())
    );

    context.subscriptions.push(
        vscode.languages.registerReferenceProvider('xml',
            new ReferenceProvider())
    );


    colorProviderDisposable = vscode.languages.registerColorProvider({ language: 'xml', scheme: 'file', pattern: '**/*.xml' },
        new ColorProvider()
    );
}

/**
 * Deactivate the Kodi Skin Tools extension.
 */
export function deactivate() {
    if (colorProviderDisposable) {
        colorProviderDisposable.dispose();
    }
    logger.log('Kodi Skin Tools deactivated.', LogLevel.Info);
}
