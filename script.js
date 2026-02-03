// グローバル変数の定義
const videoElement = document.getElementById('video');
const resultText = document.getElementById('result-text');
const openUrlBtn = document.getElementById('open-url-btn');
const zoomSliderContainer = document.getElementById('zoom-slider-container');
const zoomSlider = document.getElementById('zoom-slider');
const torchBtn = document.getElementById('torch-btn');
const specialArea = document.getElementById('special-action-area');

// ZXingの初期化を安全に行う
let codeReader = null;
try {
    if (typeof ZXing !== 'undefined') {
        codeReader = new ZXing.BrowserMultiFormatReader();
    } else {
        console.error("ZXing library is not loaded.");
        alert("ライブラリの読み込みに失敗しました。インターネット接続を確認してリロードしてください。");
    }
} catch (e) {
    console.error("Error initializing ZXing:", e);
}

let activeVideoTrack = null;
let isTorchOn = false;
let isCameraStarting = false;

// --- 多言語設定 ---
let currentLang = localStorage.getItem('qr_lang') || 'ja';

const translations = {
    ja: {
        install_app: "📲 アプリをインストール",
        scan_guide: "QRコードを枠内に写すか、画像を選択してください",
        create: "作成",
        history: "履歴",
        read_from_image: "🖼️ 画像から読み取る",
        result_title: "検出結果",
        open_url: "🔗 URLを開く",
        copy_result: "結果をコピー",
        resume: "再開",
        history_title: "スキャン履歴",
        clear_history: "全ての履歴を削除",
        back: "戻る",
        settings_title: "設定",
        sound_setting: "スキャン時の音",
        vibrate_setting: "スキャン時の振動",
        generator_title: "QRコード作成",
        type_url: "🌐 URL / テキスト",
        type_wifi: "📶 Wi-Fi設定",
        type_vcard: "👤 連絡先 (vCard)",
        placeholder_url: "URLまたはテキストを入力",
        placeholder_ssid: "ネットワーク名 (SSID)",
        placeholder_pass: "パスワード",
        no_pass: "なし",
        placeholder_name: "名前",
        placeholder_tel: "電話番号",
        placeholder_email: "メールアドレス",
        generate_btn: "QRコードを生成",
        save_image: "💾 画像を保存",
        wifi_info_title: "📶 Wi-Fi接続情報",
        wifi_pass_label: "パスワード",
        wifi_pass_none: "(なし)",
        copy_password: "パスワードをコピー",
        contact_info_title: "👤 連絡先検出",
        contact_name: "名前",
        contact_tel: "電話",
        save_contact: "連絡先を保存 (.vcf)",
        no_history: "履歴はありません",
        copy: "コピー",
        open: "開く",
        delete: "削除",
        confirm_delete_all: "全ての履歴を削除しますか？",
        input_content: "内容を入力してください",
        qr_not_found_alert: "QRコードが見つかりませんでした。\n・画像を鮮明にする\n・余白を含めてトリミングする\nなどを試してみてください。",
        copied: "コピーしました",
        image_not_found: "保存可能な画像が見つかりませんでした",
        qr_not_generated: "QRコードが生成されていません",
        unknown: "不明"
    },
    en: {
        install_app: "📲 Install App",
        scan_guide: "Scan QR code or select an image",
        create: "Create",
        history: "History",
        read_from_image: "🖼️ Image Scan",
        result_title: "Scan Result",
        open_url: "🔗 Open URL",
        copy_result: "Copy Result",
        resume: "Resume",
        history_title: "History",
        clear_history: "Clear All History",
        back: "Back",
        settings_title: "Settings",
        sound_setting: "Scan Sound",
        vibrate_setting: "Scan Vibrate",
        generator_title: "QR Generator",
        type_url: "🌐 URL / Text",
        type_wifi: "📶 Wi-Fi Config",
        type_vcard: "👤 Contact (vCard)",
        placeholder_url: "Enter URL or Text",
        placeholder_ssid: "Network Name (SSID)",
        placeholder_pass: "Password",
        no_pass: "None",
        placeholder_name: "Name",
        placeholder_tel: "Phone",
        placeholder_email: "Email",
        generate_btn: "Generate QR",
        save_image: "💾 Save Image",
        wifi_info_title: "📶 Wi-Fi Info",
        wifi_pass_label: "Password",
        wifi_pass_none: "(None)",
        copy_password: "Copy Password",
        contact_info_title: "👤 Contact Detect",
        contact_name: "Name",
        contact_tel: "Phone",
        save_contact: "Save Contact (.vcf)",
        no_history: "No history",
        copy: "Copy",
        open: "Open",
        delete: "Delete",
        confirm_delete_all: "Delete all history?",
        input_content: "Please enter content",
        qr_not_found_alert: "QR code not found.\n- Try sharpening the image\n- Crop with some margin",
        copied: "Copied to clipboard",
        image_not_found: "No image found to save",
        qr_not_generated: "QR Code not generated",
        unknown: "Unknown"
    }
};

function t(key) {
    return translations[currentLang][key] || key;
}

function updateLanguage() {
    document.documentElement.lang = currentLang;
    // data-i18n属性を持つ要素を更新
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.innerText = t(key);
    });
    // placeholderを更新
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });
    // ボタンのテキスト更新 (EN <-> JP)
    document.getElementById('lang-btn').innerText = (currentLang === 'ja') ? 'EN' : 'JP';

    // 履歴などの動的コンテンツがあれば再描画
    if (document.getElementById('history-screen').classList.contains('active')) {
        showHistory();
    }
}

function toggleLanguage() {
    currentLang = (currentLang === 'ja') ? 'en' : 'ja';
    localStorage.setItem('qr_lang', currentLang);
    updateLanguage();
}

// 設定管理
const settings = JSON.parse(localStorage.getItem('qr_settings') || '{"sound":true,"vibrate":true}');

// --- 設定保存・読込 ---
function loadSettings() {
    document.getElementById('set-sound').checked = settings.sound;
    document.getElementById('set-vibrate').checked = settings.vibrate;
    updateLanguage(); // 言語設定の適用
}

function saveSettings() {
    settings.sound = document.getElementById('set-sound').checked;
    settings.vibrate = document.getElementById('set-vibrate').checked;
    localStorage.setItem('qr_settings', JSON.stringify(settings));
}

// --- フィードバック（音・振動） ---
function playFeedback() {
    if (settings.vibrate && navigator.vibrate) try { navigator.vibrate(200); } catch (e) { }
    if (settings.sound) {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(); osc.stop(ctx.currentTime + 0.2);
        } catch (e) { }
    }
}

// --- カメラ制御 ---
async function startScanner() {
    if (isCameraStarting) return;
    isCameraStarting = true;
    try {
        codeReader.reset();
        const devices = await codeReader.listVideoInputDevices();
        const backCamera = devices.find(d =>
            d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment')
        ) || devices[0];

        await codeReader.decodeFromVideoDevice(backCamera.deviceId, videoElement, (result) => {
            if (result) { playFeedback(); showResult(result.getText()); }
        });

        const stream = videoElement.srcObject;
        if (stream) {
            activeVideoTrack = stream.getVideoTracks()[0];
            setTimeout(setupZoomControl, 800);
        }
    } catch (err) { console.error(err); }
    finally { isCameraStarting = false; }
}

function setupZoomControl() {
    if (!activeVideoTrack || activeVideoTrack.readyState !== 'live') return;
    try {
        const caps = activeVideoTrack.getCapabilities ? activeVideoTrack.getCapabilities() : null;
        if (caps && 'zoom' in caps) {
            zoomSlider.min = caps.zoom.min; zoomSlider.max = caps.zoom.max;
            zoomSlider.step = caps.zoom.step || 0.1;
            zoomSlider.value = activeVideoTrack.getSettings().zoom || 1;
            zoomSliderContainer.style.display = 'flex';
            zoomSlider.oninput = () => {
                activeVideoTrack.applyConstraints({ advanced: [{ zoom: parseFloat(zoomSlider.value) }] });
            };
        }
    } catch (e) { }
}

function toggleTorch() {
    if (!activeVideoTrack) return;
    isTorchOn = !isTorchOn;
    activeVideoTrack.applyConstraints({ advanced: [{ torch: isTorchOn }] })
        .then(() => { torchBtn.style.background = isTorchOn ? "#ff9800" : "rgba(0,0,0,0.6)"; })
        .catch(() => { isTorchOn = !isTorchOn; });
}

// --- 画像ファイル読込 (強化版) ---
async function readImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    codeReader.reset();

    const reader = new FileReader();
    reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
            const hints = new Map();
            hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
            hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.QR_CODE]);

            // 試行プロセス：[通常] -> [コントラスト] -> [反転] -> [2倍拡大] -> [2値化]
            const strategies = [
                { name: 'Normal', filter: null },
                { name: 'Contrast', filter: 'grayscale(100%) contrast(200%)' },
                { name: 'Invert', filter: 'invert(100%)' },
                { name: 'Scale2x', scale: 2.0 },
                { name: 'Binarize', binarize: true }
            ];

            let success = false;
            for (const strategy of strategies) {
                try {
                    let source = img;

                    // 加工が必要な場合はCanvasを使用
                    if (strategy.filter || strategy.scale || strategy.binarize) {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const scale = strategy.scale || 1.0;
                        canvas.width = img.width * scale;
                        canvas.height = img.height * scale;

                        // フィルター適用
                        if (strategy.filter) ctx.filter = strategy.filter;
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                        // 簡易2値化処理
                        if (strategy.binarize) {
                            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            const data = imageData.data;
                            for (let i = 0; i < data.length; i += 4) {
                                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                                const val = avg > 128 ? 255 : 0;
                                data[i] = data[i + 1] = data[i + 2] = val;
                            }
                            ctx.putImageData(imageData, 0, 0);
                        }
                        source = canvas;
                    }

                    console.log(`Trying decode strategy: ${strategy.name}`);
                    const result = await codeReader.decodeFromImageElement(source, hints);
                    if (result) {
                        showResult(result.getText());
                        success = true;
                        break; // 成功したら終了
                    }
                } catch (err) {
                    // この戦略では失敗、次へ
                }
            }

            if (!success) {
                alert(t('qr_not_found_alert'));
                startScanner();
            }
            event.target.value = ''; // 入力リセット
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// --- 結果表示・フォーマット判別 ---
function showResult(data) {
    saveToHistory(data);
    resultText.value = data;

    specialArea.style.display = 'none';
    specialArea.innerHTML = "";
    openUrlBtn.style.display = 'none';

    if (data.startsWith('http')) {
        openUrlBtn.style.display = 'block';
    } else if (data.startsWith('WIFI:')) {
        parseWifi(data);
    } else if (data.includes('BEGIN:VCARD')) {
        parseVCard(data);
    }
    switchScreen('result-screen');
}

function parseWifi(data) {
    const ssidMatch = data.match(/S:([^;]+);/);
    const passMatch = data.match(/P:([^;]+);/);
    const ssid = ssidMatch ? ssidMatch[1] : t('unknown');
    const pass = passMatch ? passMatch[1] : "";
    specialArea.style.display = 'block';
    specialArea.innerHTML = `
        <h3>${t('wifi_info_title')}</h3>
        <div class="special-info">SSID: <b>${ssid}</b><br>${t('wifi_pass_label')}: <b>${pass || t('wifi_pass_none')}</b></div>
        <button class="btn-green" onclick="copyText('${pass}')">${t('copy_password')}</button>
    `;
}

function parseVCard(data) {
    const nameMatch = data.match(/FN:([^\n\r]+)/);
    const telMatch = data.match(/TEL:([^\n\r]+)/);
    const name = nameMatch ? nameMatch[1] : t('unknown');
    const tel = telMatch ? telMatch[1] : "";
    specialArea.style.display = 'block';
    specialArea.innerHTML = `
        <h3>${t('contact_info_title')}</h3>
        <div class="special-info">${t('contact_name')}: <b>${name}</b><br>${t('contact_tel')}: <b>${tel}</b></div>
        <button class="btn-blue" onclick="downloadVCard('${data.replace(/\n/g, '\\n')}')">${t('save_contact')}</button>
    `;
}

function downloadVCard(vcardData) {
    const blob = new Blob([vcardData.replace(/\\n/g, '\n')], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'contact.vcf'; a.click();
    URL.revokeObjectURL(url);
}

// --- 画面遷移 ---
function switchScreen(screenId) {
    if (isTorchOn) toggleTorch();
    codeReader.reset();
    activeVideoTrack = null;
    zoomSliderContainer.style.display = 'none';
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    if (screenId === 'scanner-screen') setTimeout(startScanner, 100);
    // 履歴画面を開くときは内容を更新（言語変更反映のため）
    if (screenId === 'history-screen') showHistory();
}

function restartScanner() { switchScreen('scanner-screen'); }

// --- 履歴管理 ---
function saveToHistory(data) {
    let history = JSON.parse(localStorage.getItem('qr_history') || '[]');
    history.unshift({ id: Date.now(), data: data, date: new Date().toLocaleString() });
    localStorage.setItem('qr_history', JSON.stringify(history.slice(0, 100)));
}

function showHistory() {
    const list = document.getElementById('history-list');
    const history = JSON.parse(localStorage.getItem('qr_history') || '[]');
    list.innerHTML = history.length ? '' : `<p style="text-align:center;">${t('no_history')}</p>`;
    history.forEach(item => {
        const isUrl = item.data.startsWith('http');
        const div = document.createElement('div');
        div.className = 'list-item history-item';
        div.innerHTML = `
            <div style="font-size:0.7rem; color:#888;">${item.date}</div>
            <div class="history-data">${item.data}</div>
            <div class="btn-row">
                <button class="btn-green" onclick="copyText('${item.data.replace(/'/g, "\\'")}')">${t('copy')}</button>
                ${isUrl ? `<button class="btn-blue" onclick="window.open('${item.data}', '_blank')">${t('open')}</button>` : ''}
                <button class="btn-red" onclick="deleteHistoryItem(${item.id})">${t('delete')}</button>
            </div>`;
        list.appendChild(div);
    });
    // screen切り替えはswitchScreenで行うのでここではDOM更新のみが望ましいが、既存コードに合わせる
    // switchScreenから呼ばれる場合もあるため、無限ループ防止が必要だが、
    // ここでは単純に画面遷移ロジックは呼び出し元に任せるか、DOM更新だけにする。
    // 元のコードでは switchScreen('history-screen') を呼んでいたが、今回は呼出し元で制御している箇所もある。
    // ただしボタンから呼ばれる場合は遷移必要。
    if (!document.getElementById('history-screen').classList.contains('active')) {
        switchScreen('history-screen');
    }
}

function deleteHistoryItem(id) {
    let history = JSON.parse(localStorage.getItem('qr_history') || '[]');
    localStorage.setItem('qr_history', JSON.stringify(history.filter(i => i.id !== id)));
    showHistory();
}

function clearAllHistory() { if (confirm(t('confirm_delete_all'))) { localStorage.removeItem('qr_history'); showHistory(); } }

// --- 作成機能 ---
function updateGeneratorUI() {
    const type = document.getElementById('qr-type-select').value;
    document.getElementById('input-url').style.display = (type === 'url') ? 'block' : 'none';
    document.getElementById('input-wifi').style.display = (type === 'wifi') ? 'block' : 'none';
    document.getElementById('input-vcard').style.display = (type === 'vcard') ? 'block' : 'none';
    document.getElementById('qrcode-output').innerHTML = "";
    document.getElementById('save-qr-btn').style.display = 'none';
}

function generateQR() {
    const type = document.getElementById('qr-type-select').value;
    let val = "";
    if (type === 'url') val = document.getElementById('qr-input-url').value;
    else if (type === 'wifi') {
        val = `WIFI:S:${document.getElementById('wifi-ssid').value};T:${document.getElementById('wifi-type').value};P:${document.getElementById('wifi-pass').value};;`;
    } else if (type === 'vcard') {
        val = `BEGIN:VCARD\nVERSION:3.0\nFN:${document.getElementById('vc-name').value}\nTEL:${document.getElementById('vc-tel').value}\nEMAIL:${document.getElementById('vc-email').value}\nEND:VCARD`;
    }

    if (!val || val === "https://") { alert(t('input_content')); return; }

    const output = document.getElementById('qrcode-output');
    const saveBtn = document.getElementById('save-qr-btn');
    output.innerHTML = "";
    saveBtn.style.display = 'none';

    new QRCode(output, { text: val, width: 256, height: 256 });

    // 生成を待機してボタンを表示（モバイル対応強化）
    let attempts = 0;
    const checkInterval = setInterval(() => {
        const img = output.querySelector('img');
        const canvas = output.querySelector('canvas');
        const hasContent = output.children.length > 0;

        // より寛容な判定
        if ((img && (img.src || img.complete)) || canvas || (hasContent && attempts > 5)) {
            saveBtn.style.display = 'block';
            clearInterval(checkInterval);
        }
        if (++attempts > 30) {
            if (hasContent) saveBtn.style.display = 'block';
            clearInterval(checkInterval);
        }
    }, 100);
}

function downloadQRImage() {
    const output = document.getElementById('qrcode-output');
    const img = output.querySelector('img');
    const canvas = output.querySelector('canvas');

    // 元のQRコード画像を取得
    let sourceImage = null;
    if (img && img.src) {
        sourceImage = img;
    } else if (canvas) {
        sourceImage = canvas;
    }

    if (!sourceImage) {
        alert(t('image_not_found'));
        return;
    }

    // 白枠付きの新しいcanvasを作成
    const padding = 20; // 白枠のサイズ
    const newCanvas = document.createElement('canvas');
    const ctx = newCanvas.getContext('2d');

    // QRコードのサイズを取得
    const qrWidth = sourceImage.width || 256;
    const qrHeight = sourceImage.height || 256;

    // 白枠を含めたキャンバスサイズ
    newCanvas.width = qrWidth + (padding * 2);
    newCanvas.height = qrHeight + (padding * 2);

    // 白背景を塗りつぶし
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);

    // QRコードを中央に描画
    if (sourceImage.tagName === 'CANVAS') {
        ctx.drawImage(sourceImage, padding, padding);
    } else {
        // imgの場合は読み込み完了を待つ
        const tempImg = new Image();
        tempImg.onload = () => {
            ctx.drawImage(tempImg, padding, padding, qrWidth, qrHeight);
            downloadFromCanvas(newCanvas);
        };
        tempImg.src = sourceImage.src;
        return; // onloadでダウンロード処理
    }

    downloadFromCanvas(newCanvas);
}

function downloadFromCanvas(canvas) {
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'qrcode.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// --- ユーティリティ ---
function copyText(text) { navigator.clipboard.writeText(text); alert(t('copied')); }
function copyResult() { copyText(resultText.value); }
function openURL() { window.open(resultText.value, '_blank'); }

// PWA インストール
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredPrompt = e;
    document.getElementById('install-area').style.display = 'block';
});
document.getElementById('install-button').onclick = async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        document.getElementById('install-area').style.display = 'none';
    }
};

window.onload = () => { loadSettings(); startScanner(); };
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
