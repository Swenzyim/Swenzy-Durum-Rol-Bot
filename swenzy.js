const { Client, Partials, PermissionsBitField, ActivityType, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const cfg = require('./config'); // Bu yolun doğru olduğundan emin olun

```
 _______      ___    ___ ________  ________  ________  _______      
|\  ___ \    |\  \  /  /|\   ____\|\   __  \|\   ___ \|\  ___ \     
\ \   __/|   \ \  \/  / | \  \___|\ \  \|\  \ \  \_|\ \ \   __/|    
 \ \  \_|/__  \ \    / / \ \  \    \ \  \\\  \ \  \ \\ \ \  \_|/__  
  \ \  \_|\ \  /     \/   \ \  \____\ \  \\\  \ \  \_\\ \ \  \_|\ \ 
   \ \_______\/  /\   \    \ \_______\ \_______\ \_______\ \_______\
    \|_______/__/ /\ __\    \|_______|\|_______|\|_______|\|_______|
             |__|/ \|__|     
```

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.MessageContent,
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

client.on('ready', () => {
  console.log(`${client.user.tag} hazır.`);
  client.user.setStatus('online');
  setInterval(() => {
    const activityIndex = Math.floor(Math.random() * cfg.STATUS.length);
    client.user.setActivity({ name: cfg.STATUS[activityIndex], type: ActivityType.Playing });
  }, 10000);
});

client.on('messageCreate', async (message) => {
  const guildId = cfg.GUILD_ID;
  const channelId = cfg.CHANNEL_ID;

  if (message.channel.id !== channelId || message.guild.id !== guildId) return;

  if (message.attachments.size > 0) {
    const attachment = message.attachments.first();

    if (attachment.width) {
      message.react(cfg.EMOJI).catch(console.error);
    }
  } else {
    message.delete().catch(console.error);
  }
});

client.on('presenceUpdate', async (oldPresence, newPresence) => {
  const guild = client.guilds.cache.get(cfg.GUILD_ID);
  if (!guild) return;

  const role = guild.roles.cache.get(cfg.ROLE_ID);
  if (!role) return;

  const logChannel = guild.channels.cache.get(cfg.LOG_CHANNEL_ID);
  if (!logChannel) return;

  const member = guild.members.cache.get(newPresence.userId);
  if (!member) return;

  if (newPresence.activities.length > 0 && newPresence.activities[0].state?.includes(cfg.EXPECTED_STATUS)) {
    if (!member.roles.cache.has(role.id)) {
      member.roles.add(role).catch(console.error);

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setAuthor({ name: `${member.user.tag}`, iconURL: member.user.displayAvatarURL() })
        .setDescription('Bir kişi daha aramıza katıldı 🎉')
        .addFields(
          { name: '• Rol Verildi! Hoş geldin!', value: '\u200B' },
          
          { name: 'Kullanıcı etiket:', value: `${member}`, inline: true },
          { name: '\u200B', value: '\u200B' }, // Boşluk eklemek için
          { name: 'Güncelleme saati:', value: `17 saniye önce`, inline: true },
          
          { name: 'Toplam kişi:', value: `2`, inline: true },
        )
        .setFooter({ text: 'SWENZY' });

      logChannel.send({ embeds: [embed] }).catch(console.error);
    }
  } else {
    if (member.roles.cache.has(role.id)) {
      member.roles.remove(role).catch(console.error);

      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setAuthor({ name: `${member.user.tag}`, iconURL: member.user.displayAvatarURL() })
        .setDescription('Bir kişi aramızdan ayrıldı 😢')
        .addFields(
          { name: '• Kullanıcının durum mesajı değiştiği için roller kaldırıldı.', value: '\u200B' },
          
          { name: 'Kullanıcı etiket:', value: `${member}`, inline: true },
          { name: '\u200B', value: '\u200B' }, // Boşluk eklemek için
          { name: 'Güncelleme saati:', value: `17 saniye önce`, inline: true },
          
          { name: 'Toplam kişi:', value: `1`, inline: true },
        )
        .setFooter({ text: 'SWENZY' });

      logChannel.send({ embeds: [embed] }).catch(console.error);
    }
  }
});

client.login(cfg.TOKEN);
