const { Scenes, Markup } = require('telegraf');
const api = require('../api');
const { haversineKm, formatDate, formatPrice, getNextDates } = require('../utils');

const bookScene = new Scenes.BaseScene('book');

// ── Helpers ────────────────────────────────────────────────────────────────

function esc(str) {
    return String(str || '').slice(0, 200).replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&');
}

function initBook(ctx) {
    if (!ctx.session.book) ctx.session.book = {};
    ctx.session.book.step = 'shops';
}

async function safeEdit(ctx, text, extra) {
    try {
        if (ctx.callbackQuery) {
            await ctx.editMessageText(text, extra);
        } else {
            await ctx.reply(text, extra);
        }
    } catch {
        await ctx.reply(text, extra);
    }
}

// ── Step: shops ────────────────────────────────────────────────────────────

async function showShops(ctx) {
    ctx.session.book.step = 'shops';
    let shops, locations;
    try {
        [shops, locations] = await Promise.all([api.getBarbershops(), api.getLocations()]);
    } catch {
        return ctx.reply('❌ Sartaroshxonalarni olishda xatolik. Qayta urinib ko\'ring.');
    }

    // Sort by distance if user has location
    const userLat = ctx.session.lat;
    const userLng = ctx.session.lng;

    const locMap = Object.fromEntries((locations || []).map(l => [l.location_id, l]));

    const sorted = shops.map(s => {
        const loc = locMap[s.location_id] || locMap[s.locations?.[0]];
        let dist = null;
        if (userLat && userLng && loc?.lat && loc?.lng) {
            dist = haversineKm(userLat, userLng, loc.lat, loc.lng);
        }
        return { ...s, dist };
    }).sort((a, b) => {
        if (a.dist !== null && b.dist !== null) return a.dist - b.dist;
        if (a.dist !== null) return -1;
        if (b.dist !== null) return 1;
        return 0;
    });

    const buttons = sorted.map(s => {
        const distStr = s.dist !== null ? ` • ${s.dist.toFixed(1)} km` : '';
        return [Markup.button.callback(`🏪 ${s.name}${distStr}`, `book:shop:${s.barbershop_id}`)];
    });
    buttons.push([Markup.button.callback('❌ Bekor qilish', 'book:cancel')]);

    await safeEdit(ctx,
        '✂️ *Sartaroshxona tanlang:*',
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
    );
}

// ── Step: barbers ──────────────────────────────────────────────────────────

async function showBarbers(ctx) {
    ctx.session.book.step = 'barbers';
    const shopId = ctx.session.book.shopId;
    let barbers;
    try {
        barbers = await api.getBarbersByShop(shopId);
    } catch {
        return ctx.reply('❌ Sartaroshlarni olishda xatolik.');
    }

    if (!barbers.length) {
        return safeEdit(ctx, '❌ Bu sartaroshxonada sartarosh topilmadi.', Markup.inlineKeyboard([
            [Markup.button.callback('🔙 Ortga', 'book:back')],
        ]));
    }

    const buttons = barbers.map(b => [
        Markup.button.callback(`💈 ${b.name}`, `book:barber:${b.barber_id}`),
    ]);
    buttons.push([Markup.button.callback('🔙 Ortga', 'book:back')]);

    await safeEdit(ctx,
        `✂️ *${esc(ctx.session.book.shopName)}*\nSartarosh tanlang:`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
    );
}

// ── Step: services ─────────────────────────────────────────────────────────

async function showServices(ctx) {
    ctx.session.book.step = 'services';
    const barberId = ctx.session.book.barberId;
    let services;
    try {
        services = await api.getBarberServices(barberId);
    } catch {
        return ctx.reply('❌ Xizmatlarni olishda xatolik.');
    }

    if (!services.length) {
        return safeEdit(ctx, '❌ Bu sartarosh hali xizmat qo\'shmagan.', Markup.inlineKeyboard([
            [Markup.button.callback('🔙 Ortga', 'book:back')],
        ]));
    }

    // Store full list in session so we can look up price/duration on selection
    ctx.session.book.servicesList = services;

    const buttons = services.map(s => [
        Markup.button.callback(
            `${s.name} — ${formatPrice(s.price)} (${s.duration} min)`,
            `book:service:${s.service_id}`
        ),
    ]);
    buttons.push([Markup.button.callback('🔙 Ortga', 'book:back')]);

    await safeEdit(ctx,
        `💈 *${esc(ctx.session.book.barberName)}*\nXizmat tanlang:`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
    );
}

// ── Step: dates ────────────────────────────────────────────────────────────

async function showDates(ctx) {
    ctx.session.book.step = 'dates';
    const dates = getNextDates(14);

    // 2-column layout
    const rows = [];
    for (let i = 0; i < dates.length; i += 2) {
        const row = [Markup.button.callback(formatDate(dates[i]), `book:date:${dates[i]}`)];
        if (dates[i + 1]) row.push(Markup.button.callback(formatDate(dates[i + 1]), `book:date:${dates[i + 1]}`));
        rows.push(row);
    }
    rows.push([Markup.button.callback('🔙 Ortga', 'book:back')]);

    await safeEdit(ctx,
        `🗓 *Sana tanlang:*\n_${ctx.session.book.serviceName}_`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard(rows) }
    );
}

// ── Step: times ────────────────────────────────────────────────────────────

async function showTimes(ctx) {
    ctx.session.book.step = 'times';
    const { barberId, date } = ctx.session.book;
    let availability;
    try {
        availability = await api.getBarberAvailability(barberId, date);
    } catch {
        return ctx.reply('❌ Vaqtlarni olishda xatolik.');
    }

    if (availability.dayOff || availability.notWorking) {
        return safeEdit(ctx,
            `😴 *${formatDate(date)}* kuni sartarosh ishlamaydi.\nBoshqa sana tanlang:`,
            { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Ortga', 'book:back')]]) }
        );
    }

    const available = (availability.slots || []).filter(s => s.available);
    if (!available.length) {
        return safeEdit(ctx,
            `😔 *${formatDate(date)}* kuni bo'sh vaqt yo'q.\nBoshqa sana tanlang:`,
            { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Ortga', 'book:back')]]) }
        );
    }

    // 4-column layout
    const rows = [];
    for (let i = 0; i < available.length; i += 4) {
        rows.push(
            available.slice(i, i + 4).map(s =>
                Markup.button.callback(s.time, `book:time:${s.time}`)
            )
        );
    }
    rows.push([Markup.button.callback('🔙 Ortga', 'book:back')]);

    await safeEdit(ctx,
        `🕐 *${formatDate(date)}* — Vaqt tanlang:`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard(rows) }
    );
}

// ── Step: confirm ──────────────────────────────────────────────────────────

async function showConfirm(ctx) {
    ctx.session.book.step = 'confirm';
    const b = ctx.session.book;

    const summary = [
        `✂️ *Bron xulosasi*`,
        ``,
        `🏪 Sartaroshxona: *${esc(b.shopName)}*`,
        `💈 Sartarosh: *${esc(b.barberName)}*`,
        `📋 Xizmat: *${esc(b.serviceName)}*`,
        `💰 Narx: *${formatPrice(b.servicePrice)}*`,
        `⏱ Davomiyligi: *${b.serviceDuration} daqiqa*`,
        `🗓 Sana: *${formatDate(b.date)}*`,
        `🕐 Vaqt: *${b.time}*`,
    ].join('\n');

    await safeEdit(ctx, summary, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('✅ Tasdiqlash', 'book:confirm'), Markup.button.callback('❌ Bekor', 'book:cancel')],
            [Markup.button.callback('🔙 Ortga', 'book:back')],
        ]),
    });
}

// ── Scene entry ────────────────────────────────────────────────────────────

bookScene.enter(async (ctx) => {
    if (!ctx.session.registered) {
        await ctx.reply('Iltimos, avval ro\'yxatdan o\'ting. /start');
        return ctx.scene.leave();
    }
    initBook(ctx);
    await showShops(ctx);
});

// ── Callback handler ───────────────────────────────────────────────────────

bookScene.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (!data.startsWith('book:')) return;
    await ctx.answerCbQuery();

    const book = ctx.session.book;
    const step = book.step;

    // Cancel
    if (data === 'book:cancel') {
        await ctx.editMessageText('❌ Bron bekor qilindi.');
        return ctx.scene.leave();
    }

    // Back navigation
    if (data === 'book:back') {
        if (step === 'barbers') return showShops(ctx);
        if (step === 'services') return showBarbers(ctx);
        if (step === 'dates') return showServices(ctx);
        if (step === 'times') return showDates(ctx);
        if (step === 'confirm') return showTimes(ctx);
        return showShops(ctx);
    }

    // Confirm booking
    if (data === 'book:confirm') {
        try {
            await api.createBooking(ctx.session.token, {
                barber_id: book.barberId,
                service_id: book.serviceId,
                day: book.date,
                time: book.time,
            });

            await ctx.editMessageText(
                `✅ *Bron muvaffaqiyatli qo'shildi!*\n\n` +
                `📋 ${esc(book.serviceName)}\n` +
                `🗓 ${formatDate(book.date)} • ${book.time}\n` +
                `💈 ${esc(book.barberName)}`,
                { parse_mode: 'Markdown' }
            );
        } catch (err) {
            const msg = esc((err.data?.error || err.message || 'Noma\'lum xatolik').slice(0, 200));
            await ctx.editMessageText(`❌ Xatolik: ${msg}\n\nQayta urinib ko'ring.`);
        }
        return ctx.scene.leave();
    }

    // Shop selected
    if (data.startsWith('book:shop:')) {
        const shopId = Number(data.split(':')[2]);
        // Fetch shop name from the button text (or re-fetch)
        const btnText = ctx.callbackQuery.message?.reply_markup?.inline_keyboard
            ?.flat()?.find(b => b.callback_data === data)?.text || '';
        const shopName = btnText.replace(/^🏪 /, '').split(' • ')[0];
        book.shopId = shopId;
        book.shopName = shopName || `Sartaroshxona #${shopId}`;
        return showBarbers(ctx);
    }

    // Barber selected
    if (data.startsWith('book:barber:')) {
        const barberId = Number(data.split(':')[2]);
        const btnText = ctx.callbackQuery.message?.reply_markup?.inline_keyboard
            ?.flat()?.find(b => b.callback_data === data)?.text || '';
        book.barberId = barberId;
        book.barberName = btnText.replace(/^💈 /, '') || `Sartarosh #${barberId}`;
        return showServices(ctx);
    }

    // Service selected
    if (data.startsWith('book:service:')) {
        const serviceId = Number(data.split(':')[2]);
        const service = ctx.session.book.servicesList?.find(s => s.service_id === serviceId);

        book.serviceId = serviceId;
        book.serviceName = service?.name || `Xizmat #${serviceId}`;
        book.servicePrice = service?.price ?? 0;
        book.serviceDuration = service?.duration ?? 30;
        return showDates(ctx);
    }

    // Date selected
    if (data.startsWith('book:date:')) {
        book.date = data.slice('book:date:'.length);
        return showTimes(ctx);
    }

    // Time selected
    if (data.startsWith('book:time:')) {
        book.time = data.slice('book:time:'.length);
        return showConfirm(ctx);
    }
});

// ── Text handler (e.g. /start mid-flow) ───────────────────────────────────
bookScene.command('start', async (ctx) => {
    await ctx.scene.leave();
    const { showMainMenu } = require('../index');
    await showMainMenu(ctx);
});

module.exports = bookScene;
