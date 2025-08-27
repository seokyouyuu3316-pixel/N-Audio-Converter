const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });
let vgmstreamModule;

async function loadVgmstream() {
  vgmstreamModule = await Vgmstream({
    locateFile: () => "https://cdn.jsdelivr.net/gh/jotego/vgmstream-wasm/vgmstream_cli.wasm"
  });
  console.log("vgmstream loaded");
}
loadVgmstream();

async function vgmstreamDecode(file) {
  const arrayBuffer = await file.arrayBuffer();
  const filename = file.name;
  vgmstreamModule.FS_writeFile(filename, new Uint8Array(arrayBuffer));
  vgmstreamModule.callMain(['-o', 'output.wav', filename]);
  return vgmstreamModule.FS_readFile('output.wav');
}

document.getElementById("convertBtn").addEventListener("click", async () => {
  const fileInput = document.getElementById("fileInput");
  if (!fileInput.files.length) { alert("ファイルを選択してください"); return; }

  const file = fileInput.files[0];
  const outFormat = document.getElementById("format").value;
  const bitrate = document.getElementById("bitrate").value;
  const samplerate = document.getElementById("samplerate").value;

  document.getElementById("status").innerText = "変換中...";

  // ゲーム音声 → WAV
  const wavData = await vgmstreamDecode(file);

  // WAV → 選択形式
  if (!ffmpeg.isLoaded()) await ffmpeg.load();
  ffmpeg.FS("writeFile", "input.wav", wavData);
  await ffmpeg.run("-i", "input.wav", "-b:a", bitrate+"k", "-ar", samplerate, `output.${outFormat}`);

  const data = ffmpeg.FS("readFile", `output.${outFormat}`);
  const blob = new Blob([data.buffer], { type: `audio/${outFormat}` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `output.${outFormat}`;
  a.click();

  document.getElementById("status").innerText = "変換完了！";
});
