const { Scenes, Markup } = require('telegraf');
const { botAuth } = require('../api');

const CITIES = ['Toshkent', 'Samarqand', 'Buxoro', 'Namangan', 'Andijon', 'Boshqa'];

const onboardScene = new Scenes.WizardScene(
    'onboard',

    // Step 0: Ask name
    async (ctx) => {
        ctx.session.onboard = {};
        await ctx.reply(
            '👋 Assalomu alaykum! Turmak.uz ga xush kelibsiz!\n\nIsmingizni kiriting 👤',
            Markup.removeKeyboard()
        );
        return ctx.wizard.next();
    },

    // Step 1: Got name → ask gender
    async (ctx) => {
        if (!ctx.message?.text) {
            return ctx.reply('Iltimos, ismingizni matn ko\'rinishida kiriting 👤');
        }
        ctx.session.onboard.name = ctx.message.text.trim();
        await ctx.reply(
            'Jinsingiz? 👤',
            Markup.inlineKeyboard([
                [Markup.button.callback('👨 Erkak', 'gender:male'), Markup.button.callback('👩 Ayol', 'gender:female')],
            ])
        );
        return ctx.wizard.next();
    },

    // Step 2: Got gender → ask city
    async (ctx) => {
        if (!ctx.callbackQuery?.data?.startsWith('gender:')) {
            return ctx.reply('Iltimos, jinsingizni tanlang 👇');
        }
        await ctx.answerCbQuery();
        ctx.session.onboard.gender = ctx.callbackQuery.data.split(':')[1];

        const buttons = CITIES.map(c => [Markup.button.callback(c, `city:${c}`)]);
        await ctx.reply(
            'Shahringiz? 🏙',
            Markup.inlineKeyboard(buttons)
        );
        return ctx.wizard.next();
    },

    // Step 3: Got city → ask phone
    async (ctx) => {
        if (!ctx.callbackQuery?.data?.startsWith('city:')) {
            return ctx.reply('Iltimos, shahringizni tanlang 👇');
        }
        await ctx.answerCbQuery();
        ctx.session.onboard.city = ctx.callbackQuery.data.split(':')[1];

        await ctx.reply(
            '📱 Telefon raqamingizni ulashing.\nBu faqat bron qilish uchun kerak va xavfsiz saqlanadi.',
            Markup.keyboard([
                [Markup.button.contactRequest('📱 Telefon ulashish')],
            ]).resize().oneTime()
        );
        return ctx.wizard.next();
    },

    // Step 4: Got phone → auth with backend → ask location
    async (ctx) => {
        if (!ctx.message?.contact) {
            return ctx.reply('Iltimos, "📱 Telefon ulashish" tugmasini bosing 👇');
        }
        const contact = ctx.message.contact;
        ctx.session.onboard.phone = contact.phone_number;

        await ctx.reply('⏳ Ma\'lumotlar tekshirilmoqda...', Markup.removeKeyboard());

        try {
            const { token, user } = await botAuth({
                telegram_id: ctx.from.id,
                phone: contact.phone_number,
                name: ctx.session.onboard.name,
                gender: ctx.session.onboard.gender,
            });

            ctx.session.token = token;
            ctx.session.userId = user._id;
            ctx.session.name = user.name;
            ctx.session.registered = true;

        } catch (err) {
            console.error('[onboard] botAuth error:', err.message);
            await ctx.reply('❌ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring. /start');
            return ctx.scene.leave();
        }

        await ctx.reply(
            '📍 Joylashuvingizni ulashing — eng yaqin sartaroshxonalarni topamiz!',
            Markup.keyboard([
                [Markup.button.locationRequest('📍 Joylashuv ulashish')],
                ['⏩ O\'tkazib yuborish'],
            ]).resize().oneTime()
        );
        return ctx.wizard.next();
    },

    // Step 5: Got location (or skip) → done
    async (ctx) => {
        if (ctx.message?.location) {
            ctx.session.lat = ctx.message.location.latitude;
            ctx.session.lng = ctx.message.location.longitude;
        }
        // "skip" or any text also accepted

        await ctx.scene.leave();
        const { showMainMenu } = require('../index');
        await showMainMenu(ctx, true);
    }
);

// If user sends /start mid-onboarding, restart the wizard from step 0
onboardScene.command('start', async (ctx) => {
    ctx.session.onboard = {};
    await ctx.wizard.selectStep(0);
    return ctx.wizard.steps[0](ctx);
});

module.exports = onboardScene;
