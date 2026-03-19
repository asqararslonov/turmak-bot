require('dotenv').config();
const crypto  = require('crypto');
const express = require('express');
const cors    = require('cors');
const { Telegraf, Scenes, session, Markup } = require('telegraf');
const { botAuth } = require('./api');

const onboardScene  = require('./scenes/onboard');
const bookScene     = require('./scenes/book');
const bookingsScene = require('./scenes/bookings');

const BOT_TOKEN     = process.env.BOT_TOKEN;
const OWNER_CHAT_ID = process.env.OWNER_CHAT_ID;
const MINI_APP_URL  = process.env.MINI_APP_URL || 'https://t.me/turmak_bot/app';
const API_BASE      = process.env.API_BASE     || 'https://turmak-api.vercel.app/api';
const PORT          = process.env.PORT         || 3001;

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN is not set in .env');
    process.exit(1);
}

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const bot = new Telegraf(BOT_TOKEN);

// ── API helper (bot → backend) ─────────────────────────────────────────────

async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, bot_secret: BOT_TOKEN }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
}

// ── Session + Stage setup ──────────────────────────────────────────────────

const stage = new Scenes.Stage([onboardScene, bookScene, bookingsScene]);
bot.use(session());
bot.use(stage.middleware());

// ── Main Menu ──────────────────────────────────────────────────────────────

async function showMainMenu(ctx, isNewUser = false) {
    const name = ctx.session?.name || ctx.from?.first_name || 'Foydalanuvchi';
    const greeting = isNewUser
        ? `🎉 Xush kelibsiz, *${name}*! Ro'yxatdan o'tdingiz.`
        : `👋 Salom, *${name}*!`;

    await ctx.reply(
        `${greeting}\n\nNima qilmoqchisiz?`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('✂️ Sartarosh bron qilish', 'menu:book')],
                [Markup.button.callback('📋 Mening bronlarim', 'menu:bookings')],
                [Markup.button.callback('📍 Yaqin sartaroshxonalar', 'menu:nearby')],
                [Markup.button.url('🌐 Mini App ochish', MINI_APP_URL)],
            ]),
        }
    );
}

// ── Silent session restore by telegram_id ──────────────────────────────────

async function tryRestoreSession(ctx) {
    if (ctx.session?.registered) return true;
    try {
        const { token, user } = await botAuth({ telegram_id: ctx.from?.id });
        ctx.session.token = token;
        ctx.session.userId = user._id;
        ctx.session.name = user.name;
        ctx.session.registered = true;
        return true;
    } catch {
        return false;
    }
}

// ── /start command ─────────────────────────────────────────────────────────

bot.start(async (ctx) => {
    const payload = ctx.startPayload;

    // ── Website "Login with Telegram" flow ──────────────────────────────
    if (payload?.startsWith('auth_')) {
        const session_token = payload.slice(5);

        try {
            await apiPost('/auth/tg-otp/pending', { session_token, telegram_id: ctx.from.id });
        } catch {
            return ctx.reply('❌ Sessiya topilmadi yoki muddati tugagan. Saytdan qayta urining.');
        }

        // Already registered — send code immediately, no contact needed
        try {
            await apiPost('/auth/bot', { telegram_id: ctx.from.id });
            const code = crypto.randomInt(100000, 999999).toString();
            await apiPost('/auth/tg-otp/callback', {
                telegram_id: ctx.from.id,
                code,
                name: ctx.from.first_name,
            });
            return ctx.reply(
                `turmak.uz ga kirish uchun kod:\n\n*${code}*\n\nSaytga qayting va kodni kiriting.`,
                { parse_mode: 'Markdown' }
            );
        } catch {
            // Not registered — ask for phone contact
        }

        return ctx.reply(
            'turmak.uz ga kirish uchun telefon raqamingizni ulashing:',
            {
                reply_markup: {
                    keyboard: [[{ text: '📱 Telefon raqamini ulashish', request_contact: true }]],
                    resize_keyboard: true,
                    one_time_keyboard: true,
                },
            }
        );
    }

    // ── Normal /start ────────────────────────────────────────────────────
    if (ctx.scene?.current) await ctx.scene.leave();
    const isRestored = await tryRestoreSession(ctx);
    if (isRestored) return showMainMenu(ctx);
    return ctx.scene.enter('onboard');
});

// ── Contact handler — website auth flow (outside scenes) ───────────────────

bot.on('contact', async (ctx) => {
    if (ctx.scene?.current) return; // let scenes handle their own contact

    const contact = ctx.message.contact;
    const code = crypto.randomInt(100000, 999999).toString();

    try {
        await apiPost('/auth/tg-otp/callback', {
            telegram_id: ctx.from.id,
            phone: contact.phone_number,
            name: contact.first_name || ctx.from.first_name,
            code,
        });
        await ctx.reply(
            `turmak.uz ga kirish uchun kod:\n\n*${code}*\n\nSaytga qayting va kodni kiriting.`,
            {
                parse_mode: 'Markdown',
                reply_markup: { remove_keyboard: true },
            }
        );
    } catch (err) {
        await ctx.reply(
            err.message?.includes('pending')
                ? 'Sessiya topilmadi. Saytdan qayta urining.'
                : '❌ Xatolik yuz berdi. Saytdan qayta urining.',
            { reply_markup: { remove_keyboard: true } }
        );
    }
});

// ── /book command ──────────────────────────────────────────────────────────

bot.command('book', async (ctx) => {
    const ok = await tryRestoreSession(ctx);
    if (!ok) return ctx.reply('Ro\'yxatdan o\'tish uchun /start ni bosing.');
    return ctx.scene.enter('book');
});

// ── /mybookings command ────────────────────────────────────────────────────

bot.command('mybookings', async (ctx) => {
    const ok = await tryRestoreSession(ctx);
    if (!ok) return ctx.reply('Ro\'yxatdan o\'tish uchun /start ni bosing.');
    return ctx.scene.enter('bookings');
});

// ── /miniapp command ───────────────────────────────────────────────────────

bot.command('miniapp', async (ctx) => {
    await ctx.reply(
        '🌐 Turmak.uz Mini App ni oching:',
        Markup.inlineKeyboard([[Markup.button.url('🌐 Mini App ochish', MINI_APP_URL)]])
    );
});

// ── /help command ──────────────────────────────────────────────────────────

bot.command('help', async (ctx) => {
    await ctx.reply(
        `📌 *Turmak.uz Bot — Buyruqlar*\n\n` +
        `/start — Boshlash yoki bosh menyu\n` +
        `/book — Sartarosh bron qilish\n` +
        `/mybookings — Mening bronlarim\n` +
        `/miniapp — Mini App ochish\n` +
        `/help — Yordam`,
        { parse_mode: 'Markdown' }
    );
});

// ── Main menu callbacks ─────────────────────────────────────────────────────

bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery?.data;
    if (!data?.startsWith('menu:')) return;
    await ctx.answerCbQuery();

    if (data === 'menu:book') {
        const ok = await tryRestoreSession(ctx);
        if (!ok) return ctx.reply('Ro\'yxatdan o\'tish uchun /start ni bosing.');
        return ctx.scene.enter('book');
    }
    if (data === 'menu:bookings') {
        const ok = await tryRestoreSession(ctx);
        if (!ok) return ctx.reply('Ro\'yxatdan o\'tish uchun /start ni bosing.');
        return ctx.scene.enter('bookings');
    }
    if (data === 'menu:nearby') {
        if (!ctx.session?.lat) {
            await ctx.reply(
                '📍 Joylashuvingizni ulashing — eng yaqin sartaroshxonalarni topamiz!',
                Markup.keyboard([[Markup.button.locationRequest('📍 Joylashuv ulashish')]]).resize().oneTime()
            );
            return;
        }
        return ctx.scene.enter('book');
    }
});

// ── Location (outside scenes) ──────────────────────────────────────────────

bot.on('location', async (ctx) => {
    ctx.session.lat = ctx.message.location.latitude;
    ctx.session.lng = ctx.message.location.longitude;
    await ctx.reply('📍 Joylashuvingiz saqlandi!', Markup.removeKeyboard());
    return showMainMenu(ctx);
});

// ── Error handler ──────────────────────────────────────────────────────────

bot.catch((err, ctx) => {
    console.error(`[bot] Error for ${ctx.updateType}:`, err.message);
    ctx.reply('❌ Ichki xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.').catch(() => {});
});

// ── HTTP: Webhook (Vercel) ─────────────────────────────────────────────────

app.post('/bot-webhook', async (req, res) => {
    try {
        await bot.handleUpdate(req.body);
        res.sendStatus(200);
    } catch (err) {
        console.error('Webhook error:', err.message);
        res.sendStatus(500);
    }
});

app.get('/setup-webhook', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'url query param required' });
    try {
        await bot.telegram.setWebhook(`${url}/bot-webhook`);
        res.json({ ok: true, webhook: `${url}/bot-webhook` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── HTTP: Waitlist ─────────────────────────────────────────────────────────

const ROLE_LABELS = {
    user:   { uz: 'Mijoz',            ru: 'Клиент',   en: 'Client' },
    master: { uz: 'Barber',           ru: 'Барбер',   en: 'Barber' },
    owner:  { uz: 'Barbershop egasi', ru: 'Владелец', en: 'Owner'  },
};
const ROLE_EMOJI = { user: '👤', master: '✂️', owner: '🏪' };

app.post('/waitlist', async (req, res) => {
    const { name, phone, role, telegram } = req.body || {};
    if (!name || !phone || !role)
        return res.status(400).json({ success: false, error: 'Missing required fields' });

    const emoji = ROLE_EMOJI[role] || '👤';
    const label = ROLE_LABELS[role]
        ? `${ROLE_LABELS[role].uz} / ${ROLE_LABELS[role].ru} / ${ROLE_LABELS[role].en}`
        : role;
    const tg = telegram ? `@${telegram.replace(/^@/, '')}` : '—';
    const message =
        `🎉 <b>Yangi Waitlist ro'yxati!</b>\n\n` +
        `👤 <b>Ism:</b> ${name}\n` +
        `📞 <b>Telefon:</b> ${phone}\n` +
        `${emoji} <b>Tur:</b> ${label}\n` +
        `📱 <b>Telegram:</b> ${tg}\n\n` +
        `#waitlist #turmak`;
    try {
        const result = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: OWNER_CHAT_ID, text: message, parse_mode: 'HTML' }),
        }).then(r => r.json());
        if (result.ok) res.json({ success: true });
        else res.status(500).json({ success: false, error: result.description });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── HTTP: Health / Debug ───────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/debug', (_req, res) => res.json({
    has_bot_token:     !!process.env.BOT_TOKEN,
    has_owner_chat_id: !!process.env.OWNER_CHAT_ID,
    api_base:          API_BASE,
    is_vercel:         !!process.env.VERCEL,
}));

// ── Launch ─────────────────────────────────────────────────────────────────

if (process.env.VERCEL) {
    // Vercel handles HTTP; bot receives updates via webhook
} else {
    bot.launch()
        .then(() => console.log('✅ Turmak.uz bot started (polling)'))
        .catch(err => { console.error('❌ Failed to start bot:', err.message); process.exit(1); });

    process.once('SIGINT',  () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));

    const tryListen = (port) => {
        const server = app.listen(port)
            .on('listening', () => console.log(`✂️  turmak-bot on http://localhost:${port}`))
            .on('error', (err) => {
                if (err.code === 'EADDRINUSE') { server.close(); tryListen(port + 1); }
                else throw err;
            });
    };
    tryListen(PORT);
}

module.exports = app;
