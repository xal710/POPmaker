import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const productName = pkg.build?.productName ?? "POP作成ツール";
const releaseDir = join(root, "release-build");
const shareRoot = join(root, "share");
const shareDir = join(shareRoot, productName);
const zipPath = join(shareRoot, `${productName}.zip`);

function findPortableExe() {
  if (!existsSync(releaseDir)) {
    throw new Error("release-build がありません。先に npm run electron:build を実行してください。");
  }

  const candidates = readdirSync(releaseDir).filter(
    (name) => name.endsWith(".exe") && !name.toLowerCase().includes("unpacked"),
  );

  if (candidates.length === 0) {
    throw new Error("Portable exe が見つかりません。npm run electron:build を実行してください。");
  }

  return candidates[0];
}

function writeReadme(version) {
  const text = `${productName}（Windows版）
バージョン: ${version}

■ 共有・配布について
  このフォルダ（または同梱の ZIP）をそのまま相手に渡せば使えます。
  中身は次の2つだけです。
    1. ${productName}.exe  … 本体（これを起動）
    2. 使い方.txt          … このファイル

  ソースコードや node_modules などは不要です。

■ 起動方法
  1. ${productName}.exe をダブルクリック
  2. アプリウィンドウが開いたらそのまま利用

■ 初回起動時の注意（Windows）
  「Windows によって PC が保護されました」と表示される場合があります。
  未署名アプリのため出る警告です。
  「詳細情報」→「実行」で起動できます。

■ 必要な環境
  - Windows 10 / 11（64bit）
  - インターネット接続（価格更新・カード画像取得に必要）

■ データの保存場所
  比較データなどは次のフォルダに保存されます（アプリ本体とは別）。
  %AppData%\\pop-kaitori-tool\\data

■ パスワード
  ローカル版のため、パスワード入力は不要です。

■ トラブル時
  - 起動しない: ウイルス対策ソフトの除外設定を確認
  - 画像が出ない: インターネット接続を確認
  - 古い版から更新: 新しい exe に差し替える（データは AppData に残ります）
`;

  writeFileSync(join(shareDir, "使い方.txt"), text, "utf8");
}

function createZipArchive() {
  const source = join(shareDir, "*");
  const command = `powershell -NoProfile -Command "Compress-Archive -LiteralPath @('${join(shareDir, `${productName}.exe`)}','${join(shareDir, "使い方.txt")}') -DestinationPath '${zipPath}' -Force"`;
  execSync(command, { stdio: "inherit" });
}

const portableExe = findPortableExe();

rmSync(shareRoot, { recursive: true, force: true });
mkdirSync(shareDir, { recursive: true });

cpSync(join(releaseDir, portableExe), join(shareDir, `${productName}.exe`));
writeReadme(pkg.version);
createZipArchive();

console.log("");
console.log("共有用ファイルを作成しました:");
console.log(`  フォルダ: ${shareDir}`);
console.log(`  ZIP:      ${zipPath}`);
console.log("");
console.log("どちらか一方を相手に渡せば使えます（中身は同じです）。");
