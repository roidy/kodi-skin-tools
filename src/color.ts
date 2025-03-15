/**
 * File: color.ts
 * Author: roidy
 * License: GPL v3 - https://www.gnu.org/licenses/gpl-3.0.html
 */

import * as vscode from 'vscode';
import { readFileSync } from "fs";
import { DOMParser } from "xmldom";
import path from 'path';
import { logger } from './logging';

export class ColorProvider implements vscode.DocumentColorProvider {
    provideColorPresentations(color: vscode.Color, context: { readonly document: vscode.TextDocument; readonly range: vscode.Range; }, token: vscode.CancellationToken): vscode.ProviderResult<vscode.ColorPresentation[]> {
        const red = Math.round(color.red * 255);
        const green = Math.round(color.green * 255);
        const blue = Math.round(color.blue * 255);
        const alpha = Math.round(color.alpha * 255);
        const hexColor = `${alpha.toString(16).padStart(2, '0')}${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
        const colorPresentation = new vscode.ColorPresentation(hexColor);
        const startOffset = context.document.offsetAt(context.range.start);
        const endOffset = context.document.offsetAt(context.range.end);
        const val = context.document.getText().substring(startOffset, endOffset);
        const isValidHex = (input: string): boolean => {
            const regex = /^[0-9a-fA-F]{8}$/;
            return regex.test(input);
        };
        if (isValidHex(val)) {
            colorPresentation.textEdit = new vscode.TextEdit(context.range, hexColor);
            return [colorPresentation];
        }
        else {
            return [];
        }
    }

    provideDocumentColors(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.ColorInformation[]> {
        const text = document.getText();
        const colorPattern = /[0-9a-fA-F]{8}/g;
        const nMatch = new RegExp([
            "<textcolor>(.*?)<\/textcolor>",
            "<selectedcolor>(.*?)<\/selectedcolor>",
            "<shadowcolor>(.*?)<\/shadowcolor>",
            "<focusedcolor>(.*?)<\/focusedcolor>",
            "<disabledcolor>(.*?)<\/disabledcolor>",
            "<colordiffuse>(.*?)<\/colordiffuse>",
            "colordiffuse=\"(.*?)\""
        ].join("|"), "ig");

        const namedMatches = text.matchAll(nMatch);
        const hexMatches = text.matchAll(colorPattern);

        const colorInformations: vscode.ColorInformation[] = [];

        for (const match of hexMatches) {
            if (match.index !== undefined) {
                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);
                const range = new vscode.Range(startPos, endPos);
                const colorText = match[0];
                if (colorText) {
                    const a = parseInt(colorText.slice(0, 2), 16) / 255;
                    const r = parseInt(colorText.slice(2, 4), 16) / 255;
                    const g = parseInt(colorText.slice(4, 6), 16) / 255;
                    const b = parseInt(colorText.slice(6, 8), 16) / 255;
                    const color = new vscode.Color(r, g, b, a);
                    colorInformations.push(new vscode.ColorInformation(range, color));
                }
            }
        }

        for (const match of namedMatches) {
            const content = match.slice(1).find(group => group !== undefined);

            if (content && match.index !== undefined) {
                const startIndex = match.index + match[0].indexOf(content);
                const startPos = document.positionAt(startIndex);
                const endPos = document.positionAt(startIndex + content.length);
                const range = new vscode.Range(startPos, endPos);
                const c = colors.colors.find(c => c.name === content);
                if (c) {
                    const colorText = c!.value;
                    if (colorText) {
                        const a = parseInt(colorText.slice(0, 2), 16) / 255;
                        const r = parseInt(colorText.slice(2, 4), 16) / 255;
                        const g = parseInt(colorText.slice(4, 6), 16) / 255;
                        const b = parseInt(colorText.slice(6, 8), 16) / 255;
                        const color = new vscode.Color(r, g, b, a);
                        colorInformations.push(new vscode.ColorInformation(range, color));
                    }
                }
            }
        }

        return colorInformations;
    }
};

class Colors {
    public colors: { name: string; value: string | null }[] = [];

    constructor() {
        this.loadColorFile();
    }

    public loadColorFile() {
        const editor = vscode.window.activeTextEditor;
        if (editor?.document.uri) {
            const folder = vscode.workspace.getWorkspaceFolder(editor!.document.uri);
            const colorFile = folder!.uri.fsPath + `${path.sep}colors${path.sep}defaults.xml`;
            const xml = readFileSync(colorFile, 'utf-8');
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, "application/xml");
            const colorElements = xmlDoc.getElementsByTagName("color");

            this.colors = [];

            Array.from(colorElements).forEach(element => {
                const name = element.getAttribute("name");
                const value = element.textContent;
                if (name && value) {
                    this.colors.push({ name, value });
                }
            });
        }
    }
}

export const colors = new Colors();