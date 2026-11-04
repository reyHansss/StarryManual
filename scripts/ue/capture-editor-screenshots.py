"""在 Starry 编辑器内截取手册使用的资产编辑器截图。

用法（脚本路径不要含空格；在 Git Bash 中先设置 MSYS_NO_PATHCONV=1，避免地图路径被改写）：
    UnrealEditor.exe <项目目录>/Starry.uproject /Engine/Maps/Entry -unattended -nosplash
        -ExecCmds="py <脚本路径>/capture-editor-screenshots.py"

不要用 -ExecutePythonScript：它在脚本返回后立即退出编辑器，等不到界面绘制。
脚本依次打开 CAPTURES 中的资产编辑器，等待界面绘制后用引擎的 EditorShot All 命令截取所有可见窗口，
把新生成的 BMP 移到 <项目>/Saved/ManualCapture/<名称>/，最后退出编辑器。只打开资产，不修改或保存任何内容。
"""

import glob
import os
import shutil

import unreal

# (资产路径, 输出名称)；名称同时用作手册 public/images 下的文件名。
CAPTURES = [
    ("/Game/Blueprints/Ecology/AI/AIBM_Ecology", "stellaai-aibm-editor"),
    ("/Game/Blueprints/Ecology/AI/AIBMS_Ecology", "stellaai-stack-editor"),
    ("/Game/Blueprints/Ecology/AI/AI_Ecology", "stellaai-aisetup"),
]

# 打开编辑器后等待的帧数，让延迟创建的页签与列表完成首次布局。
SETTLE_FRAMES = 120

SAVED = unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_saved_dir())
OUTPUT_ROOT = os.path.join(SAVED, "ManualCapture")
# EditorShot 写入编辑器截图目录，默认是 Saved/Screenshots 下的平台子目录。
SHOT_PATTERN = os.path.join(SAVED, "Screenshots", "**", "EditorScreenshot*.bmp")
editors = unreal.get_editor_subsystem(unreal.AssetEditorSubsystem)
state = {"index": 0, "frames": 0, "asset": None, "before": set()}
handle = None


def log(message):
    unreal.log("[ManualCapture] " + message)


def shots():
    return set(glob.glob(SHOT_PATTERN, recursive=True))


def finish():
    unreal.unregister_slate_post_tick_callback(handle)
    editors.close_all_asset_editors()
    log("done, quitting editor")
    unreal.SystemLibrary.quit_editor()


def tick(_delta):
    try:
        if state["index"] >= len(CAPTURES):
            finish()
            return
        path, name = CAPTURES[state["index"]]
        if state["asset"] is None:
            editors.close_all_asset_editors()
            asset = unreal.load_asset(path)
            if asset is None:
                log("missing asset " + path)
                state["index"] += 1
                return
            editors.open_editor_for_assets([asset])
            state["asset"] = asset
            state["frames"] = 0
            return
        state["frames"] += 1
        if state["frames"] < SETTLE_FRAMES:
            return
        before = shots()
        unreal.SystemLibrary.execute_console_command(None, "EditorShot All")
        directory = os.path.join(OUTPUT_ROOT, name)
        os.makedirs(directory, exist_ok=True)
        new_files = sorted(shots() - before)
        for index, file in enumerate(new_files):
            shutil.move(file, os.path.join(directory, "window-%d.bmp" % index))
        log("captured %s: %d window(s) -> %s" % (path, len(new_files), directory))
        editors.close_all_asset_editors()
        state["asset"] = None
        state["index"] += 1
    except Exception as error:  # 任何异常都退出编辑器，避免后台进程一直挂着。
        log("error: " + str(error))
        finish()


handle = unreal.register_slate_post_tick_callback(tick)
log("registered, output " + OUTPUT_ROOT)
