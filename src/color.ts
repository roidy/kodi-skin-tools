/**
 * File: color.ts
 * Author: roidy
 * License: GPL v3 - https://www.gnu.org/licenses/gpl-3.0.html
 */

import * as vscode from 'vscode';

export class ColorProvider implements vscode.DocumentColorProvider {
    provideColorPresentations(color: vscode.Color, context: { readonly document: vscode.TextDocument; readonly range: vscode.Range; }, token: vscode.CancellationToken): vscode.ProviderResult<vscode.ColorPresentation[]> {
        const red = Math.round(color.red * 255);
        const green = Math.round(color.green * 255);
        const blue = Math.round(color.blue * 255);
        const alpha = Math.round(color.alpha * 255);
        const hexColor = `${alpha.toString(16).padStart(2, '0')}${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
        const colorPresentation = new vscode.ColorPresentation(hexColor);
        colorPresentation.textEdit = new vscode.TextEdit(context.range, hexColor);
        return [colorPresentation];
    }

    provideDocumentColors(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.ColorInformation[]> {
        const text = document.getText();
        const colorPattern = /[0-9a-fA-F]{8}/g;
        const matches = text.matchAll(colorPattern);
        const colorInformations: vscode.ColorInformation[] = [];

        for (const match of matches) {
            if (match.index !== undefined) {
                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);
                const range = new vscode.Range(startPos, endPos);
                const colorText = match[0];
                const a = parseInt(colorText.slice(0, 2), 16) / 255;
                const r = parseInt(colorText.slice(2, 4), 16) / 255;
                const g = parseInt(colorText.slice(4, 6), 16) / 255;
                const b = parseInt(colorText.slice(6, 8), 16) / 255;
                const color = new vscode.Color(r, g, b, a);
                colorInformations.push(new vscode.ColorInformation(range, color));
            }
        }

        return colorInformations;
    }
};