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
        if (decorator.activeEditor && event.document === decorator.activeEditor.document) {
            decorator.updateDecorations();
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidSaveTextDocument(document => {
        // Saved document was a po file so reload it.
        if (document.uri.fsPath.endsWith('.po')) {
            po.loadSkinPO();
        }
        // If document has a known extension then reload the Kodi skin.
        const hasExtension = config.reloadExtensions!.some(extension => document.uri.fsPath.endsWith(extension));
        if (hasExtension) { reloadKodiSkin(); }
    }, null, context.subscriptions);

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


    context.subscriptions.push(
        vscode.languages.registerColorProvider({ language: 'xml', scheme: 'file', pattern: '**/*.xml' },
            new ColorProvider()
        )
    );
    // provideColorPresentations(color: vscode.Color, context: { document: vscode.TextDocument, range: vscode.Range }, token: vscode.CancellationToken): vscode.ProviderResult<vscode.ColorPresentation[]> {
    //     const red = Math.round(color.red * 255);
    //     const green = Math.round(color.green * 255);
    //     const blue = Math.round(color.blue * 255);
    //     const alpha = Math.round(color.alpha * 255);
    //     const hexColor = `${alpha.toString(16).padStart(2, '0')}${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;

    //     const colorPresentation = new vscode.ColorPresentation(hexColor);
    //     colorPresentation.textEdit = new vscode.TextEdit(context.range, hexColor);
    //     return [colorPresentation];
    // },


    //     provideDocumentColors(document, token) {
    //         const positionStart = new vscode.Position(2, 29);
    //         const positionEnd = new vscode.Position(2, 37);

    //         const range = new vscode.Range(positionStart, positionEnd);
    //         const colorText = document.getText(range);
    //         logger.log(`ColorText: ${colorText}`);
    //         const a = parseInt(colorText.slice(0, 2), 16) / 255;
    //         const r = parseInt(colorText.slice(2, 4), 16);
    //         const g = parseInt(colorText.slice(4, 6), 16);
    //         const b = parseInt(colorText.slice(6, 8), 16);
    //         logger.log(`ARGB: ${a},${r},${g},${b}`);
    //         const color = new vscode.Color(r, g, b, a);
    //         logger.log(`Final ARGB: ${color.alpha},${color.red},${color.green},${color.blue}`);
    //         // const color = new vscode.Color(255, 0, 0, 1);
    //         return [new vscode.ColorInformation(range, color)];
    //     }
    // });
    // });
    // }
    // }
    // );
}

/**
 * Deactivate the Kodi Skin Tools extension.
 */
export function deactivate() {
    logger.log('Kodi Skin Tools deactivated.', LogLevel.Info);
}
