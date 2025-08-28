const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });
let vgmstreamModule;

const statusEl = document.getElementById("status");
const convertBtn = document.getElementById("convertBtn");
convertBtn.disabled = true; // 読み込み完了前はボタン無効

async function loadModules() {
  statusEl.innerText = "vgmstream 読み込み中...";
  vgmstreamModule = await Vgmstream({
    locateFile: () => "https://cdn.jsdelivr.net/gh/jotego/vgmstream-wasm/vgmstream_cli.wasm"
  });
  statusEl.innerText = "ffmpeg 読み込み中...";
  if (!ffmpeg.isLoaded()) await ffmpeg.load();
  statusEl.innerText = "準備完了 ✅";
  convertBtn.disabled = false;
}

loadModules();

async function vgmstreamDecode(file) {
  const arrayBuffer = await file.arrayBuffer();
  const filename = file.name;
  vgmstreamModule.FS_writeFile(filename, new Uint8Array(arrayBuffer));
  statusEl.innerText = "ゲーム音声を WAV に変換中...";
  await vgmstreamModule.callMainAsync(['-o', 'output.wav', filename]);
  return vgmstreamModule.FS_readFile('output.wav');
}

convertBtn.addEventListener("click", async () => {
  const fileInput = document.getElementById("fileInput");
  if (!fileInput.files.length) { alert("ファイルを選択してください"); return; }

  const file = fileInput.files[0];
  const outFormat = document.getElementById("format").value;
  const bitrate = document.getElementById("bitrate").value;
  const samplerate = document.getElementById("samplerate").value;

  convertBtn.disabled = true;
  statusEl.innerText = "変換処理中...";

  try {
    // ゲーム音声 → WAV
    const wavData = await vgmstreamDecode(file);

    // WAV → 選択形式
    statusEl.innerText = "最終変換中 (ffmpeg)...";
    ffmpeg.FS("writeFile", "input.wav", wavData);
    ffmpeg.setProgress(({ ratio }) => {
      statusEl.innerText = `最終変換中 (ffmpeg) ${Math.round(ratio * 100)}%`;
    });

    await ffmpeg.run("-i", "input.wav", "-b:a", bitrate+"k", "-ar", samplerate, `output.${outFormat}`);
    const data = ffmpeg.FS("readFile", `output.${outFormat}`);
    const blob = new Blob([data.buffer], { type: `audio/${outFormat}` });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `output.${outFormat}`;
    a.click();

    statusEl.innerText = "変換完了 ✅";
  } catch (e) {
    console.error(e);
    statusEl.innerText = "変換中にエラーが発生しました ❌";
  } finally {
    convertBtn.disabled = false;
  }
});
