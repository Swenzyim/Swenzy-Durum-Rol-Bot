const { 
    Client, Partials, PermissionsBitField, ActivityType, 
    GatewayIntentBits, EmbedBuilder 
} = require('discord.js');
const cfg = require('./config'); // Bu yolun doğru olduğundan emin olun

// ==========================================================
// !!! YENİ KOD: İKİ DEFA MESAJ ATMAYI ENGELLEME KONTROLÜ !!!
// ==========================================================
// Kullanıcıların son işlem zamanlarını tutan Map
const userActivityCooldowns = new Map();
// Mesajların tekrar atılmasını engellemek için bekleme süresi (3 saniye)
const COOLDOWN_TIME = 3000; 
// ==========================================================


// Konsol görseli
console.log(`
  _______      ___     ___ ________  ________  ________  _______      
 |\\ ___ \\     |\\ \\   / /|\\  ____\\|\\  __  \\|\\  ___ \\|\\  ___ \\     
 \\ \\  __/|    \\ \\ \\/ / | \\  \\___|\\ \\  \\|  \\ \\  \\_|\\ \\ \\  __/|     
  \\ \\  \\_|/__  \\ \\   / / \\ \\  \\    \\ \\  \\\\\\  \\ \\  \\ \\ \\ \\  \\_|/__ 
   \\ \\  \\_|\\ \\  /   \\/    \\ \\  \\____\\ \\  \\\\\\  \\ \\  \\_\\ \\ \\  \\_|\\ \\ 
    \\ \\_______\\/ /\\ \\ \\    \\ \\_______\\ \\_______\\ \\_______\\ \\_______\\
     \\|_______/__/ /\\ __\\    \\|_______|\\|_______|\\|_______|\\|_______|
               |__|/ \\|__| 
`); 
// ---

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences, // Durum kontrolü için ZORUNLU
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        // Diğer Intent'ler
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
    ],
    partials: [
        Partials.User,
        Partials.Channel,
        Partials.GuildMember,
        Partials.Message,
        Partials.Reaction,
        Partials.GuildScheduledEvent,
        Partials.ThreadMember,
    ],
    allowedMentions: {
        repliedUser: false,
        parse: ['users', 'roles', 'everyone'],
    },
});

// Bot hazır olduğunda yapılacaklar
client.on('ready', () => {
    console.log(`${client.user.tag} hazır.`);
    client.user.setStatus('online');
    
    // Aktivite değiştirme aralığı
    setInterval(() => {
        const activityIndex = Math.floor(Math.random() * cfg.STATUS.length);
        client.user.setActivity({ name: cfg.STATUS[activityIndex], type: ActivityType.Playing });
    }, 10000);
});

// Mesaj kontrolü (resim/ek varsa tepki verme, yoksa silme)
client.on('messageCreate', async (message) => {
    const guildId = cfg.GUILD_ID;
    const channelId = cfg.CHANNEL_ID;

    if (message.channel.id !== channelId || message.guild.id !== guildId || message.author.bot) return;

    if (message.attachments.size > 0) {
        const attachment = message.attachments.first();

        if (attachment.width) {
            message.react(cfg.EMOJI).catch(console.error);
        }
    } else {
        message.delete().catch(console.error);
    }
});

// Durum (Presence) Güncellemesi - Ana Logic
client.on('presenceUpdate', async (oldPresence, newPresence) => {
    const guild = client.guilds.cache.get(cfg.GUILD_ID);
    if (!guild) return;

    // Rolü, Log Kanalını ve Üyeyi cache'ten al.
    const role = guild.roles.cache.get(cfg.ROLE_ID);
    const logChannel = guild.channels.cache.get(cfg.LOG_CHANNEL_ID);
    const member = guild.members.cache.get(newPresence.userId);
    
    // Hata kontrolü
    if (!role || !logChannel || !member || member.user.bot) return;
    
    // ==========================================================
    // İKİ DEFA MESAJ ATMAYI ENGELLEME KONTROLÜ (DEBOUNCING)
    // ==========================================================
    const now = Date.now();
    const userId = member.id;
    
    if (userActivityCooldowns.has(userId)) {
        const lastExecuted = userActivityCooldowns.get(userId);
        const timeElapsed = now - lastExecuted;

        // Eğer 3 saniyeden az zaman geçtiyse, işlemi atla
        if (timeElapsed < COOLDOWN_TIME) {
            return;
        }
    }
    
    // İşlem başlayacaksa, haritadaki zamanı güncelle
    userActivityCooldowns.set(userId, now);
    // ==========================================================

    
    // Tarih/Saat değişkenini tanımla
    const dateNow = new Date();
    let totalMembersWithRole = role.members.size; 

    // =========================================================================
    // I. DURUM: ROL VER
    // =========================================================================
    if (newPresence.activities.length > 0 && newPresence.activities[0].state?.includes(cfg.EXPECTED_STATUS)) {
        if (!member.roles.cache.has(role.id)) {
            // Rolü ver
            member.roles.add(role).catch(err => console.error(`Rol verme hatası: ${err}`));

            // Rol verildikten sonra sayıyı 1 artır.
            totalMembersWithRole += 1; 

            // Embed'i oluştur
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setAuthor({ name: `${member.user.tag}`, iconURL: member.user.displayAvatarURL() })
                .setDescription('Bir kişi daha aramıza katıldı 🎉')
                .addFields(
                    { name: '• Rol Verildi! Hoş geldin!', value: `**Rol:** ${role.name}` },
                    
                    { name: 'Kullanıcı Etiket:', value: `${member}`, inline: true },
                    { name: 'Durum Metni:', value: `\`${cfg.EXPECTED_STATUS}\``, inline: true },
                    { name: '\u200B', value: '\u200B', inline: false }, 
                    
                    // Tarih kısmı düzeltildi
                    { name: 'Güncelleme Saati:', value: `${dateNow.toLocaleTimeString('tr-TR')} / ${dateNow.toLocaleDateString('tr-TR')}`, inline: true },
                    
                    // Dinamik üye sayısı kullanıldı
                    { name: 'Toplam Kişi:', value: `${totalMembersWithRole}`, inline: true }, 
                )
                .setFooter({ text: 'Development By ExCODE' });

            // Log Kanalına mesaj gönder
            logChannel.send({ embeds: [embed] }).catch(err => console.error(`[LOG HATA - ROL VERME]: Mesaj gönderilemedi. Hata: ${err}`));
        }
    } 
    // =========================================================================
    // II. DURUM: ROL KALDIR
    // =========================================================================
    else {
        if (member.roles.cache.has(role.id)) {
            // Rolü kaldır
            member.roles.remove(role).catch(err => console.error(`Rol kaldırma hatası: ${err}`));

            // Rol kaldırıldıktan sonra sayıyı 1 azalt.
            totalMembersWithRole -= 1; 

            // Embed'i oluştur
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setAuthor({ name: `${member.user.tag}`, iconURL: member.user.displayAvatarURL() })
                .setDescription('Bir kişi aramızdan ayrıldı 😢')
                .addFields(
                    { name: '• Rol Kaldırıldı.', value: `Kullanıcının durum mesajı artık \`${cfg.EXPECTED_STATUS}\` içermiyor. **Rol:** ${role.name}` },
                    
                    { name: 'Kullanıcı Etiket:', value: `${member}`, inline: true },
                    { name: '\u200B', value: '\u200B', inline: true }, 
                    { name: '\u200B', value: '\u200B', inline: false }, 
                    
                    // Tarih kısmı düzeltildi
                    { name: 'Güncelleme Saati:', value: `${dateNow.toLocaleTimeString('tr-TR')} / ${dateNow.toLocaleDateString('tr-TR')}`, inline: true },
                    
                    // Dinamik üye sayısı kullanıldı
                    { name: 'Toplam Kişi:', value: `${totalMembersWithRole}`, inline: true },
                )
                .setFooter({ text: 'Development By ExCODE' });

            // Log Kanalına mesaj gönder
            logChannel.send({ embeds: [embed] }).catch(err => console.error(`[LOG HATA - ROL KALDIRMA]: Mesaj gönderilemedi. Hata: ${err}`));
        }
    }
});

client.login(cfg.TOKEN);
