(function() {
    const SUPABASE_URL = 'https://azivkmabyjtyzkrjhwxg.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_Goz2iCXq20ySsctUBX1MWg_5ZpD7eVQ';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const state = {
        currentPrice: 10,
        autoNextPrice: 12,
        customMinPrice: 12,
        customMaxPrice: 15,
        selectedPrice: 12,

        bookingData: null,
        isMyTurnDrawing: false,
        someoneElseDrawing: false,
        lockedByName: '',

        drawingSecondsLeft: 1200,
        drawingInterval: null,

        immunitySecondsLeft: 0,
        immunityInterval: null,

        currentKing: null,
        history: [],
        currentlyViewedArt: null,
        likedIds: JSON.parse(localStorage.getItem('tsar_liked_ids') || '[]'),

        brushColor: '#0f172a',
        brushSize: 8,
        tool: 'brush',
        isDrawing: false,
        undoStack: []
    };

    const canvas = document.getElementById('mainCanvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const customBrushDot = document.getElementById('customBrushDot');
    const emptyCanvasOverlay = document.getElementById('emptyCanvasOverlay');
    const lockedCanvasOverlay = document.getElementById('lockedCanvasOverlay');
    const lockedByNameEl = document.getElementById('lockedByName');
    const lockedTimerText = document.getElementById('lockedTimerText');
    const canvasShieldBadge = document.getElementById('canvasShieldBadge');
    const editingModeNotice = document.getElementById('editingModeNotice');
    const drawingTimerText = document.getElementById('drawingTimerText');

    const statOnlineEl = document.getElementById('statOnline');
    const headerCurrentPrice = document.getElementById('headerCurrentPrice');
    const kingName = document.getElementById('kingName');
    const kingPriceBadge = document.getElementById('kingPriceBadge');
    const kingSocialWrapper = document.getElementById('kingSocialWrapper');
    const kingSocialLink = document.getElementById('kingSocialLink');
    const kingSocialText = document.getElementById('kingSocialText');
    const kingAvatarDefault = document.getElementById('kingAvatarDefault');
    const kingAvatarImg = document.getElementById('kingAvatarImg');

    const immunityBox = document.getElementById('immunityBox');
    const immunityTimerText = document.getElementById('immunityTimerText');

    const drawingToolbar = document.getElementById('drawingToolbar');
    const viewModeControls = document.getElementById('viewModeControls');
    const startDrawBookingBtn = document.getElementById('startDrawBookingBtn');

    const colorSwatches = document.querySelectorAll('.color-swatch');
    const customColorPicker = document.getElementById('customColorPicker');
    const brushSizeSlider = document.getElementById('brushSizeSlider');
    const brushSizeLabel = document.getElementById('brushSizeLabel');
    const toolBrushBtn = document.getElementById('toolBrushBtn');
    const toolEraserBtn = document.getElementById('toolEraserBtn');
    const undoBtn = document.getElementById('undoBtn');
    const chooseBaseArtBtn = document.getElementById('chooseBaseArtBtn');
    const clearCanvasBtn = document.getElementById('clearCanvasBtn');
    const openConfirmPublishModalBtn = document.getElementById('openConfirmPublishModalBtn');

    const rulesModal = document.getElementById('rulesModal');
    const openRulesBtn = document.getElementById('openRulesBtn');
    const closeRulesModalBtn = document.getElementById('closeRulesModalBtn');
    const confirmRulesBtn = document.getElementById('confirmRulesBtn');

    const bookingModal = document.getElementById('bookingModal');
    const closeBookingModalBtn = document.getElementById('closeBookingModalBtn');
    const bookingForm = document.getElementById('bookingForm');
    const authorNameInput = document.getElementById('authorNameInput');
    const authorSocialInput = document.getElementById('authorSocialInput');
    const authorAvatarInput = document.getElementById('authorAvatarInput');
    const bookingAvatarPreview = document.getElementById('bookingAvatarPreview');
    const priceOptionAuto = document.getElementById('priceOptionAuto');
    const priceOptionCustom = document.getElementById('priceOptionCustom');
    const priceAutoDisplay = document.getElementById('priceAutoDisplay');
    const customPriceInputBox = document.getElementById('customPriceInputBox');
    const customPriceInput = document.getElementById('customPriceInput');
    const customPriceRangeHint = document.getElementById('customPriceRangeHint');
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
    const viewArtPrice = document.getElementById('viewArtPrice');
    const viewArtTime = document.getElementById('viewArtTime');
    const viewArtImage = document.getElementById('viewArtImage');
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

    function calculateAuctionPrices(basePrice) {
        const autoPrice = Math.max(Math.ceil(basePrice * 1.15), basePrice + 2);
        const maxPrice = Math.ceil(basePrice * 1.50);
        return {
            autoPrice,
            minCustom: autoPrice,
            maxCustom: Math.max(maxPrice, autoPrice)
        };
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
        return !rulesModal.classList.contains('hidden') ||
               !bookingModal.classList.contains('hidden') ||
               !confirmPublishModal.classList.contains('hidden') ||
               !viewArtModal.classList.contains('hidden') ||
               !chooseBaseModal.classList.contains('hidden');
    }

    function updateBrushDot(e) {
        if (!state.isMyTurnDrawing || checkAnyModalOpen()) {
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

    function getCanvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    }

    function startStroke(e) {
        if (!state.isMyTurnDrawing) return;
        e.preventDefault();
        state.isDrawing = true;
        const pos = getCanvasCoords(e);
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
        if (!state.isMyTurnDrawing || !state.isDrawing) return;
        e.preventDefault();
        const pos = getCanvasCoords(e);
        ctx.lineWidth = state.brushSize;
        ctx.strokeStyle = state.tool === 'eraser' ? '#ffffff' : state.brushColor;
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    }

    function endStroke(e) {
        if (!state.isMyTurnDrawing || !state.isDrawing) return;
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
        if (toolName === 'brush') {
            toolBrushBtn.className = 'px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white flex items-center gap-1.5 transition';
            toolEraserBtn.className = 'px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1.5 transition';
        } else {
            toolEraserBtn.className = 'px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white flex items-center gap-1.5 transition';
            toolBrushBtn.className = 'px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1.5 transition';
        }
    }

    colorSwatches.forEach(btn => {
        btn.addEventListener('click', () => {
            state.brushColor = btn.getAttribute('data-color');
            setActiveTool('brush');
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
        setActiveTool('brush');
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

    openRulesBtn.addEventListener('click', () => rulesModal.classList.remove('hidden'));
    closeRulesModalBtn.addEventListener('click', () => rulesModal.classList.add('hidden'));
    confirmRulesBtn.addEventListener('click', () => rulesModal.classList.add('hidden'));

    function refreshBookingPriceInputs() {
        const prices = calculateAuctionPrices(state.currentPrice);
        state.autoNextPrice = prices.autoPrice;
        state.customMinPrice = prices.minCustom;
        state.customMaxPrice = prices.maxCustom;

        priceAutoDisplay.textContent = `${state.autoNextPrice} ₽`;
        customPriceRangeHint.textContent = `Диапазон: от ${state.customMinPrice} ₽ до ${state.customMaxPrice} ₽`;
        customPriceInput.min = state.customMinPrice;
        customPriceInput.max = state.customMaxPrice;
        customPriceInput.value = state.customMinPrice;

        if (priceOptionAuto.checked) {
            state.selectedPrice = state.autoNextPrice;
            submitBookingBtnText.textContent = `Оплатить ${state.selectedPrice} ₽ и открыть редактор`;
            customPriceInputBox.classList.add('hidden');
        } else {
            state.selectedPrice = parseInt(customPriceInput.value, 10) || state.customMinPrice;
            submitBookingBtnText.textContent = `Оплатить ${state.selectedPrice} ₽ и открыть редактор`;
            customPriceInputBox.classList.remove('hidden');
        }
    }

    priceOptionAuto.addEventListener('change', refreshBookingPriceInputs);
    priceOptionCustom.addEventListener('change', refreshBookingPriceInputs);

    customPriceInput.addEventListener('input', () => {
        let val = parseInt(customPriceInput.value, 10);
        if (isNaN(val)) val = state.customMinPrice;
        if (val > state.customMaxPrice) val = state.customMaxPrice;
        state.selectedPrice = val;
        submitBookingBtnText.textContent = `Оплатить ${state.selectedPrice} ₽ и открыть редактор`;
    });

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
        refreshBookingPriceInputs();
        bookingModal.classList.remove('hidden');
        authorNameInput.focus();
    });

    closeBookingModalBtn.addEventListener('click', () => bookingModal.classList.add('hidden'));

    function updateMainButtonState() {
        if (state.someoneElseDrawing) {
            startDrawBookingBtn.disabled = true;
            startDrawBookingBtn.innerHTML = '<i class="fa-solid fa-lock"></i><span>Холст занят художником</span>';
        } else if (state.immunitySecondsLeft > 0) {
            startDrawBookingBtn.disabled = true;
            startDrawBookingBtn.innerHTML = `<i class="fa-solid fa-lock"></i><span>Щит активен (${formatTime(state.immunitySecondsLeft)})</span>`;
        } else {
            startDrawBookingBtn.disabled = false;
            startDrawBookingBtn.innerHTML = '<i class="fa-solid fa-paintbrush"></i><span>Нарисовать свое</span>';
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
                state.lockedByName = data.locked_by || 'Аноним';
                lockedByNameEl.textContent = state.lockedByName;
                lockedCanvasOverlay.classList.remove('hidden');
                lockedTimerText.textContent = formatTime(diff);
                updateMainButtonState();
                return;
            }
        }

        state.someoneElseDrawing = false;
        lockedCanvasOverlay.classList.add('hidden');
        updateMainButtonState();
    }

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBookingBtn.disabled = true;
        submitBookingBtnText.textContent = 'Проверяем и бронируем...';

        const name = authorNameInput.value.trim() || 'Анонимный Художник';
        const social = authorSocialInput.value.trim();

        const { data, error } = await supabaseClient.rpc('book_canvas', {
            p_user_name: name
        });

        submitBookingBtn.disabled = false;

        if (error || !data || !data.ok) {
            alert('Не удалось забронировать холст: ' + (data?.error || error?.message || 'Ошибка сервера'));
            refreshBookingPriceInputs();
            await checkLockStatus();
            return;
        }

        state.bookingData = {
            name,
            social,
            avatar: uploadedAvatarBase64,
            price: state.selectedPrice
        };

        state.isMyTurnDrawing = true;
        state.drawingSecondsLeft = 1200;

        bookingModal.classList.add('hidden');
        viewModeControls.classList.add('hidden');
        drawingToolbar.classList.remove('hidden');
        editingModeNotice.classList.remove('hidden');

        canvas.classList.remove('canvas-default', 'canvas-shielded');
        canvas.classList.add('canvas-editing');
        emptyCanvasOverlay.classList.add('hidden');

        fillCanvasWhite();
        saveUndoState();

        window.onbeforeunload = function() {
            return "Ты сейчас рисуешь на холсте! Если закроешь страницу, оплата сгорит.";
        };

        clearInterval(state.drawingInterval);
        state.drawingInterval = setInterval(() => {
            state.drawingSecondsLeft--;
            drawingTimerText.textContent = formatTime(state.drawingSecondsLeft);
            if (state.drawingSecondsLeft <= 0) {
                clearInterval(state.drawingInterval);
                alert("20 минут истекли! Время вышло.");
                finishDrawingSession();
            }
        }, 1000);
    });

    openConfirmPublishModalBtn.addEventListener('click', () => {
        confirmPublishModal.classList.remove('hidden');
    });

    cancelConfirmPublishBtn.addEventListener('click', () => {
        confirmPublishModal.classList.add('hidden');
    });

    function finishDrawingSession() {
        state.isMyTurnDrawing = false;
        window.onbeforeunload = null;
        clearInterval(state.drawingInterval);

        drawingToolbar.classList.add('hidden');
        editingModeNotice.classList.add('hidden');
        viewModeControls.classList.remove('hidden');
        canvas.classList.remove('canvas-editing');
        customBrushDot.style.display = 'none';
    }

    finalPublishBtn.addEventListener('click', async () => {
        confirmPublishModal.classList.add('hidden');
        finalPublishBtn.disabled = true;
        finalPublishBtn.textContent = 'Публикуем...';

        const imageDataUrl = canvas.toDataURL('image/png');
        const b = state.bookingData;

        const { data, error } = await supabaseClient.rpc('publish_canvas', {
            p_name: b.name,
            p_link: b.social,
            p_avatar: b.avatar,
            p_image: imageDataUrl,
            p_price: b.price
        });

        finalPublishBtn.disabled = false;
        finalPublishBtn.textContent = 'Да, опубликовать!';

        if (error || !data || !data.ok) {
            alert('Ошибка публикации: ' + (data?.error || error?.message || 'Ошибка сервера'));
            return;
        }

        finishDrawingSession();
        await syncFromDatabase();
    });

    chooseBaseArtBtn.addEventListener('click', () => {
        if (state.history.length === 0) {
            alert('История пока пуста, основы нет!');
            return;
        }
        baseArtGrid.innerHTML = '';
        state.history.forEach(item => {
            const card = document.createElement('div');
            card.className = 'cursor-pointer group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 hover:border-indigo-500 transition';
            card.innerHTML = `
                <img src="${item.imageDataUrl}" class="w-full aspect-[3/2] object-cover">
                <div class="p-1.5 text-[11px] font-bold text-slate-700 truncate">${item.name}</div>
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

    function startImmunityTimer(targetTimestamp) {
        if (state.immunityInterval) clearInterval(state.immunityInterval);

        function checkTime() {
            const now = Date.now();
            const diff = Math.floor((targetTimestamp - now) / 1000);

            if (diff <= 0) {
                state.immunitySecondsLeft = 0;
                clearInterval(state.immunityInterval);
                immunityBox.classList.add('hidden');
                canvasShieldBadge.classList.add('hidden');
                canvas.classList.remove('canvas-shielded');
                if (!state.isMyTurnDrawing) canvas.classList.add('canvas-default');
                updateMainButtonState();
            } else {
                state.immunitySecondsLeft = diff;
                immunityTimerText.textContent = formatTime(state.immunitySecondsLeft);
                immunityBox.classList.remove('hidden');
                canvasShieldBadge.classList.remove('hidden');
                canvas.classList.remove('canvas-default');
                canvas.classList.add('canvas-shielded');
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

        if (art.social) {
            viewArtAuthorLink.textContent = art.social;
            viewArtAuthorLink.href = art.social.startsWith('http') ? art.social : `https://${art.social}`;
            viewArtAuthorLink.classList.remove('hidden');
        } else {
            viewArtAuthorLink.classList.add('hidden');
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

        state.history.forEach((item, index) => {
            const isTop = index === 0;
            const card = document.createElement('div');
            card.className = `flex items-center gap-3 p-2.5 rounded-xl border transition cursor-pointer hover:border-indigo-400 bg-white ${
                isTop ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'
            }`;

            const avatarHtml = item.avatar 
                ? `<img src="${item.avatar}" class="w-8 h-8 rounded-full object-cover border border-slate-200">`
                : `<div class="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs">👑</div>`;

            card.innerHTML = `
                <img src="${item.imageDataUrl}" class="w-14 h-10 object-cover bg-slate-50 rounded-lg border border-slate-200 shrink-0">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                        ${avatarHtml}
                        <span class="text-xs font-bold text-slate-800 truncate">${item.name}</span>
                        ${isTop ? '<span class="text-[9px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold">Царь</span>' : ''}
                    </div>
                    <span class="text-[11px] text-slate-400 truncate block mt-0.5">${item.social || 'без ссылки'}</span>
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
            .limit(20);

        if (error) {
            console.error('Ошибка Supabase:', error);
            return;
        }

        if (data && data.length > 0) {
            state.history = data.map(row => {
                const date = new Date(row.created_at);
                const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                return {
                    id: row.id,
                    name: row.author_name,
                    social: row.author_link,
                    avatar: row.author_avatar,
                    price: row.price,
                    nextPrice: row.next_price,
                    shieldUntil: row.shield_until,
                    likes: row.likes || 0,
                    timeStr: timeStr,
                    imageDataUrl: row.image_data
                };
            });

            const king = state.history[0];
            state.currentKing = king;
            state.currentPrice = king.nextPrice;

            headerCurrentPrice.textContent = `${state.currentPrice} ₽`;
            kingName.textContent = king.name;
            kingPriceBadge.textContent = `Захватил за ${king.price} ₽`;
            kingPriceBadge.classList.remove('hidden');

            if (king.avatar) {
                kingAvatarImg.src = king.avatar;
                kingAvatarImg.classList.remove('hidden');
                kingAvatarDefault.classList.add('hidden');
            } else {
                kingAvatarImg.classList.add('hidden');
                kingAvatarDefault.classList.remove('hidden');
            }

            if (king.social) {
                kingSocialWrapper.classList.remove('hidden');
                const displaySocial = king.social.startsWith('@') || king.social.includes('/') ? king.social : `@${king.social}`;
                kingSocialText.textContent = displaySocial;
                kingSocialLink.href = king.social.startsWith('http') ? king.social : `https://${king.social}`;
            } else {
                kingSocialWrapper.classList.add('hidden');
            }

            if (!state.isMyTurnDrawing) {
                drawImageFromDataUrl(king.imageDataUrl);
                emptyCanvasOverlay.classList.add('hidden');
            }

            renderHistory();
            startImmunityTimer(new Date(king.shieldUntil).getTime());
        } else {
            state.currentPrice = 10;
            headerCurrentPrice.textContent = '10 ₽';
            kingName.textContent = 'Никто (холст свободен)';
            kingPriceBadge.classList.add('hidden');
            kingSocialWrapper.classList.add('hidden');
            fillCanvasWhite();
            emptyCanvasOverlay.classList.remove('hidden');
            renderHistory();
            updateMainButtonState();
        }

        await checkLockStatus();
    }

    // Реальный счетчик онлайна через Supabase Presence
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

    // Подписка на изменения таблиц базы данных
    supabaseClient
        .channel('realtime:tsar_channel_secure')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'canvas_history' }, () => {
            syncFromDatabase();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'canvas_lock' }, () => {
            checkLockStatus();
        })
        .subscribe();

    setInterval(checkLockStatus, 2000);
    syncFromDatabase();
})();