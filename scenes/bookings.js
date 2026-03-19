const { Scenes, Markup } = require('telegraf');
const api = require('../api');
const { formatDate, statusBadge } = require('../utils');

const bookingsScene = new Scenes.BaseScene('bookings');

async function showBookings(ctx) {
    if (!ctx.session.registered) {
        await ctx.reply('Iltimos, avval ro\'yxatdan o\'ting. /start');
        return ctx.scene.leave();
    }

    let bookings;
    try {
        bookings = await api.getUserBookings(ctx.session.token, ctx.session.userId);
    } catch (err) {
        await ctx.reply('❌ Bronlarni olishda xatolik: ' + err.message);
        return ctx.scene.leave();
    }

    if (!bookings.length) {
        await ctx.reply(
            '📋 Hozircha bronlaringiz yo\'q.\n\nYangi bron qilish uchun quyidagi tugmani bosing:',
            Markup.inlineKeyboard([
                [Markup.button.callback('✂️ Bron qilish', 'bk:newbook')],
                [Markup.button.callback('🔙 Bosh menu', 'bk:menu')],
            ])
        );
        return;
    }

    // Sort: upcoming first, then by date
    const sorted = [...bookings].sort((a, b) => {
        if (a.day !== b.day) return a.day < b.day ? -1 : 1;
        return a.time < b.time ? -1 : 1;
    });

    // Build message
    const lines = sorted.map((b, i) => {
        const barberName = b.barber?.name || '?';
        const svcName = b.service?.name || '?';
        const dateStr = formatDate(b.day);
        const badge = statusBadge(b.status);
        return `${i + 1}. *${dateStr}* ${b.time} — ${barberName}\n   ${svcName} • ${badge}`;
    }).join('\n\n');

    // Cancel buttons for pending/confirmed only
    const cancelable = sorted.filter(b => b.status === 'pending' || b.status === 'confirmed');
    const buttons = cancelable.map(b => [
        Markup.button.callback(`❌ #${b.booking_id} bronni bekor qilish`, `bk:cancel:${b.booking_id}`),
    ]);
    buttons.push([Markup.button.callback('🔙 Bosh menu', 'bk:menu')]);

    const text = `📋 *Mening bronlarim*\n\n${lines}`;

    try {
        if (ctx.callbackQuery) {
            await ctx.editMessageText(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
        } else {
            await ctx.reply(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
        }
    } catch {
        await ctx.reply(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
    }
}

bookingsScene.enter(showBookings);

bookingsScene.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (!data.startsWith('bk:')) return;
    await ctx.answerCbQuery();

    if (data === 'bk:menu') {
        await ctx.scene.leave();
        const { showMainMenu } = require('../index');
        return showMainMenu(ctx);
    }

    if (data === 'bk:newbook') {
        await ctx.scene.leave();
        return ctx.scene.enter('book');
    }

    if (data.startsWith('bk:cancel:')) {
        const bookingId = Number(data.split(':')[2]);
        // Confirm cancel
        await ctx.editMessageText(
            `❓ Bron #${bookingId} ni bekor qilmoqchimisiz?`,
            Markup.inlineKeyboard([
                [
                    Markup.button.callback('✅ Ha, bekor qilish', `bk:confirmcancel:${bookingId}`),
                    Markup.button.callback('🔙 Yo\'q', 'bk:back'),
                ],
            ])
        );
        return;
    }

    if (data.startsWith('bk:confirmcancel:')) {
        const bookingId = Number(data.split(':')[2]);
        try {
            await api.deleteBooking(ctx.session.token, bookingId);
            await ctx.editMessageText(`✅ Bron #${bookingId} bekor qilindi.`);
            // Refresh list after short delay
            setTimeout(() => showBookings(ctx).catch(() => {}), 1000);
        } catch (err) {
            const msg = err.data?.error || err.message;
            await ctx.editMessageText(`❌ Xatolik: ${msg}`);
        }
        return;
    }

    if (data === 'bk:back') {
        return showBookings(ctx);
    }
});

bookingsScene.command('start', async (ctx) => {
    await ctx.scene.leave();
    const { showMainMenu } = require('../index');
    await showMainMenu(ctx);
});

module.exports = bookingsScene;
