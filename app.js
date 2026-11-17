(function() {
    const SUPABASE_URL = 'https://azivkmabyjtyzkrjhwxg.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_Goz2iCXq20ySsctUBX1MWg_5ZpD7eVQ';
    const PAY_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/yookassa-pay`;
    const MODERATE_PUBLISH_URL = `${SUPABASE_URL}/functions/v1/moderate-publish`;
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Генерация постоянного анонимного ника для вкладки
    let savedAnonName = sessionStorage.getItem('tsar_anon_name');
    if (!savedAnonName) {
        const randomNum = Math.floor(100 + Math.random() * 900);
        savedAnonName = `Аноним #${randomNum}`;
        sessionStorage.setItem('tsar_anon_name', savedAnonName);
    }

    const state = {
        anonName: savedAnonName,
        soundEnabled: localStorage.getItem('tsar_sound_enabled') !== 'false',
        lastKnownKingId: null,
        initialSyncDone: false,

        paymentsEnabled: true,
        maintenanceMode: false,
        chatEnabled: true,

        currentPrice: 1,
        selectedPrice: 1,

        orderToken: null,
        bookingData: null,
        isMyTurnDrawing: false,
        isPracticeMode: false,
        practiceDraftDataUrl: null,
        someoneElseDrawing: false,
        lockedByName: '',
        lockedSecondsLeft: 0,
        lockedInterval: null,

        drawingSecondsLeft: 1200,
        drawingInterval: null,

        immunitySecondsLeft: 0,
        immunityInterval: null,

        currentKing: null,
        history: [],
        chatMessages: [],
        currentlyViewedArt: null,
        likedIds: JSON.parse(localStorage.getItem('tsar_liked_ids') || '[]'),

        brushColor: '#0f172a',
        brushSize: 8,
        tool: 'brush',
        isDrawing: false,
        undoStack: [],

        stamp: {
            active: false,
            img: null,
            x: 480,
            y: 320,
            scale: 0.5,
            rotation: 0,
            isDragging: false,
            dragOffsetX: 0,
            dragOffsetY: 0
        }
    };

    const maintenanceOverlay = document.getElementById('maintenanceOverlay');
    const maintenanceText = document.getElementById('maintenanceText');

    const canvasWrapper = document.getElementById('canvasWrapper');
    const canvas = document.getElementById('mainCanvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const stampOverlayCanvas = document.getElementById('stampOverlayCanvas');
    const stampCtx = stampOverlayCanvas.getContext('2d');
    const newKingToast = document.getElementById('newKingToast');
    const newKingToastText = document.getElementById('newKingToastText');

    const myAnonBadge = document.getElementById('myAnonBadge');
    const chatMessagesList = document.getElementById('chatMessagesList');
    const emptyChatText = document.getElementById('emptyChatText');
    const chatForm = document.getElementById('chatForm');
    const chatMessageInput = document.getElementById('chatMessageInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const toggleEmojiBtn = document.getElementById('toggleEmojiBtn');
    const emojiPickerPopup = document.getElementById('emojiPickerPopup');
    const emojiBtns = document.querySelectorAll('.emoji-btn');

    const customBrushDot = document.getElementById('customBrushDot');
    const emptyCanvasOverlay = document.getElementById('emptyCanvasOverlay');
    const lockedCanvasOverlay = document.getElementById('lockedCanvasOverlay');
    const lockedByNameEl = document.getElementById('lockedByName');
    const lockedTimerText = document.getElementById('lockedTimerText');
    const canvasShieldBadge = document.getElementById('canvasShieldBadge');

    const statOnlineEl = document.getElementById('statOnline');
    const headerCurrentPrice = document.getElementById('headerCurrentPrice');
    const kingBanner = document.getElementById('kingBanner');
    const kingRoleLabel = document.getElementById('kingRoleLabel');
    const kingName = document.getElementById('kingName');
    const kingPriceBadge = document.getElementById('kingPriceBadge');
    const kingSocialWrapper = document.getElementById('kingSocialWrapper');
    const kingSocialLink = document.getElementById('kingSocialLink');
    const kingSocialText = document.getElementById('kingSocialText');
    const kingWebsiteLink = document.getElementById('kingWebsiteLink');
    const kingWebsiteText = document.getElementById('kingWebsiteText');
    const kingAvatarDefault = document.getElementById('kingAvatarDefault');
    const kingAvatarImg = document.getElementById('kingAvatarImg');
    const kingInfoContainer = document.getElementById('kingInfoContainer');
    const kingRightStats = document.getElementById('kingRightStats');
    const kingReignTimer = document.getElementById('kingReignTimer');

    const practiceModeBanner = document.getElementById('practiceModeBanner');
    const exitPracticeTopBtn = document.getElementById('exitPracticeTopBtn');
    const livePublishActions = document.getElementById('livePublishActions');
    const practiceToolbarActions = document.getElementById('practiceToolbarActions');
    const exitPracticeToolbarBtn = document.getElementById('exitPracticeToolbarBtn');
    const upgradePracticeToLiveBtn = document.getElementById('upgradePracticeToLiveBtn');
    const upgradePracticeToLiveBtnText = document.getElementById('upgradePracticeToLiveBtnText');
    const startPracticeModeBtn = document.getElementById('startPracticeModeBtn');

    const drawingToolbar = document.getElementById('drawingToolbar');
    const viewModeControls = document.getElementById('viewModeControls');
    const startDrawBookingBtn = document.getElementById('startDrawBookingBtn');

    const colorSwatches = document.querySelectorAll('.color-swatch');
    const customColorPicker = document.getElementById('customColorPicker');
    const brushSizeSlider = document.getElementById('brushSizeSlider');
    const brushSizeLabel = document.getElementById('brushSizeLabel');
    const toolBrushBtn = document.getElementById('toolBrushBtn');
    const toolFillBtn = document.getElementById('toolFillBtn');
    const toolPipetteBtn = document.getElementById('toolPipetteBtn');
    const toolTextBtn = document.getElementById('toolTextBtn');
    const toolEraserBtn = document.getElementById('toolEraserBtn');

    const textToolModal = document.getElementById('textToolModal');
    const closeTextToolModalBtn = document.getElementById('closeTextToolModalBtn');
    const cancelTextToolBtn = document.getElementById('cancelTextToolBtn');
    const canvasTextInput = document.getElementById('canvasTextInput');
    const canvasTextFontSelect = document.getElementById('canvasTextFontSelect');
    const canvasTextStrokeSelect = document.getElementById('canvasTextStrokeSelect');
    const canvasTextColorPicker = document.getElementById('canvasTextColorPicker');
    const createTextStampBtn = document.getElementById('createTextStampBtn');
    const undoBtn = document.getElementById('undoBtn');
    const insertImageInput = document.getElementById('insertImageInput');
    const chooseBaseArtBtn = document.getElementById('chooseBaseArtBtn');
    const clearCanvasBtn = document.getElementById('clearCanvasBtn');
    const openConfirmPublishModalBtn = document.getElementById('openConfirmPublishModalBtn');

    const stampControlPanel = document.getElementById('stampControlPanel');
    const stampScaleSlider = document.getElementById('stampScaleSlider');
    const stampScaleLabel = document.getElementById('stampScaleLabel');
    const stampRotateSlider = document.getElementById('stampRotateSlider');
    const stampRotateLabel = document.getElementById('stampRotateLabel');
    const cancelStampBtn = document.getElementById('cancelStampBtn');
    const applyStampBtn = document.getElementById('applyStampBtn');

    const welcomeModal = document.getElementById('welcomeModal');
    const closeWelcomeModalBtn = document.getElementById('closeWelcomeModalBtn');

    const unlockWarningModal = document.getElementById('unlockWarningModal');
    const openRulesFromWarningBtn = document.getElementById('openRulesFromWarningBtn');
    const closeUnlockWarningBtn = document.getElementById('closeUnlockWarningBtn');

    const rulesModal = document.getElementById('rulesModal');
    const openRulesBtn = document.getElementById('openRulesBtn');
    const closeRulesModalBtn = document.getElementById('closeRulesModalBtn');
    const confirmRulesBtn = document.getElementById('confirmRulesBtn');

    const infoModal = document.getElementById('infoModal');
    const openInfoBtn = document.getElementById('openInfoBtn');
    const closeInfoModalBtn = document.getElementById('closeInfoModalBtn');
    const confirmInfoBtn = document.getElementById('confirmInfoBtn');

    const offerModal = document.getElementById('offerModal');
    const openOfferBtn = document.getElementById('openOfferBtn');
    const closeOfferModalBtn = document.getElementById('closeOfferModalBtn');
    const confirmOfferBtn = document.getElementById('confirmOfferBtn');

    const privacyModal = document.getElementById('privacyModal');
    const openPrivacyBtn = document.getElementById('openPrivacyBtn');
    const closePrivacyModalBtn = document.getElementById('closePrivacyModalBtn');
    const confirmPrivacyBtn = document.getElementById('confirmPrivacyBtn');

    const bookingModal = document.getElementById('bookingModal');
    const closeBookingModalBtn = document.getElementById('closeBookingModalBtn');
    const bookingForm = document.getElementById('bookingForm');
    const authorNameInput = document.getElementById('authorNameInput');
    const authorSocialInput = document.getElementById('authorSocialInput');
    const authorWebsiteInput = document.getElementById('authorWebsiteInput');
    const authorAvatarInput = document.getElementById('authorAvatarInput');
    const bookingAvatarPreview = document.getElementById('bookingAvatarPreview');
    const priceFixedDisplay = document.getElementById('priceFixedDisplay');
    const submitBookingBtnText = document.getElementById('submitBookingBtnText');
    const submitBookingBtn = document.getElementById('submitBookingBtn');

    const confirmPublishModal = document.getElementById('confirmPublishModal');
    const cancelConfirmPublishBtn = document.getElementById('cancelConfirmPublishBtn');
    const finalPublishBtn = document.getElementById('finalPublishBtn');

    const viewArtModal = document.getElementById('viewArtModal');
    const closeViewArtModalBtn = document.getElementById('closeViewArtModalBtn');
    const viewArtAvatar = document.getElementById('viewArtAvatar');
    const viewArtAuthorName = document.getElementById('viewArtAuthorName');
    const viewArtAuthorLink = document.getElementById('viewArtAuthorLink');
    const viewArtAuthorLinkText = document.getElementById('viewArtAuthorLinkText');
    const viewArtWebsiteLink = document.getElementById('viewArtWebsiteLink');
    const viewArtWebsiteLinkText = document.getElementById('viewArtWebsiteLinkText');
    const viewArtPrice = document.getElementById('viewArtPrice');
    const viewArtTime = document.getElementById('viewArtTime');
    const viewArtImage = document.getElementById('viewArtImage');
    const viewArtAiCommentBox = document.getElementById('viewArtAiCommentBox');
    const viewArtAiCommentText = document.getElementById('viewArtAiCommentText');
    const likeArtBtn = document.getElementById('likeArtBtn');
    const likeArtIcon = document.getElementById('likeArtIcon');
    const likeArtCount = document.getElementById('likeArtCount');

    const chooseBaseModal = document.getElementById('chooseBaseModal');
    const closeChooseBaseModalBtn = document.getElementById('closeChooseBaseModalBtn');
    const baseArtGrid = document.getElementById('baseArtGrid');

    const historyList = document.getElementById('historyList');
    const historyCountBadge = document.getElementById('historyCountBadge');
    const emptyHistoryText = document.getElementById('emptyHistoryText');

    let uploadedAvatarBase64 = null;
    myAnonBadge.textContent = state.anonName;

    // Показываем приветственное окно один раз при первом визите
    if (!localStorage.getItem('tsar_welcome_seen')) {
        welcomeModal.classList.remove('hidden');
    }
    closeWelcomeModalBtn.addEventListener('click', () => {
        localStorage.setItem('tsar_welcome_seen', '1');
        welcomeModal.classList.add('hidden');
        unlockAudio();
    });

    // Обработчики модального окна-предупреждения при разблокировке холста
    openRulesFromWarningBtn.addEventListener('click', () => {
        rulesModal.classList.remove('hidden');
    });
    closeUnlockWarningBtn.addEventListener('click', () => {
        unlockWarningModal.classList.add('hidden');
    });

    function normalizeWebsiteData(rawUrl) {
        if (!rawUrl) return null;
        let clean = String(rawUrl).trim();
        if (!clean) return null;
        if (/^(javascript|data|vbscript|file):/i.test(clean)) return null;

        let fullUrl = clean;
        if (!/^https?:\/\//i.test(fullUrl)) {
            fullUrl = 'https://' + fullUrl;
        }

        try {
            const parsed = new URL(fullUrl);
            if (!parsed.hostname || !parsed.hostname.includes('.')) return null;
            const displayHost = parsed.hostname.replace(/^www\./i, '') + (parsed.pathname !== '/' ? parsed.pathname.replace(/\/$/, '') : '');
            return {
                display: displayHost,
                url: parsed.href
            };
        } catch (e) {
            return null;
        }
    }

    function normalizeInstaNick(rawInput) {
        if (!rawInput) return null;
        let clean = String(rawInput).trim();
        clean = clean
            .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
            .replace(/^@+/, '')
            .split(/[/?#]/)[0]
            .trim();

        if (!clean) return null;
        return {
            display: `@${clean}`,
            url: `https://www.instagram.com/${encodeURIComponent(clean)}/`
        };
    }

    function parseAuthorLinks(rawStored) {
        if (!rawStored) return { insta: null, site: null };
        const parts = String(rawStored).split('|').map(p => p.trim()).filter(Boolean);
        let insta = null;
        let site = null;

        for (const part of parts) {
            if (/^https?:\/\//i.test(part) && !/instagram\.com\//i.test(part)) {
                if (!site) site = normalizeWebsiteData(part);
            } else if (part.startsWith('@') || /instagram\.com\//i.test(part)) {
                if (!insta) insta = normalizeInstaNick(part);
            } else if (part.includes('.')) {
                if (!site) site = normalizeWebsiteData(part);
            } else {
                if (!insta) insta = normalizeInstaNick(part);
            }
        }
        return { insta, site };
    }

    // ================= КОНФЕТТИ ПРИ ПУБЛИКАЦИИ =================
    function unlockAudio() {}
    function playFanfareSound() {}

    function triggerNewKingCelebration(king) {
        playFanfareSound();

        if (typeof confetti === 'function') {
            confetti({
                particleCount: 75,
                angle: 60,
                spread: 65,
                origin: { x: 0.15, y: 0.65 }
            });
            confetti({
                particleCount: 75,
                angle: 120,
                spread: 65,
                origin: { x: 0.85, y: 0.65 }
            });
        }

        canvasWrapper.classList.add('ring-4', 'ring-amber-400', 'shadow-2xl');
        newKingToastText.textContent = king.aiComment 
            ? `${king.name} занял трон за ${king.price} ₽! 🤖 ИИ: «${king.aiComment}»`
            : `${king.name} занял трон за ${king.price} ₽!`;
        newKingToast.classList.remove('hidden');

        setTimeout(() => {
            canvasWrapper.classList.remove('ring-4', 'ring-amber-400', 'shadow-2xl');
            newKingToast.classList.add('hidden');
        }, 6500);
    }
    // =================================================================

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ================= ЖИВОЙ ЧАТ И СМАЙЛЫ =================
    toggleEmojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        emojiPickerPopup.classList.toggle('hidden');
    });

    emojiBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const emoji = btn.textContent;
            if (chatMessageInput.value.length + emoji.length <= 160) {
                chatMessageInput.value += emoji;
            }
            chatMessageInput.focus();
        });
    });

    document.addEventListener('click', (e) => {
        if (!emojiPickerPopup.contains(e.target) && e.target !== toggleEmojiBtn) {
            emojiPickerPopup.classList.add('hidden');
        }
    });

    function renderChat() {
        chatMessagesList.innerHTML = '';

        if (state.chatMessages.length === 0) {
            emptyChatText.classList.remove('hidden');
            chatMessagesList.appendChild(emptyChatText);
            return;
        }
        emptyChatText.classList.add('hidden');

        const activeKingName = state.currentKing ? state.currentKing.name : null;

        state.chatMessages.forEach(msg => {
            const isCurrentActiveKing = Boolean(activeKingName && msg.sender_name === activeKingName);
            const isMe = msg.sender_name === state.anonName || (state.isMyTurnDrawing && msg.sender_name === state.bookingData?.name);

            const row = document.createElement('div');
            row.className = `p-2 rounded-xl border ${
                isCurrentActiveKing 
                    ? 'bg-amber-50/80 border-amber-300' 
                    : isMe 
                        ? 'bg-indigo-50/60 border-indigo-100' 
                        : 'bg-slate-50 border-slate-100'
            }`;

            const date = new Date(msg.created_at);
            const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            const crownHtml = isCurrentActiveKing ? '<span title="Текущий Царь Холста">👑 </span>' : '';
            const nameColor = isCurrentActiveKing ? 'text-amber-700' : isMe ? 'text-indigo-700' : 'text-slate-700';

            row.innerHTML = `
                <div class="flex items-center justify-between gap-1 mb-0.5">
                    <span class="font-bold text-[11px] ${nameColor} truncate">${crownHtml}${escapeHtml(msg.sender_name)}</span>
                    <span class="text-[10px] text-slate-400 shrink-0">${timeStr}</span>
                </div>
                <p class="text-slate-800 break-words leading-snug">${escapeHtml(msg.message)}</p>
            `;
            chatMessagesList.appendChild(row);
        });

        chatMessagesList.scrollTop = chatMessagesList.scrollHeight;
    }

    async function loadChatMessages() {
        const { data, error } = await supabaseClient
            .from('canvas_chat')
            .select('id, sender_name, message, is_king, created_at')
            .order('created_at', { ascending: false })
            .limit(50);

        if (!error && data) {
            state.chatMessages = data.reverse();
            renderChat();
        }
    }

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = chatMessageInput.value.trim();
        if (!text) return;

        emojiPickerPopup.classList.add('hidden');
        sendChatBtn.disabled = true;

        const senderDisplay = state.isMyTurnDrawing && state.bookingData?.name
            ? state.bookingData.name
            : state.anonName;

        const { data, error } = await supabaseClient.rpc('send_chat_message', {
            p_sender_name: senderDisplay,
            p_message: text,
            p_is_king: false
        });

        sendChatBtn.disabled = false;

        if (error || !data || !data.ok) {
            alert(data?.error || error?.message || 'Не удалось отправить сообщение');
            return;
        }

        chatMessageInput.value = '';
        await loadChatMessages();
    });
    // ========================================================

    function fitKingNameSize() {
        if (!kingName || !kingInfoContainer) return;
        const availableWidth = kingInfoContainer.clientWidth;
        if (availableWidth <= 0) return;

        kingName.style.transform = '';
        kingName.style.letterSpacing = '';
        kingName.style.display = 'inline-block';
        kingName.style.width = 'auto';

        const maxFont = window.innerWidth < 640 ? 22 : 34;
        const minFont = 14;
        let currentFont = maxFont;
        kingName.style.fontSize = `${currentFont}px`;

        while (kingName.scrollWidth > availableWidth && currentFont > minFont) {
            currentFont -= 1;
            kingName.style.fontSize = `${currentFont}px`;
        }
    }
    window.addEventListener('resize', fitKingNameSize);

    let kingReignInterval = null;

    function formatReignDuration(totalSec) {
        const sec = Math.max(0, Math.floor(totalSec));
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        if (h > 0) {
            return `${h}:${m}:${s}`;
        }
        return `${m}:${s}`;
    }

    function updateKingReignUI(king) {
        if (!kingRightStats) return;
        if (!king) {
            kingRightStats.classList.add('hidden');
            if (kingReignInterval) clearInterval(kingReignInterval);
            return;
        }

        kingRightStats.classList.remove('hidden');

        if (kingReignInterval) clearInterval(kingReignInterval);
        const startMs = new Date(king.createdAt).getTime();

        function tickReign() {
            const diffSec = (Date.now() - startMs) / 1000;
            if (kingReignTimer) {
                kingReignTimer.textContent = formatReignDuration(diffSec);
            }
        }
        tickReign();
        kingReignInterval = setInterval(tickReign, 1000);
    }

    function formatTime(sec) {
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    function fillCanvasWhite() {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function saveUndoState() {
        if (state.undoStack.length >= 25) state.undoStack.shift();
        state.undoStack.push(canvas.toDataURL('image/png'));
    }

    function drawImageFromDataUrl(dataUrl, callback) {
        const img = new Image();
        img.onload = () => {
            fillCanvasWhite();
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            if (callback) callback();
        };
        img.src = dataUrl;
    }

    fillCanvasWhite();

    function checkAnyModalOpen() {
        return !welcomeModal.classList.contains('hidden') ||
               !unlockWarningModal.classList.contains('hidden') ||
               !rulesModal.classList.contains('hidden') ||
               !infoModal.classList.contains('hidden') ||
               !offerModal.classList.contains('hidden') ||
               !privacyModal.classList.contains('hidden') ||
               !bookingModal.classList.contains('hidden') ||
               !confirmPublishModal.classList.contains('hidden') ||
               !viewArtModal.classList.contains('hidden') ||
               !chooseBaseModal.classList.contains('hidden') ||
               (textToolModal && !textToolModal.classList.contains('hidden'));
    }

    function updateBrushDot(e) {
        if ((!state.isMyTurnDrawing && !state.isPracticeMode) || state.stamp.active || checkAnyModalOpen() || state.tool === 'fill' || state.tool === 'pipette') {
            customBrushDot.style.display = 'none';
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX;
        const clientY = e.clientY;

        if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
            customBrushDot.style.display = 'none';
            return;
        }

        const visualScale = rect.width / canvas.width;
        const visualSize = Math.max(state.brushSize * visualScale, 3);

        customBrushDot.style.width = `${visualSize}px`;
        customBrushDot.style.height = `${visualSize}px`;
        customBrushDot.style.left = `${clientX}px`;
        customBrushDot.style.top = `${clientY}px`;
        customBrushDot.style.backgroundColor = state.tool === 'eraser' ? '#ffffff' : state.brushColor;
        customBrushDot.style.display = 'block';
    }

    window.addEventListener('mousemove', updateBrushDot);
    window.addEventListener('scroll', () => { customBrushDot.style.display = 'none'; });

    function getCanvasCoords(e, targetCanvas = canvas) {
        const rect = targetCanvas.getBoundingClientRect();
        const scaleX = targetCanvas.width / rect.width;
        const scaleY = targetCanvas.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    }

    function hexToRgb(hex) {
        const cleanHex = hex.replace('#', '');
        const bigint = parseInt(cleanHex, 16);
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255
        };
    }

    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    function floodFill(startX, startY, fillHexColor) {
        const x = Math.floor(startX);
        const y = Math.floor(startY);
        const width = canvas.width;
        const height = canvas.height;

        if (x < 0 || x >= width || y < 0 || y >= height) return;

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        const startIdx = (y * width + x) * 4;
        const startR = data[startIdx];
        const startG = data[startIdx + 1];
        const startB = data[startIdx + 2];

        const fillRgb = hexToRgb(fillHexColor);

        if (Math.abs(startR - fillRgb.r) < 5 &&
            Math.abs(startG - fillRgb.g) < 5 &&
            Math.abs(startB - fillRgb.b) < 5) {
            return;
        }

        const tolerance = 35;
        const visited = new Uint8Array(width * height);
        const stack = [[x, y]];

        while (stack.length > 0) {
            const [cx, cy] = stack.pop();
            const pos = cy * width + cx;
            if (visited[pos]) continue;

            const idx = pos * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            if (Math.abs(r - startR) <= tolerance &&
                Math.abs(g - startG) <= tolerance &&
                Math.abs(b - startB) <= tolerance) {
                
                visited[pos] = 1;
                data[idx] = fillRgb.r;
                data[idx + 1] = fillRgb.g;
                data[idx + 2] = fillRgb.b;
                data[idx + 3] = 255;

                if (cx > 0) stack.push([cx - 1, cy]);
                if (cx < width - 1) stack.push([cx + 1, cy]);
                if (cy > 0) stack.push([cx, cy - 1]);
                if (cy < height - 1) stack.push([cx, cy + 1]);
            }
        }

        ctx.putImageData(imgData, 0, 0);
        saveUndoState();
    }

    function pickColorAt(x, y) {
        const px = Math.max(0, Math.min(canvas.width - 1, Math.floor(x)));
        const py = Math.max(0, Math.min(canvas.height - 1, Math.floor(y)));
        const pixel = ctx.getImageData(px, py, 1, 1).data;
        const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);

        state.brushColor = hex;
        customColorPicker.value = hex;
        colorSwatches.forEach(b => {
            b.classList.remove('border-white', 'ring-2', 'ring-indigo-500');
            b.classList.add('border-transparent');
        });
        setActiveTool('brush');
    }

    function startStroke(e) {
        if ((!state.isMyTurnDrawing && !state.isPracticeMode) || state.stamp.active) return;
        e.preventDefault();
        const pos = getCanvasCoords(e);

        if (state.tool === 'pipette') {
            pickColorAt(pos.x, pos.y);
            return;
        }

        if (state.tool === 'fill') {
            floodFill(pos.x, pos.y, state.brushColor);
            return;
        }

        state.isDrawing = true;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = state.brushSize;
        ctx.strokeStyle = state.tool === 'eraser' ? '#ffffff' : state.brushColor;
        ctx.lineTo(pos.x + 0.1, pos.y + 0.1);
        ctx.stroke();
    }

    function moveStroke(e) {
        if ((!state.isMyTurnDrawing && !state.isPracticeMode) || !state.isDrawing || state.stamp.active) return;
        e.preventDefault();
        const pos = getCanvasCoords(e);
        ctx.lineWidth = state.brushSize;
        ctx.strokeStyle = state.tool === 'eraser' ? '#ffffff' : state.brushColor;
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    }

    function endStroke(e) {
        if ((!state.isMyTurnDrawing && !state.isPracticeMode) || !state.isDrawing) return;
        e.preventDefault();
        state.isDrawing = false;
        ctx.closePath();
        saveUndoState();
    }

    canvas.addEventListener('mousedown', startStroke);
    canvas.addEventListener('mousemove', moveStroke);
    window.addEventListener('mouseup', endStroke);
    canvas.addEventListener('touchstart', startStroke, { passive: false });
    canvas.addEventListener('touchmove', moveStroke, { passive: false });
    window.addEventListener('touchend', endStroke, { passive: false });

    function setActiveTool(toolName) {
        state.tool = toolName;
        const buttons = [
            { el: toolBrushBtn, name: 'brush' },
            { el: toolFillBtn, name: 'fill' },
            { el: toolPipetteBtn, name: 'pipette' },
            { el: toolEraserBtn, name: 'eraser' }
        ];

        buttons.forEach(item => {
            if (item.name === toolName) {
                item.el.className = 'px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white flex items-center gap-1.5 transition';
            } else {
                item.el.className = 'px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1.5 transition';
            }
        });

        if (toolName === 'fill' || toolName === 'pipette') {
            canvas.style.cursor = 'crosshair';
            customBrushDot.style.display = 'none';
        } else {
            canvas.style.cursor = 'none';
        }
    }

    colorSwatches.forEach(btn => {
        btn.addEventListener('click', () => {
            state.brushColor = btn.getAttribute('data-color');
            if (state.tool === 'eraser' || state.tool === 'pipette') setActiveTool('brush');
            colorSwatches.forEach(b => {
                b.classList.remove('border-white', 'ring-2', 'ring-indigo-500');
                b.classList.add('border-transparent');
            });
            btn.classList.remove('border-transparent');
            btn.classList.add('border-white', 'ring-2', 'ring-indigo-500');
        });
    });

    customColorPicker.addEventListener('input', (e) => {
        state.brushColor = e.target.value;
        if (state.tool === 'eraser' || state.tool === 'pipette') setActiveTool('brush');
        colorSwatches.forEach(b => {
            b.classList.remove('border-white', 'ring-2', 'ring-indigo-500');
            b.classList.add('border-transparent');
        });
    });

    brushSizeSlider.addEventListener('input', (e) => {
        state.brushSize = parseInt(e.target.value, 10);
        brushSizeLabel.textContent = `${state.brushSize}px`;
    });

    toolBrushBtn.addEventListener('click', () => setActiveTool('brush'));
    toolFillBtn.addEventListener('click', () => setActiveTool('fill'));
    toolPipetteBtn.addEventListener('click', () => setActiveTool('pipette'));
    toolEraserBtn.addEventListener('click', () => setActiveTool('eraser'));

    undoBtn.addEventListener('click', () => {
        if (state.undoStack.length > 1) {
            state.undoStack.pop();
            drawImageFromDataUrl(state.undoStack[state.undoStack.length - 1]);
        }
    });

    clearCanvasBtn.addEventListener('click', () => {
        fillCanvasWhite();
        saveUndoState();
    });

    // ================= ВСТАВКА КАРТИНКИ ("ШТАМП") =================
    function renderStampOverlay() {
        stampCtx.clearRect(0, 0, stampOverlayCanvas.width, stampOverlayCanvas.height);
        if (!state.stamp.active || !state.stamp.img) return;

        const { img, x, y, scale, rotation } = state.stamp;
        const w = img.width * scale;
        const h = img.height * scale;

        stampCtx.save();
        stampCtx.translate(x, y);
        stampCtx.rotate((rotation * Math.PI) / 180);

        stampCtx.drawImage(img, -w / 2, -h / 2, w, h);

        stampCtx.strokeStyle = '#4f46e5';
        stampCtx.lineWidth = 3;
        stampCtx.setLineDash([10, 6]);
        stampCtx.strokeRect(-w / 2, -h / 2, w, h);

        stampCtx.restore();
    }

    function openStampMode(img) {
        const maxInitW = canvas.width * 0.55;
        const maxInitH = canvas.height * 0.55;
        const ratio = Math.min(maxInitW / img.width, maxInitH / img.height, 1);

        state.stamp.active = true;
        state.stamp.img = img;
        state.stamp.x = canvas.width / 2;
        state.stamp.y = canvas.height / 2;
        state.stamp.scale = ratio;
        state.stamp.rotation = 0;

        const percent = Math.round(ratio * 100);
        stampScaleSlider.value = percent;
        stampScaleLabel.textContent = `${percent}%`;
        stampRotateSlider.value = 0;
        stampRotateLabel.textContent = `0°`;

        stampOverlayCanvas.classList.remove('hidden');
        stampControlPanel.classList.remove('hidden');
        drawingToolbar.classList.add('hidden');
        customBrushDot.style.display = 'none';

        renderStampOverlay();
    }

    function closeStampMode() {
        state.stamp.active = false;
        state.stamp.img = null;
        stampCtx.clearRect(0, 0, stampOverlayCanvas.width, stampOverlayCanvas.height);
        stampOverlayCanvas.classList.add('hidden');
        stampControlPanel.classList.add('hidden');
        if (state.isMyTurnDrawing || state.isPracticeMode) {
            drawingToolbar.classList.remove('hidden');
        }
    }

    insertImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const img = new Image();
            img.onload = () => openStampMode(img);
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    });

    stampScaleSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        state.stamp.scale = val / 100;
        stampScaleLabel.textContent = `${val}%`;
        renderStampOverlay();
    });

    stampRotateSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        state.stamp.rotation = val;
        stampRotateLabel.textContent = `${val}°`;
        renderStampOverlay();
    });

    function startStampDrag(e) {
        if (!state.stamp.active) return;
        e.preventDefault();
        const pos = getCanvasCoords(e, stampOverlayCanvas);
        state.stamp.isDragging = true;
        state.stamp.dragOffsetX = pos.x - state.stamp.x;
        state.stamp.dragOffsetY = pos.y - state.stamp.y;
    }

    function moveStampDrag(e) {
        if (!state.stamp.active || !state.stamp.isDragging) return;
        e.preventDefault();
        const pos = getCanvasCoords(e, stampOverlayCanvas);
        state.stamp.x = pos.x - state.stamp.dragOffsetX;
        state.stamp.y = pos.y - state.stamp.dragOffsetY;
        renderStampOverlay();
    }

    function endStampDrag() {
        state.stamp.isDragging = false;
    }

    stampOverlayCanvas.addEventListener('mousedown', startStampDrag);
    stampOverlayCanvas.addEventListener('mousemove', moveStampDrag);
    window.addEventListener('mouseup', endStampDrag);
    stampOverlayCanvas.addEventListener('touchstart', startStampDrag, { passive: false });
    stampOverlayCanvas.addEventListener('touchmove', moveStampDrag, { passive: false });
    window.addEventListener('touchend', endStampDrag);

    cancelStampBtn.addEventListener('click', closeStampMode);

    applyStampBtn.addEventListener('click', () => {
        if (!state.stamp.active || !state.stamp.img) return;
        const { img, x, y, scale, rotation } = state.stamp;
        const w = img.width * scale;
        const h = img.height * scale;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();

        saveUndoState();
        closeStampMode();
    });

    // ================= ИНСТРУМЕНТ "ТЕКСТ" ЧЕРЕЗ ШТАМП =================
    function closeTextToolModal() {
        if (textToolModal) textToolModal.classList.add('hidden');
    }

    if (toolTextBtn) {
        toolTextBtn.addEventListener('click', () => {
            if (!state.isMyTurnDrawing && !state.isPracticeMode) return;
            canvasTextInput.value = '';
            canvasTextColorPicker.value = state.brushColor || '#0f172a';
            textToolModal.classList.remove('hidden');
            setTimeout(() => canvasTextInput.focus(), 50);
        });
    }

    if (closeTextToolModalBtn) closeTextToolModalBtn.addEventListener('click', closeTextToolModal);
    if (cancelTextToolBtn) cancelTextToolBtn.addEventListener('click', closeTextToolModal);

    function renderTextToImage(rawText, fontStyle, strokeMode, fillColor, callback) {
        const lines = rawText.split(/\r?\n/).map(l => l.trimEnd()).filter(l => l.length > 0);
        if (lines.length === 0) return;

        const fontSize = 84;
        const lineHeight = Math.round(fontSize * 1.18);
        let fontCss = `800 ${fontSize}px 'Inter', Arial, sans-serif`;
        if (fontStyle === 'meme') {
            fontCss = `900 ${fontSize}px Impact, 'Arial Black', sans-serif`;
        } else if (fontStyle === 'hand') {
            fontCss = `italic 700 ${fontSize}px 'Comic Sans MS', 'Segoe Print', cursive`;
        } else if (fontStyle === 'mono') {
            fontCss = `700 ${fontSize}px 'Courier New', monospace`;
        }

        const measureCanvas = document.createElement('canvas');
        const mCtx = measureCanvas.getContext('2d');
        mCtx.font = fontCss;

        let maxLineWidth = 0;
        lines.forEach(line => {
            const w = mCtx.measureText(line).width;
            if (w > maxLineWidth) maxLineWidth = w;
        });

        const padding = 28;
        const totalW = Math.max(Math.ceil(maxLineWidth + padding * 2), 60);
        const totalH = Math.max(Math.ceil(lines.length * lineHeight + padding * 2), 60);

        const textCanvas = document.createElement('canvas');
        textCanvas.width = totalW;
        textCanvas.height = totalH;
        const tCtx = textCanvas.getContext('2d');

        tCtx.font = fontCss;
        tCtx.textAlign = 'center';
        tCtx.textBaseline = 'middle';
        tCtx.lineJoin = 'round';
        tCtx.lineCap = 'round';

        lines.forEach((line, idx) => {
            const yPos = padding + lineHeight * idx + lineHeight / 2;
            const xPos = totalW / 2;

            if (strokeMode === 'black' || strokeMode === 'white') {
                tCtx.strokeStyle = strokeMode === 'black' ? '#0f172a' : '#ffffff';
                tCtx.lineWidth = 12;
                tCtx.strokeText(line, xPos, yPos);
            }

            tCtx.fillStyle = fillColor;
            tCtx.fillText(line, xPos, yPos);
        });

        const img = new Image();
        img.onload = () => callback(img);
        img.src = textCanvas.toDataURL('image/png');
    }

    if (createTextStampBtn) {
        createTextStampBtn.addEventListener('click', () => {
            const rawText = canvasTextInput.value.trim();
            if (!rawText) {
                canvasTextInput.focus();
                return;
            }
            const fontStyle = canvasTextFontSelect.value;
            const strokeMode = canvasTextStrokeSelect.value;
            const fillColor = canvasTextColorPicker.value;

            renderTextToImage(rawText, fontStyle, strokeMode, fillColor, (textImg) => {
                closeTextToolModal();
                openStampMode(textImg);
            });
        });
    }
    // =============================================================

    openRulesBtn.addEventListener('click', () => rulesModal.classList.remove('hidden'));
    closeRulesModalBtn.addEventListener('click', () => rulesModal.classList.add('hidden'));
    confirmRulesBtn.addEventListener('click', () => rulesModal.classList.add('hidden'));

    openInfoBtn.addEventListener('click', () => infoModal.classList.remove('hidden'));
    closeInfoModalBtn.addEventListener('click', () => infoModal.classList.add('hidden'));
    confirmInfoBtn.addEventListener('click', () => infoModal.classList.add('hidden'));

    openOfferBtn.addEventListener('click', () => offerModal.classList.remove('hidden'));
    closeOfferModalBtn.addEventListener('click', () => offerModal.classList.add('hidden'));
    confirmOfferBtn.addEventListener('click', () => offerModal.classList.add('hidden'));

    openPrivacyBtn.addEventListener('click', () => privacyModal.classList.remove('hidden'));
    closePrivacyModalBtn.addEventListener('click', () => privacyModal.classList.add('hidden'));
    confirmPrivacyBtn.addEventListener('click', () => privacyModal.classList.add('hidden'));

    // Фиксированная цена захвата (без ручного ввода)
    function refreshBookingPriceInputs() {
        state.selectedPrice = Number(state.currentPrice) || 1;
        if (priceFixedDisplay) {
            priceFixedDisplay.textContent = `${state.selectedPrice} ₽`;
        }
        submitBookingBtnText.textContent = `Оплатить ${state.selectedPrice} ₽ и открыть редактор`;
        if (upgradePracticeToLiveBtnText) {
            upgradePracticeToLiveBtnText.textContent = `Готово! Занять трон за ${state.selectedPrice} ₽`;
        }
    }

    function enterPracticeMode() {
        if (state.isMyTurnDrawing) return;
        state.isPracticeMode = true;
        bookingModal.classList.add('hidden');
        lockedCanvasOverlay.classList.add('hidden');
        emptyCanvasOverlay.classList.add('hidden');

        practiceModeBanner.classList.remove('hidden');
        drawingToolbar.classList.remove('hidden');
        livePublishActions.classList.add('hidden');
        practiceToolbarActions.classList.remove('hidden');

        canvas.classList.remove('canvas-default', 'canvas-shielded');
        canvas.classList.add('canvas-editing');

        setActiveTool('brush');
        fillCanvasWhite();
        state.undoStack = [];
        saveUndoState();
        refreshBookingPriceInputs();
        updateMainButtonState();
        syncColumnsHeight();
    }

    function exitPracticeMode(restoreCanvas = true) {
        if (!state.isPracticeMode) return;
        closeStampMode();
        state.isPracticeMode = false;
        practiceModeBanner.classList.add('hidden');
        drawingToolbar.classList.add('hidden');
        practiceToolbarActions.classList.add('hidden');
        livePublishActions.classList.remove('hidden');

        canvas.classList.remove('canvas-editing');
        customBrushDot.style.display = 'none';
        updateMainButtonState();
        if (restoreCanvas) {
            syncFromDatabase();
        }
    }

    if (startPracticeModeBtn) {
        startPracticeModeBtn.addEventListener('click', enterPracticeMode);
    }
    if (exitPracticeTopBtn) {
        exitPracticeTopBtn.addEventListener('click', () => exitPracticeMode(true));
    }
    if (exitPracticeToolbarBtn) {
        exitPracticeToolbarBtn.addEventListener('click', () => exitPracticeMode(true));
    }
    if (upgradePracticeToLiveBtn) {
        upgradePracticeToLiveBtn.addEventListener('click', () => {
            if (state.stamp.active) {
                applyStampBtn.click();
            }
            state.practiceDraftDataUrl = canvas.toDataURL('image/png');
            if (!state.paymentsEnabled) {
                alert('Приём оплаты временно приостановлен администратором.');
                return;
            }
            refreshBookingPriceInputs();
            if (!authorNameInput.value.trim()) {
                authorNameInput.value = state.anonName;
            }
            bookingModal.classList.remove('hidden');
        });
    }

    authorAvatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const img = new Image();
            img.onload = () => {
                const tmpCanvas = document.createElement('canvas');
                tmpCanvas.width = 128;
                tmpCanvas.height = 128;
                const tCtx = tmpCanvas.getContext('2d');
                
                const size = Math.min(img.width, img.height);
                const sx = (img.width - size) / 2;
                const sy = (img.height - size) / 2;
                tCtx.drawImage(img, sx, sy, size, size, 0, 0, 128, 128);

                uploadedAvatarBase64 = tmpCanvas.toDataURL('image/jpeg', 0.8);
                bookingAvatarPreview.innerHTML = `<img src="${uploadedAvatarBase64}" class="w-full h-full object-cover">`;
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    });

    startDrawBookingBtn.addEventListener('click', () => {
        if (!state.paymentsEnabled) {
            alert('Приём оплаты временно приостановлен администратором.');
            return;
        }
        refreshBookingPriceInputs();
        if (!authorNameInput.value.trim()) {
            authorNameInput.value = state.anonName;
        }
        bookingModal.classList.remove('hidden');
    });

    closeBookingModalBtn.addEventListener('click', () => bookingModal.classList.add('hidden'));

    const BTN_CLASS_ACTIVE = 'py-2 px-4 sm:px-5 rounded-xl font-display font-bold text-xs sm:text-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition duration-200 transform hover:-translate-y-0.5 active:translate-y-0';
    const BTN_CLASS_IMMUNITY = 'py-2 px-4 sm:px-5 rounded-xl font-display font-bold text-xs sm:text-sm bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center gap-2 cursor-not-allowed select-none';
    const BTN_CLASS_LOCKED = 'py-2 px-4 sm:px-5 rounded-xl font-display font-bold text-xs sm:text-sm bg-slate-200 text-slate-700 border border-slate-300 flex items-center justify-center gap-2 cursor-not-allowed select-none';
    const BTN_CLASS_DRAWING = 'py-2 px-4 sm:px-5 rounded-xl font-display font-bold text-xs sm:text-sm bg-indigo-100 text-indigo-800 border border-indigo-300 flex items-center justify-center gap-2 cursor-default select-none';

    function updateMainButtonState() {
        const priceVal = Number(state.currentPrice) || 1;
        if (upgradePracticeToLiveBtnText) {
            upgradePracticeToLiveBtnText.textContent = `Готово! Занять трон за ${priceVal} ₽`;
        }

        if (state.isMyTurnDrawing) {
            startDrawBookingBtn.disabled = true;
            startDrawBookingBtn.className = BTN_CLASS_DRAWING;
            startDrawBookingBtn.innerHTML = `<i class="fa-solid fa-palette text-indigo-600 animate-pulse"></i><span>Рисуешь: ${formatTime(state.drawingSecondsLeft)}</span>`;
        } else if (state.someoneElseDrawing) {
            startDrawBookingBtn.disabled = true;
            startDrawBookingBtn.className = BTN_CLASS_LOCKED;
            const lockTimerStr = state.lockedSecondsLeft > 0 ? ` (${formatTime(state.lockedSecondsLeft)})` : '';
            startDrawBookingBtn.innerHTML = `<i class="fa-solid fa-lock text-slate-500"></i><span>Холст занят${lockTimerStr}</span>`;
        } else if (state.immunitySecondsLeft > 0) {
            startDrawBookingBtn.disabled = true;
            startDrawBookingBtn.className = BTN_CLASS_IMMUNITY;
            startDrawBookingBtn.innerHTML = `<i class="fa-solid fa-shield-halved text-amber-600"></i><span>Иммунитет: ${formatTime(state.immunitySecondsLeft)}</span>`;
        } else if (!state.paymentsEnabled) {
            startDrawBookingBtn.disabled = true;
            startDrawBookingBtn.className = BTN_CLASS_LOCKED;
            startDrawBookingBtn.innerHTML = '<i class="fa-solid fa-pause"></i><span>Заявки на паузе</span>';
        } else {
            startDrawBookingBtn.disabled = false;
            startDrawBookingBtn.className = BTN_CLASS_ACTIVE;
            startDrawBookingBtn.innerHTML = `<i class="fa-solid fa-paintbrush"></i><span>Нарисовать свое за <span id="headerCurrentPrice">${priceVal} ₽</span></span>`;
        }
    }

    async function syncSiteSettings() {
        const { data } = await supabaseClient
            .from('site_settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (!data) return;

        state.paymentsEnabled = Boolean(data.payments_enabled);
        state.maintenanceMode = Boolean(data.maintenance_mode);

        if (state.maintenanceMode) {
            maintenanceText.textContent = data.maintenance_message || 'Сайт временно закрыт на техническое обслуживание. Скоро вернёмся!';
            maintenanceOverlay.classList.remove('hidden');
        } else {
            maintenanceOverlay.classList.add('hidden');
        }

        updateMainButtonState();
        state.chatEnabled = data.chat_enabled !== false;
if (chatMessageInput && sendChatBtn && toggleEmojiBtn) {
    chatMessageInput.disabled = !state.chatEnabled;
    sendChatBtn.disabled = !state.chatEnabled;
    toggleEmojiBtn.disabled = !state.chatEnabled;
    chatMessageInput.placeholder = state.chatEnabled
        ? 'Написать в чат...'
        : 'Чат временно закрыт админом';
}
    }

    async function checkLockStatus() {
        const { data } = await supabaseClient
            .from('canvas_lock')
            .select('*')
            .eq('id', 1)
            .single();

        if (!data) return;

        if (data.is_locked && !state.isMyTurnDrawing) {
            const diff = Math.floor((new Date(data.locked_until).getTime() - Date.now()) / 1000);
            if (diff > 0) {
                state.someoneElseDrawing = true;
                state.lockedSecondsLeft = diff;
                state.lockedByName = data.locked_by || 'Аноним';
                lockedByNameEl.textContent = state.lockedByName;
                if (!state.isPracticeMode) {
                    lockedCanvasOverlay.classList.remove('hidden');
                }
                lockedTimerText.textContent = formatTime(diff);
                updateMainButtonState();
                return;
            }
        }

        const wasDrawingBefore = state.someoneElseDrawing;
        state.someoneElseDrawing = false;
        state.lockedSecondsLeft = 0;
        lockedCanvasOverlay.classList.add('hidden');
        updateMainButtonState();

        if (wasDrawingBefore && !state.isMyTurnDrawing && !state.isPracticeMode) {
            await syncFromDatabase();
        }
    }

    function activatePaidDrawingSession(order, remainingSeconds = 1200) {
        if (state.isPracticeMode) {
            exitPracticeMode(false);
        }

        state.bookingData = {
            name: order.author_name,
            social: order.author_link,
            avatar: order.author_avatar,
            price: order.price
        };

        state.isMyTurnDrawing = true;
        state.drawingSecondsLeft = Math.max(remainingSeconds, 60);

        bookingModal.classList.add('hidden');
        lockedCanvasOverlay.classList.add('hidden');
        practiceModeBanner.classList.add('hidden');
        practiceToolbarActions.classList.add('hidden');
        livePublishActions.classList.remove('hidden');
        drawingToolbar.classList.remove('hidden');
        updateMainButtonState();

        // Показываем предупреждение при разблокировке холста
        unlockWarningModal.classList.remove('hidden');

        clearInterval(state.immunityInterval);

        canvas.classList.remove('canvas-default', 'canvas-shielded');
        canvas.classList.add('canvas-editing');
        emptyCanvasOverlay.classList.add('hidden');

        setActiveTool('brush');
        const savedPracticeDraft = localStorage.getItem('tsar_practice_draft');
        if (savedPracticeDraft) {
            localStorage.removeItem('tsar_practice_draft');
            drawImageFromDataUrl(savedPracticeDraft, () => {
                state.undoStack = [];
                saveUndoState();
            });
        } else {
            fillCanvasWhite();
            state.undoStack = [];
            saveUndoState();
        }
        syncColumnsHeight();

        window.onbeforeunload = function() {
            return "Ты сейчас рисуешь на холсте! Если закроешь страницу, оплата сгорит.";
        };

        clearInterval(state.drawingInterval);
        updateMainButtonState();
        state.drawingInterval = setInterval(() => {
            state.drawingSecondsLeft--;
            updateMainButtonState();
            if (state.drawingSecondsLeft <= 0) {
                clearInterval(state.drawingInterval);
                alert("20 минут истекли! Время вышло.");
                finishDrawingSession();
                syncFromDatabase();
            }
        }, 1000);
    }

    async function checkReturnedPaymentOrder() {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('order_token');
        const tokenFromStorage = localStorage.getItem('tsar_pending_order_token');
        const token = tokenFromUrl || tokenFromStorage;

        if (!token) return;

        if (tokenFromUrl) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                const res = await fetch(PAY_FUNCTION_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${SUPABASE_KEY}`
                    },
                    body: JSON.stringify({ action: 'check', secretToken: token })
                });

                const result = await res.json();

                if (result.ok && result.status === 'paid' && result.order) {
                    state.orderToken = token;
                    localStorage.setItem('tsar_pending_order_token', token);

                    const { data: lockData } = await supabaseClient
                        .from('canvas_lock')
                        .select('locked_until')
                        .eq('id', 1)
                        .single();

                    let secondsLeft = 1200;
                    if (lockData?.locked_until) {
                        const diff = Math.floor((new Date(lockData.locked_until).getTime() - Date.now()) / 1000);
                        if (diff > 0) secondsLeft = diff;
                    }

                    activatePaidDrawingSession(result.order, secondsLeft);
                    return;
                }

                if (result.ok && (result.status === 'used' || result.status === 'published' || result.status === 'canceled')) {
                    localStorage.removeItem('tsar_pending_order_token');
                    if (result.status === 'canceled') {
                        alert('Пока шла оплата, холст успел занять другой художник. Средства автоматически возвращены.');
                    }
                    return;
                }
            } catch (err) {
                console.error('Ошибка проверки платежа:', err);
            }

            await new Promise(r => setTimeout(r, 1500));
        }
    }

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBookingBtn.disabled = true;
        submitBookingBtnText.textContent = 'Переходим к оплате...';

        const name = authorNameInput.value.trim() || state.anonName;
        const instaObj = normalizeInstaNick(authorSocialInput.value.trim());
        const siteObj = authorWebsiteInput ? normalizeWebsiteData(authorWebsiteInput.value.trim()) : null;

        const combinedParts = [];
        if (instaObj) combinedParts.push(instaObj.display);
        if (siteObj) combinedParts.push(siteObj.url);
        const cleanSocialNick = combinedParts.join(' | ');

        try {
            const res = await fetch(PAY_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                },
                body: JSON.stringify({
                    action: 'create',
                    name,
                    link: cleanSocialNick,
                    avatar: uploadedAvatarBase64
                })
            });

            const data = await res.json();

            if (!data.ok || !data.confirmationUrl) {
                submitBookingBtn.disabled = false;
                refreshBookingPriceInputs();
                alert('Не удалось создать платеж: ' + (data.error || 'Ошибка сервера'));
                await checkLockStatus();
                return;
            }

            if (state.practiceDraftDataUrl) {
                try {
                    localStorage.setItem('tsar_practice_draft', state.practiceDraftDataUrl);
                } catch (storageErr) {
                    console.warn('Draft too large for localStorage:', storageErr);
                }
            } else {
                localStorage.removeItem('tsar_practice_draft');
            }
            localStorage.setItem('tsar_pending_order_token', data.secretToken);
            window.location.href = data.confirmationUrl;
        } catch (err) {
            submitBookingBtn.disabled = false;
            refreshBookingPriceInputs();
            alert('Ошибка соединения с платежным шлюзом. Попробуйте ещё раз.');
        }
    });

    openConfirmPublishModalBtn.addEventListener('click', () => {
        confirmPublishModal.classList.remove('hidden');
    });

    cancelConfirmPublishBtn.addEventListener('click', () => {
        confirmPublishModal.classList.add('hidden');
    });

    function finishDrawingSession() {
        closeStampMode();
        unlockWarningModal.classList.add('hidden');
        state.isMyTurnDrawing = false;
        state.orderToken = null;
        localStorage.removeItem('tsar_pending_order_token');
        window.onbeforeunload = null;
        clearInterval(state.drawingInterval);

        drawingToolbar.classList.add('hidden');
        canvas.classList.remove('canvas-editing');
        customBrushDot.style.display = 'none';
        updateMainButtonState();
    }

    // Публикация с ИИ-премодерацией и комментарием от ИИ
    finalPublishBtn.addEventListener('click', async () => {
        confirmPublishModal.classList.add('hidden');
        finalPublishBtn.disabled = true;
        openConfirmPublishModalBtn.disabled = true;
        const origBtnHtml = openConfirmPublishModalBtn.innerHTML;
        openConfirmPublishModalBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Проверяем работу...</span>';

        const imageDataUrl = canvas.toDataURL('image/png');

        const b = state.bookingData;
        const token = state.orderToken || localStorage.getItem('tsar_pending_order_token');

        try {
            const res = await fetch(MODERATE_PUBLISH_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                },
                body: JSON.stringify({
                    name: b.name,
                    link: b.social,
                    avatar: b.avatar,
                    image: imageDataUrl,
                    price: b.price,
                    token: token
                })
            });

            const data = await res.json();

            finalPublishBtn.disabled = false;
            openConfirmPublishModalBtn.disabled = false;
            openConfirmPublishModalBtn.innerHTML = origBtnHtml;

            if (!data.ok) {
                alert(data.error || 'Ошибка публикации');
                return;
            }

            finishDrawingSession();
            await syncFromDatabase();
        } catch (err) {
            finalPublishBtn.disabled = false;
            openConfirmPublishModalBtn.disabled = false;
            openConfirmPublishModalBtn.innerHTML = origBtnHtml;
            alert('Ошибка соединения при проверке работы. Попробуйте нажать «Опубликовать» ещё раз.');
        }
    });

    chooseBaseArtBtn.addEventListener('click', () => {
        const validHistory = state.history.filter(item => !item.isBanned);
        if (validHistory.length === 0) {
            alert('История пока пуста, основы нет!');
            return;
        }
        baseArtGrid.innerHTML = '';
        validHistory.forEach(item => {
            const card = document.createElement('div');
            card.className = 'cursor-pointer group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 hover:border-indigo-500 transition';
            card.innerHTML = `
                <img src="${item.imageDataUrl}" class="w-full aspect-[3/2] object-cover">
                <div class="p-1.5 text-[11px] font-bold text-slate-700 truncate">${escapeHtml(item.name)}</div>
            `;
            card.addEventListener('click', () => {
                drawImageFromDataUrl(item.imageDataUrl, () => {
                    saveUndoState();
                    chooseBaseModal.classList.add('hidden');
                });
            });
            baseArtGrid.appendChild(card);
        });
        chooseBaseModal.classList.remove('hidden');
    });

    closeChooseBaseModalBtn.addEventListener('click', () => chooseBaseModal.classList.add('hidden'));

    function clearImmunityUI() {
        state.immunitySecondsLeft = 0;
        if (state.immunityInterval) clearInterval(state.immunityInterval);
        if (!state.isMyTurnDrawing && !state.isPracticeMode) {
            canvas.classList.remove('canvas-shielded');
            canvas.classList.add('canvas-default');
        }
        canvasShieldBadge.classList.add('hidden');
        updateMainButtonState();
    }

    function startImmunityTimer(targetTimestamp) {
        if (state.isMyTurnDrawing) return;
        if (state.immunityInterval) clearInterval(state.immunityInterval);

        function checkTime() {
            if (state.isMyTurnDrawing) return;
            const now = Date.now();
            const diff = Math.floor((targetTimestamp - now) / 1000);

            if (diff <= 0) {
                clearImmunityUI();
            } else {
                state.immunitySecondsLeft = diff;
                if (!state.isPracticeMode) {
                    canvasShieldBadge.classList.remove('hidden');
                    canvas.classList.remove('canvas-default');
                    canvas.classList.add('canvas-shielded');
                }
                updateMainButtonState();
            }
        }

        checkTime();
        state.immunityInterval = setInterval(checkTime, 1000);
    }

    function openViewArtModal(art) {
        state.currentlyViewedArt = art;
        viewArtAuthorName.textContent = art.name;
        viewArtPrice.textContent = `${art.price} ₽`;
        viewArtTime.textContent = art.timeStr;
        viewArtImage.src = art.imageDataUrl;
        likeArtCount.textContent = art.likes || 0;

        const alreadyLiked = state.likedIds.includes(art.id);
        likeArtIcon.className = alreadyLiked 
            ? 'fa-solid fa-heart text-sm text-rose-600' 
            : 'fa-regular fa-heart text-sm';

        if (art.avatar) {
            viewArtAvatar.innerHTML = `<img src="${art.avatar}" class="w-full h-full object-cover">`;
        } else {
            viewArtAvatar.innerHTML = `👑`;
        }

        const { insta, site } = parseAuthorLinks(art.social);
        if (insta && !art.isBanned) {
            viewArtAuthorLinkText.textContent = insta.display;
            viewArtAuthorLink.href = insta.url;
            viewArtAuthorLink.classList.remove('hidden');
        } else {
            viewArtAuthorLink.classList.add('hidden');
        }

        if (site && !art.isBanned && viewArtWebsiteLink) {
            viewArtWebsiteLinkText.textContent = site.display;
            viewArtWebsiteLink.href = site.url;
            viewArtWebsiteLink.classList.remove('hidden');
        } else if (viewArtWebsiteLink) {
            viewArtWebsiteLink.classList.add('hidden');
        }

        if (art.aiComment && !art.isBanned) {
            viewArtAiCommentText.textContent = `Вердикт ИИ: «${art.aiComment}»`;
            viewArtAiCommentBox.classList.remove('hidden');
        } else {
            viewArtAiCommentBox.classList.add('hidden');
        }

        viewArtModal.classList.remove('hidden');
    }

    closeViewArtModalBtn.addEventListener('click', () => viewArtModal.classList.add('hidden'));

    likeArtBtn.addEventListener('click', async () => {
        if (!state.currentlyViewedArt) return;
        const art = state.currentlyViewedArt;

        if (state.likedIds.includes(art.id)) return;

        state.likedIds.push(art.id);
        localStorage.setItem('tsar_liked_ids', JSON.stringify(state.likedIds));

        art.likes = (art.likes || 0) + 1;
        likeArtCount.textContent = art.likes;
        likeArtIcon.className = 'fa-solid fa-heart text-sm text-rose-600 animate-ping';
        setTimeout(() => { likeArtIcon.className = 'fa-solid fa-heart text-sm text-rose-600'; }, 300);

        if (state.currentKing && state.currentKing.id === art.id) {
            updateKingReignUI(state.currentKing);
        }
        renderHistory();
        if (art.id) {
            await supabaseClient.rpc('increment_like', { p_art_id: art.id });
        }
    });

    function renderHistory() {
        historyCountBadge.textContent = state.history.length;
        historyList.innerHTML = '';

        if (state.history.length === 0) {
            emptyHistoryText.classList.remove('hidden');
            return;
        }
        emptyHistoryText.classList.add('hidden');

        const currentKingId = state.currentKing ? state.currentKing.id : null;

        state.history.forEach((item) => {
            const isTop = item.id === currentKingId && !item.isBanned;
            const card = document.createElement('div');
            card.className = `flex items-center gap-2.5 p-2 rounded-xl border transition cursor-pointer hover:border-indigo-400 bg-white ${
                isTop ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'
            }`;

            const avatarHtml = item.avatar 
                ? `<img src="${item.avatar}" class="w-7 h-7 rounded-full object-cover border border-slate-200">`
                : `<div class="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs">👑</div>`;

            const { insta, site } = parseAuthorLinks(item.social);
            const linkLabels = [];
            if (insta) linkLabels.push(`Instagram*: ${insta.display}`);
            if (site) linkLabels.push(site.display);
            const subText = item.isBanned 
                ? '<span class="text-rose-500 font-medium">скрыто модератором</span>' 
                : escapeHtml(linkLabels.length > 0 ? linkLabels.join(' • ') : 'без ссылок');

            card.innerHTML = `
                <img src="${item.imageDataUrl}" class="w-12 h-9 object-cover bg-slate-50 rounded-lg border border-slate-200 shrink-0">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1">
                        ${avatarHtml}
                        <span class="text-xs font-bold text-slate-800 truncate">${escapeHtml(item.name)}</span>
                        ${isTop ? '<span class="text-[9px] px-1 py-0.2 bg-amber-100 text-amber-800 rounded font-bold">Царь</span>' : ''}
                    </div>
                    <span class="text-[10px] text-slate-400 truncate block mt-0.5">${subText}</span>
                </div>
                <div class="text-right shrink-0">
                    <span class="font-display font-bold text-xs text-emerald-600 block">${item.price} ₽</span>
                    <span class="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                        <i class="fa-solid fa-heart text-[9px] text-rose-500"></i> ${item.likes || 0}
                    </span>
                </div>
            `;
            card.addEventListener('click', () => openViewArtModal(item));
            historyList.appendChild(card);
        });
    }

    async function syncFromDatabase() {
        const { data, error } = await supabaseClient
            .from('canvas_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(25);

        if (error) {
            console.error('Ошибка Supabase:', error);
            return;
        }

        if (data && data.length > 0) {
            state.currentPrice = Number(data[0].next_price) || 1;
            const priceEl = document.getElementById('headerCurrentPrice'); if (priceEl) priceEl.textContent = `${state.currentPrice} ₽`; updateMainButtonState();

            const latestWasModerated = Boolean(data[0].is_banned) || Boolean(data[0].is_hidden) || (data[0].image_data && data[0].image_data.startsWith('data:image/svg+xml'));

            state.history = data
                .filter(row => !row.is_hidden)
                .slice(0, 20)
                .map(row => {
                    const date = new Date(row.created_at);
                    const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                    const isSvgBanned = row.image_data && row.image_data.startsWith('data:image/svg+xml');
                    return {
                        id: row.id,
                        name: row.author_name,
                        social: row.author_link,
                        avatar: row.author_avatar,
                        price: row.price,
                        nextPrice: row.next_price,
                        shieldUntil: row.shield_until,
                        likes: row.likes || 0,
                        isBanned: Boolean(row.is_banned) || isSvgBanned,
                        aiComment: row.ai_comment || '',
                        createdAt: row.created_at,
                        timeStr: timeStr,
                        imageDataUrl: row.image_data
                    };
                });

            const king = state.history.find(item => !item.isBanned);
            state.currentKing = king || null;

            if (king) {
                if (state.initialSyncDone && state.lastKnownKingId !== null && king.id !== state.lastKnownKingId && !latestWasModerated) {
                    triggerNewKingCelebration(king);
                }
                state.lastKnownKingId = king.id;

                kingName.textContent = king.name;
                kingPriceBadge.textContent = `Захватил за ${king.price} ₽`;
                kingPriceBadge.classList.remove('hidden');
                updateKingReignUI(king);

                if (king.avatar) {
                    kingAvatarImg.src = king.avatar;
                    kingAvatarImg.classList.remove('hidden');
                    kingAvatarDefault.classList.add('hidden');
                } else {
                    kingAvatarImg.classList.add('hidden');
                    kingAvatarDefault.classList.remove('hidden');
                }

                const { insta, site } = parseAuthorLinks(king.social);
                if (insta || site) {
                    kingSocialWrapper.classList.remove('hidden');
                    if (insta) {
                        kingSocialText.textContent = insta.display;
                        kingSocialLink.href = insta.url;
                        kingSocialLink.classList.remove('hidden');
                    } else {
                        kingSocialLink.classList.add('hidden');
                    }
                    if (site && kingWebsiteLink) {
                        kingWebsiteText.textContent = site.display;
                        kingWebsiteLink.href = site.url;
                        kingWebsiteLink.classList.remove('hidden');
                    } else if (kingWebsiteLink) {
                        kingWebsiteLink.classList.add('hidden');
                    }
                } else {
                    kingSocialWrapper.classList.add('hidden');
                    kingSocialLink.classList.add('hidden');
                    if (kingWebsiteLink) kingWebsiteLink.classList.add('hidden');
                }
                fitKingNameSize();

                if (!state.isMyTurnDrawing && !state.isPracticeMode) {
                    drawImageFromDataUrl(king.imageDataUrl);
                    emptyCanvasOverlay.classList.add('hidden');
                }

                renderHistory();
                renderChat();

                if (latestWasModerated) {
                    clearImmunityUI();
                } else {
                    startImmunityTimer(new Date(king.shieldUntil).getTime());
                }
            } else {
                state.lastKnownKingId = null;
                kingName.textContent = 'Никто (холст свободен)';
                kingPriceBadge.classList.add('hidden');
                updateKingReignUI(null);
                fitKingNameSize();
                kingSocialWrapper.classList.add('hidden');
                clearImmunityUI();
                if (!state.isMyTurnDrawing && !state.isPracticeMode) {
                    fillCanvasWhite();
                    emptyCanvasOverlay.classList.remove('hidden');
                }
                renderHistory();
                renderChat();
            }
        } else {
            state.lastKnownKingId = null;
            state.currentPrice = 1;
            const priceEl = document.getElementById('headerCurrentPrice'); if (priceEl) priceEl.textContent = '1 ₽'; updateMainButtonState();
            kingName.textContent = 'Никто (холст свободен)';
                fitKingNameSize();
            kingPriceBadge.classList.add('hidden');
            kingSocialWrapper.classList.add('hidden');
            clearImmunityUI();
            fillCanvasWhite();
            emptyCanvasOverlay.classList.remove('hidden');
            renderHistory();
            renderChat();
        }

        state.initialSyncDone = true;
        await checkLockStatus();
        syncColumnsHeight();
    }

    const sessionUserId = 'user_' + Math.random().toString(36).substring(2, 11);
    const presenceChannel = supabaseClient.channel('online_users', {
        config: {
            presence: {
                key: sessionUserId
            }
        }
    });

    presenceChannel
        .on('presence', { event: 'sync' }, () => {
            const presenceState = presenceChannel.presenceState();
            const activeUsersCount = Object.keys(presenceState).length;
            statOnlineEl.textContent = Math.max(activeUsersCount, 1);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel.track({
                    online_at: new Date().toISOString()
                });
            }
        });

    supabaseClient
        .channel('realtime:tsar_channel_secure')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'canvas_history' }, () => {
            syncFromDatabase();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'canvas_lock' }, () => {
            checkLockStatus();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'canvas_chat' }, () => {
            loadChatMessages();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
            syncSiteSettings();
        })
        .subscribe();

    setInterval(checkLockStatus, 2000);
    setInterval(loadChatMessages, 4000);
    setInterval(syncSiteSettings, 8000);
    setInterval(() => {
        if (!state.isMyTurnDrawing && !state.isPracticeMode) syncFromDatabase();
    }, 5000);

    // ================= ВЫРАВНИВАНИЕ ВЫСОТЫ КОЛОНОК СТРОГО ПО НИЗУ ХОЛСТА =================
    const leftChatCol = document.getElementById('leftChatCol');
    const centerCanvasCol = document.getElementById('centerCanvasCol');
    const rightHistoryCol = document.getElementById('rightHistoryCol');

    function syncColumnsHeight() {
        if (!leftChatCol || !centerCanvasCol || !rightHistoryCol || !canvasWrapper) return;
        if (window.innerWidth >= 1024) {
            const colTop = centerCanvasCol.getBoundingClientRect().top;
            const canvasBottom = canvasWrapper.getBoundingClientRect().bottom;
            const targetHeight = Math.round(canvasBottom - colTop);

            if (targetHeight > 250) {
                leftChatCol.style.height = `${targetHeight}px`;
                rightHistoryCol.style.height = `${targetHeight}px`;
            }
        } else {
            leftChatCol.style.height = '';
            rightHistoryCol.style.height = '';
        }
    }

    if (typeof ResizeObserver !== 'undefined' && canvasWrapper) {
        const ro = new ResizeObserver(syncColumnsHeight);
        ro.observe(canvasWrapper);
        if (kingBanner) ro.observe(kingBanner);
    }
    window.addEventListener('resize', syncColumnsHeight);
    setTimeout(syncColumnsHeight, 100);
    // ======================================================================================

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => fitKingNameSize());
    }
    syncSiteSettings();
    loadChatMessages();
    syncFromDatabase().then(() => checkReturnedPaymentOrder());
})();