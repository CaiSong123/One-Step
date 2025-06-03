const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// 脚本文件名
const SCRIPT_FILENAME = 'run.sh'; // 构建脚本文件名 (固定为 run.sh)
const DOWNLOAD_SCRIPT_FILENAME = 'download.sh'; // 下载脚本文件名 (固定为 download.sh)

let sharedTerminal = null;
const SHARED_TERMINAL_NAME = "Build/Download Terminal"; // 终端名称

let compileBtn, rebuildBtn, cleanBtn, downloadBtn;

// 执行构建脚本 (run.sh) 的函数
async function executeRunScript() { // 声明为 async 以便使用 await
    try {
        // 在执行脚本前保存所有已修改的文件
        const allSaved = await vscode.workspace.saveAll(); // true 参数会保存包括 untitled 在内的文件, 通常建议包含
        if (!allSaved) {
            vscode.window.showWarningMessage('部分文件未能保存，构建可能基于旧版文件。');
            // 可以选择在此处返回，或者让用户决定是否继续
            // return; 
        }
    } catch (error) {
        vscode.window.showErrorMessage(`保存文件时出错: ${error.message}`);
        return; // 保存失败则不继续执行构建
    }

    if (!SCRIPT_FILENAME) { // 理论上，由于 SCRIPT_FILENAME 是 const, 此检查不会失败
        vscode.window.showErrorMessage('构建脚本未配置。');
        return;
    }

    // 确保使用单个共享终端，如果终端已关闭则重新创建
    if (!sharedTerminal || sharedTerminal.exitStatus !== undefined) {
        if (sharedTerminal && sharedTerminal.exitStatus === undefined) {
            sharedTerminal.dispose();
        }
        sharedTerminal = vscode.window.createTerminal({ name: SHARED_TERMINAL_NAME });
    }

    // 执行脚本，假定脚本位于工作区根目录
    sharedTerminal.sendText(`./${SCRIPT_FILENAME}`);
    sharedTerminal.show();
}

// 执行下载脚本 (download.sh) 的函数
async function executeDownloadScript() { // 声明为 async 以便将来可能添加 await 操作 (例如 saveAll)

    if (!DOWNLOAD_SCRIPT_FILENAME) { // 理论上，由于 DOWNLOAD_SCRIPT_FILENAME 是 const, 此检查不会失败
        vscode.window.showErrorMessage('下载脚本未配置。');
        return;
    }

    // 确保使用单个共享终端，如果终端已关闭则重新创建
    if (!sharedTerminal || sharedTerminal.exitStatus !== undefined) {
        if (sharedTerminal && sharedTerminal.exitStatus === undefined) {
            sharedTerminal.dispose();
        }
        sharedTerminal = vscode.window.createTerminal({ name: SHARED_TERMINAL_NAME });
    }
    
    // 执行脚本，假定脚本位于工作区根目录
    sharedTerminal.sendText(`./${DOWNLOAD_SCRIPT_FILENAME}`);
    sharedTerminal.show();
}

// 执行清理命令 (删除 'build' 文件夹)
function executeCleanCommand() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('请先打开一个工作区。');
        return;
    }
    const buildFolderPath = path.join(workspaceFolders[0].uri.fsPath, 'build');
    try {
        if (fs.existsSync(buildFolderPath)) {
            fs.rmSync(buildFolderPath, { recursive: true, force: true });
            vscode.window.showInformationMessage("'build' 文件夹已成功删除。");
        } else {
            vscode.window.showInformationMessage("'build' 文件夹不存在，无需删除。");
        }
    } catch (error) {
        vscode.window.showErrorMessage(`删除 'build' 文件夹失败: ${error.message}`);
    }
}

// 更新状态栏按钮的提示信息
function updateStatusBarItems() {
    if (compileBtn) {
        compileBtn.tooltip = `执行构建脚本 (./${SCRIPT_FILENAME})`;
    }
    if (rebuildBtn) {
        rebuildBtn.tooltip = `清理并执行构建脚本 (./${SCRIPT_FILENAME})`;
    }
    if (downloadBtn) {
        downloadBtn.tooltip = `执行下载脚本 (./${DOWNLOAD_SCRIPT_FILENAME})`;
    }
}

// 初始化（现在仅更新状态栏提示）
function initializeExtension() {
    updateStatusBarItems();
}

async function activate (context) {
    const CMD_PREFIX = "extension."; // 与 package.json 中的命令前缀保持一致

    compileBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 2);
    compileBtn.text = '⚙️ Build';
    compileBtn.command = CMD_PREFIX + 'compile';
    compileBtn.show();
    context.subscriptions.push(compileBtn);

    rebuildBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
    rebuildBtn.text = '🔄 Rebuild';
    rebuildBtn.command = CMD_PREFIX + 'rebuild';
    rebuildBtn.show();
    context.subscriptions.push(rebuildBtn);

    downloadBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    downloadBtn.text = '🚀 Download';
    downloadBtn.command = CMD_PREFIX + 'download';
    downloadBtn.show();
    context.subscriptions.push(downloadBtn);

    cleanBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -1);
    cleanBtn.text = '🧹 Clean';
    cleanBtn.command = CMD_PREFIX + 'clean';
    cleanBtn.tooltip = "删除 'build' 文件夹"; // Clean按钮的tooltip是固定的
    cleanBtn.show();
    context.subscriptions.push(cleanBtn);

    initializeExtension(); 

    context.subscriptions.push(
        vscode.commands.registerCommand(CMD_PREFIX + 'compile', () => executeRunScript()),
        vscode.commands.registerCommand(CMD_PREFIX + 'rebuild', async () => { // rebuild 命令回调设为 async
            executeCleanCommand(); // 清理是同步的
            await executeRunScript(); // 等待构建完成
        }),
        vscode.commands.registerCommand(CMD_PREFIX + 'clean', () => executeCleanCommand()),
        vscode.commands.registerCommand(CMD_PREFIX + 'download', () => executeDownloadScript())
    );

    context.subscriptions.push({
        dispose: () => {
            if (sharedTerminal) {
                sharedTerminal.dispose();
            }
        }
    });
}

function deactivate () {
    if (sharedTerminal) {
        sharedTerminal.dispose();
    }
}

module.exports = { activate, deactivate };