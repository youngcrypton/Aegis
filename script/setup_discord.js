/**
 * AEGIS Protocol — Discord Server Automated Architect & Sentinel Setup
 * 
 * Usage:
 *   node script/setup_discord.js <BOT_TOKEN> [GUILD_ID]
 * 
 * Features:
 *   1. Authenticates bot and detects target server.
 *   2. Creates brand-coded roles with precise permission bitmasks:
 *      - Founder & AEGIS Core Team: Full Administrator (8)
 *      - Admin: Limited elevated channel/message administration (1391707155670)
 *      - Moderator: Limited moderation (1374422428738)
 *   3. Creates full professional categories and channels.
 *   4. Provisions #👋︱start-here onboarding session and Clan Tag (| AEGIS) adoption prompt.
 *   5. Provisions #🎫︱open-a-ticket interactive support desk (Bug Report, Complaint, Other Reason).
 *   6. Generates an automated Webhook for live keeper alerts in #sentinel-alerts.
 *   7. Dispatches official welcome & security embeds with AEGIS brand custom emojis.
 *   8. Saves the live webhook URL to keeper/discord_webhook.json for keeper integration.
 */

const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.argv[2] || process.env.DISCORD_BOT_TOKEN;
const TARGET_GUILD_ID = process.argv[3] || process.env.DISCORD_GUILD_ID;

if (!BOT_TOKEN) {
  console.error('\n❌ ERROR: Missing Bot Token!');
  console.log('Usage: node script/setup_discord.js <YOUR_DISCORD_BOT_TOKEN> [OPTIONAL_GUILD_ID]\n');
  process.exit(1);
}

const API_BASE = 'https://discord.com/api/v10';
const HEADERS = {
  'Authorization': `Bot ${BOT_TOKEN.trim()}`,
  'Content-Type': 'application/json'
};

// Brand Colors (Integer formats for Discord Embeds)
const BRAND_COLORS = {
  VIOLET: 0x6930EA,   // #6930EA
  TEAL: 0x07705F,     // #07705F
  AMBER: 0xFFBE7A,    // #FFBE7A
  MINT: 0x5FD9BE,     // #5FD9BE
  DARK: 0x1C2238,     // #1C2238
  RED: 0xEA3943       // #EA3943
};

// Custom AEGIS Brand Emoji
const AEGIS_EMOJI = '<:aegis:1559368274154627223>';

async function discordFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: HEADERS,
    ...options
  });

  if (res.status === 429) {
    const rateLimit = await res.json();
    const waitMs = (rateLimit.retry_after || 1) * 1000;
    console.log(` ⏳ Rate limit reached. Waiting ${waitMs}ms...`);
    await new Promise(r => setTimeout(r, waitMs));
    return discordFetch(endpoint, options);
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Discord API ${res.status} on ${endpoint}: ${errText}`);
  }

  if (res.status === 204) return null;
  return await res.json();
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Generate Discord snowflake
function makeSnowflake(seq = 0) {
  const epoch = 1420070400000n;
  const now = BigInt(Date.now());
  return (((now - epoch) << 22n) | BigInt(seq)).toString();
}

async function run() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('       🛡️  AEGIS PROTOCOL — DISCORD SERVER PROVISIONER        ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Verify Bot Identity
  console.log('⏳ Connecting to Discord Gateway REST API...');
  const botUser = await discordFetch('/users/@me');
  console.log(`✓ Authenticated as: ${botUser.username}#${botUser.discriminator} (ID: ${botUser.id})\n`);

  // 2. Locate Target Server
  const guilds = await discordFetch('/users/@me/guilds');
  if (!guilds || guilds.length === 0) {
    console.error('❌ The bot is not in any Discord servers yet!');
    console.error('Please invite the bot to your server first using OAuth2 URL:');
    console.error(`https://discord.com/oauth2/authorize?client_id=${botUser.id}&permissions=8&scope=bot%20applications.commands`);
    process.exit(1);
  }

  let guild = guilds[0];
  if (TARGET_GUILD_ID) {
    guild = guilds.find(g => g.id === TARGET_GUILD_ID) || guild;
  } else if (guilds.length > 1) {
    const aegisGuild = guilds.find(g => g.name.toLowerCase().includes('aegis'));
    if (aegisGuild) guild = aegisGuild;
  }

  console.log(`🎯 Target Server: "${guild.name}" (ID: ${guild.id})\n`);

  // 3. Create & Sync Brand Roles with Permission Bitmasks
  console.log('🛠️ Configuring Brand Roles & Bitmask Permissions...');
  
  // Administrator bitmask (Bot, Founder, AEGIS Core Team)
  const ADMIN_ROOT = '8';

  // Admin (Community Admin): Manage Channels (16), Kick (2), Ban (4), View Audit (128),
  // Manage Messages (8192), Nicknames (134217728), Threads (17179869184), Timeout (1099511627776), Standard (17196602330)
  const ADMIN_COMMUNITY = (
    16n | 2n | 4n | 128n | 8192n | 134217728n | 17179869184n | 1099511627776n |
    1024n | 2048n | 16384n | 32768n | 65536n | 262144n | 64n | 1048576n | 2097152n | (1n << 38n)
  ).toString();

  // Moderator: Kick (2), Manage Messages (8192), Mute (4194304), Deafen (8388608), Move (16777216), Timeout (1099511627776), Standard
  const MODERATOR_PERMS = (
    2n | 8192n | 4194304n | 8388608n | 16777216n | 1099511627776n |
    1024n | 2048n | 16384n | 32768n | 65536n | 262144n | 64n | 1048576n | 2097152n | (1n << 38n)
  ).toString();

  const rolesToCreate = [
    { name: 'Founder', color: BRAND_COLORS.VIOLET, hoist: true, mentionable: true, permissions: ADMIN_ROOT },
    { name: 'AEGIS Core Team', color: BRAND_COLORS.VIOLET, hoist: true, mentionable: true, permissions: ADMIN_ROOT },
    { name: 'Admin', color: BRAND_COLORS.TEAL, hoist: true, mentionable: true, permissions: ADMIN_COMMUNITY },
    { name: 'Moderator', color: BRAND_COLORS.AMBER, hoist: true, mentionable: true, permissions: MODERATOR_PERMS },
    { name: 'Keeper Sentinel', color: BRAND_COLORS.TEAL, hoist: true, mentionable: false },
    { name: 'Alpha Trader', color: BRAND_COLORS.AMBER, hoist: true, mentionable: false },
    { name: 'Elysium Explorer', color: BRAND_COLORS.MINT, hoist: true, mentionable: false },
    { name: 'Verified Member', color: 0xE8ECF8, hoist: false, mentionable: false }
  ];

  const existingRoles = await discordFetch(`/guilds/${guild.id}/roles`);
  const createdRoles = {};

  for (const r of rolesToCreate) {
    const found = existingRoles.find(er => er.name.toLowerCase() === r.name.toLowerCase());
    if (found) {
      console.log(`  ✓ Role exists: ${r.name}`);
      createdRoles[r.name] = found;
      if (r.permissions && found.permissions !== r.permissions) {
        await discordFetch(`/guilds/${guild.id}/roles/${found.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ permissions: r.permissions })
        });
        console.log(`    ↳ Updated permissions for ${r.name} to ${r.permissions}`);
      }
    } else {
      const newRole = await discordFetch(`/guilds/${guild.id}/roles`, {
        method: 'POST',
        body: JSON.stringify({
          name: r.name,
          color: r.color,
          hoist: r.hoist,
          mentionable: r.mentionable,
          permissions: r.permissions || '0'
        })
      });
      console.log(`  + Created role: ${r.name}`);
      createdRoles[r.name] = newRole;
      await sleep(350);
    }
  }

  // 4. Create Categories and Channels
  console.log('\n🏛️ Setting Up Categories and Channels...');
  const channelStructure = [
    {
      category: '📢 ︱ INFORMATION',
      channels: [
        { name: '👋︱start-here', type: 0, topic: 'Official AEGIS onboarding guide, community tag adoption, and essential verified links.' },
        { name: '🏛︱rules-and-security', type: 0, topic: 'Official AEGIS protocol guidelines, safety practices, and security disclosures.' },
        { name: '🔗︱official-links', type: 0, topic: 'Verified official contracts, live terminal, GitHub, and Elysium L2 endpoints.' },
        { name: '📢︱announcements', type: 0, topic: 'Protocol releases, testnet milestones, and keeper updates.' }
      ]
    },
    {
      category: '🛠️ ︱ SUPPORT & TICKETS',
      channels: [
        { name: '🎫︱open-a-ticket', type: 0, topic: 'Official AEGIS support helpdesk. Select Bug Report, Complaint, or Other Reason.' }
      ]
    },
    {
      category: '🛡️ ︱ PROTOCOL & TRADING',
      channels: [
        { name: '💻︱terminal-chat', type: 0, topic: 'Live terminal discussion, dual-engine charting, and position simulation.' },
        { name: '⚡︱alpha-strategies', type: 0, topic: 'Autonomous delta-hedging strategies, funding rate arbitrage, and liquidation risk models.' },
        { name: '🐞︱bug-reports', type: 0, topic: 'Testnet bug submissions, keeper execution logs, and UI feedback.' },
        { name: '💧︱faucet-and-gas', type: 0, topic: 'Elysium L2 testnet faucet claiming & micro-collateral testing.' }
      ]
    },
    {
      category: '🤖 ︱ LIVE SENTINEL FEEDS',
      channels: [
        { name: '🚨︱sentinel-alerts', type: 0, topic: 'Real-time autonomous delta-hedge triggers, liquidation defense logs, and keeper telemetry.' },
        { name: '📊︱market-telemetry', type: 0, topic: 'Live HyperCore mark prices, funding rate monitors, and liquidation distance telemetry.' }
      ]
    },
    {
      category: '💬 ︱ COMMUNITY',
      channels: [
        { name: '💬︱general', type: 0, topic: 'Community discussion about AEGIS Protocol and decentralized risk sentinel systems.' },
        { name: '🧠︱memes-and-media', type: 0, topic: 'Community art, terminal screenshots, and memes.' }
      ]
    },
    {
      category: '🔊 ︱ VOICE LOUNGES',
      channels: [
        { name: '🔊 ︱ Town Hall', type: 2 },
        { name: '🔊 ︱ Trader War Room', type: 2 }
      ]
    }
  ];

  const existingChannels = await discordFetch(`/guilds/${guild.id}/channels`);
  let alertChannelId = null;
  let rulesChannelId = null;
  let linksChannelId = null;
  let startHereChannelId = null;
  let ticketChannelId = null;

  for (const group of channelStructure) {
    let parentCategory = existingChannels.find(c => c.type === 4 && c.name.toLowerCase() === group.category.toLowerCase());
    if (!parentCategory) {
      parentCategory = await discordFetch(`/guilds/${guild.id}/channels`, {
        method: 'POST',
        body: JSON.stringify({ name: group.category, type: 4 })
      });
      console.log(`  📁 Created category: ${group.category}`);
      await sleep(400);
    } else {
      console.log(`  ✓ Category exists: ${group.category}`);
    }

    for (const ch of group.channels) {
      let existingCh = existingChannels.find(c => c.name.toLowerCase() === ch.name.toLowerCase() && c.parent_id === parentCategory.id);
      if (!existingCh) {
        existingCh = await discordFetch(`/guilds/${guild.id}/channels`, {
          method: 'POST',
          body: JSON.stringify({
            name: ch.name,
            type: ch.type,
            parent_id: parentCategory.id,
            topic: ch.topic || ''
          })
        });
        console.log(`    + Created channel: #${ch.name}`);
        await sleep(350);
      } else {
        console.log(`    ✓ Channel exists: #${ch.name}`);
      }

      if (ch.name.includes('sentinel-alerts')) alertChannelId = existingCh.id;
      if (ch.name.includes('rules-and-security')) rulesChannelId = existingCh.id;
      if (ch.name.includes('official-links')) linksChannelId = existingCh.id;
      if (ch.name.includes('start-here')) startHereChannelId = existingCh.id;
      if (ch.name.includes('open-a-ticket')) ticketChannelId = existingCh.id;
    }
  }

  // 5. Create Webhook in #sentinel-alerts for Automated Keeper Alerts
  let webhookUrl = null;
  if (alertChannelId) {
    console.log('\n⚡ Setting Up Automated Sentinel Webhook...');
    const webhooks = await discordFetch(`/channels/${alertChannelId}/webhooks`);
    let alertWebhook = webhooks && webhooks.find(w => w.name.includes('AEGIS'));
    if (!alertWebhook) {
      alertWebhook = await discordFetch(`/channels/${alertChannelId}/webhooks`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'AEGIS Sentinel Sentinel Bot'
        })
      });
      console.log('  ✓ Webhook created: AEGIS Sentinel Sentinel Bot');
    } else {
      console.log('  ✓ Webhook already active');
    }

    if (alertWebhook && alertWebhook.token) {
      webhookUrl = `https://discord.com/api/webhooks/${alertWebhook.id}/${alertWebhook.token}`;
      const keeperDir = path.join(__dirname, '..', 'keeper');
      const webhookFile = path.join(keeperDir, 'discord_webhook.json');
      fs.writeFileSync(webhookFile, JSON.stringify({ webhookUrl, channelId: alertChannelId }, null, 2));
      console.log(`  💾 Webhook URL saved to: ${webhookFile}`);
    }
  }

  // 6. Post Polished Embeds
  console.log('\n📜 Posting & Verifying Embeds...');
  
  // Onboarding Embed in #👋︱start-here
  if (startHereChannelId) {
    const existingMsgs = await discordFetch(`/channels/${startHereChannelId}/messages?limit=5`);
    if (!existingMsgs || existingMsgs.length === 0) {
      await discordFetch(`/channels/${startHereChannelId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          embeds: [{
            title: `${AEGIS_EMOJI} Welcome to AEGIS Protocol — Onboarding Session`,
            description: 'Welcome to the official **AEGIS Protocol** community! AEGIS is an autonomous, high-frequency risk sentinel engineered for **Elysium L2** and the **HyperCore CLOB**, eliminating forced liquidations via sub-second intent-lane hedging.\n\nComplete this quick onboarding session to get started and verify your channels:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            color: BRAND_COLORS.VIOLET,
            fields: [
              {
                name: '1️⃣ Step 1: Adopt the Server Tag (| AEGIS)',
                value: 'Show your allegiance to autonomous risk defense! Add **`| AEGIS`** to your server nickname or bio (e.g. `0xSatoshi | AEGIS` or `TraderJoe | AEGIS`).\n*(Right-click server icon > Edit Server Profile > Server Nickname)*',
                inline: false
              },
              {
                name: '2️⃣ Step 2: Choose Your Protocol Focus & Roles',
                value: 'Select your focus area to access dedicated alpha feeds:\n• **⚡ Alpha Trader** — Delta-neutral hedging, high-frequency execution & funding arbitrage (<#1559358300942762125>, <#1559358304122183800>)\n• **🤖 Keeper Sentinel** — Run autonomous keeper bots & monitor liquidation invariant INV-1 (<#1559358318764495022>, <#1559358322120069201>)\n• **🔬 Elysium Explorer** — Smart contract testing, testnet faucet claiming & testnet debugging (<#1559358310820487278>, <#1559358307238678639>)',
                inline: false
              },
              {
                name: '3️⃣ Step 3: Security & Anti-Phishing Verification',
                value: '• Read the official server guidelines in <#1559358285314916376>.\n• **Zero DM Tolerance:** AEGIS Core Team will **NEVER** DM you first or ask for private keys, seed phrases, or wallet approvals.\n• Always verify official links in <#1559358288397733888>.',
                inline: false
              },
              {
                name: '4️⃣ Step 4: Essential Links & Testnet Terminal',
                value: '• **Web Terminal:** [aegis.terminall.workers.dev/access](https://aegis.terminall.workers.dev/access)\n• **Official Docs:** [aegis.terminall.workers.dev/docs](https://aegis.terminall.workers.dev/docs/)\n• **Elysium Testnet Faucet:** [Claim Testnet HYPE](https://elysium.kinetiq.xyz/testnet-faucet)',
                inline: false
              }
            ],
            footer: {
              text: 'AEGIS Protocol Invariant INV-1 — Autonomous Liquidation Defense | Chain ID: 99801'
            }
          }],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 5,
                  label: 'Launch Terminal',
                  url: 'https://aegis.terminall.workers.dev/access',
                  emoji: { name: '⚡' }
                },
                {
                  type: 2,
                  style: 5,
                  label: 'Technical Docs',
                  url: 'https://aegis.terminall.workers.dev/docs/',
                  emoji: { name: '📜' }
                },
                {
                  type: 2,
                  style: 5,
                  label: 'Testnet Faucet',
                  url: 'https://elysium.kinetiq.xyz/testnet-faucet',
                  emoji: { name: '💧' }
                },
                {
                  type: 2,
                  style: 5,
                  label: 'Official 𝕏',
                  url: 'https://x.com/aegis_hedge?s=20'
                }
              ]
            }
          ]
        })
      });
      console.log('  ✓ Posted onboarding session embed to #👋︱start-here');
      await sleep(350);
    }
  }

  // Interactive Ticket Desk in #🎫︱open-a-ticket
  if (ticketChannelId) {
    const existingMsgs = await discordFetch(`/channels/${ticketChannelId}/messages?limit=5`);
    if (!existingMsgs || existingMsgs.length === 0) {
      await discordFetch(`/channels/${ticketChannelId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          embeds: [{
            title: `${AEGIS_EMOJI} AEGIS Protocol — Support Helpdesk`,
            description: 'Welcome to the official **AEGIS Protocol Support Helpdesk**.\nNeed assistance, spotted a testnet vulnerability, have an account dispute, or want to connect with the team? Select a ticket category below to open a private ticket.\n\n**Available Ticket Categories:**\n• 🐞 **Bug Report Ticket** — Smart contract reverts, terminal latency/UI glitches, keeper execution anomalies, testnet RPC issues.\n• ⚠️ **Complaint / Account Ticket** — Terminal access code issues, wallet connectivity disputes, trade discrepancies, service feedback.\n• 🤝 **Other Reason Ticket** — Strategic partnerships, grants, security vulnerability disclosures, institutional inquiries.\n\n*Click a button or choose from the dropdown below to create your private ticket.*',
            color: BRAND_COLORS.TEAL,
            footer: {
              text: 'AEGIS Support Sentinel — Confidential, Non-Custodial, Rapid Resolution'
            }
          }],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 3,
                  custom_id: 'ticket_select_category',
                  placeholder: 'Choose ticket reason...',
                  options: [
                    {
                      label: 'Bug Report Ticket',
                      value: 'ticket_bug',
                      description: 'Report UI glitches, contract reverts, or keeper execution errors',
                      emoji: { name: '🐞' }
                    },
                    {
                      label: 'Complaint / Account Ticket',
                      value: 'ticket_complaint',
                      description: 'Account disputes, access code questions, or protocol complaints',
                      emoji: { name: '⚠️' }
                    },
                    {
                      label: 'Other Reason Ticket',
                      value: 'ticket_other',
                      description: 'Strategic partnerships, security disclosures, or general inquiries',
                      emoji: { name: '🤝' }
                    }
                  ]
                }
              ]
            },
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 4, // Danger / Red
                  label: 'Bug Report',
                  custom_id: 'btn_ticket_bug',
                  emoji: { name: '🐞' }
                },
                {
                  type: 2,
                  style: 2, // Secondary / Grey
                  label: 'Complaint',
                  custom_id: 'btn_ticket_complaint',
                  emoji: { name: '⚠️' }
                },
                {
                  type: 2,
                  style: 1, // Primary / Blurple
                  label: 'Other Reason',
                  custom_id: 'btn_ticket_other',
                  emoji: { name: '🤝' }
                }
              ]
            }
          ]
        })
      });
      console.log('  ✓ Posted interactive ticket panel to #🎫︱open-a-ticket');
      await sleep(350);
    }
  }

  // 7. Enforce Read-Only Channel Permissions for @everyone & Role Overrides
  console.log('\n🔒 Enforcing Permissions & Channel Overrides...');
  const denyBitmask = (
    BigInt(2048) | 
    (BigInt(1) << 35n) | 
    (BigInt(1) << 36n) | 
    (BigInt(1) << 38n)
  ).toString();

  const readOnlyChannels = [
    'start-here',
    'rules-and-security',
    'official-links',
    'announcements',
    'sentinel-alerts',
    'market-telemetry'
  ];

  for (const nameFrag of readOnlyChannels) {
    const ch = existingChannels.find(c => c.name.includes(nameFrag));
    if (ch) {
      await discordFetch(`/channels/${ch.id}/permissions/${guild.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          id: guild.id,
          type: 0,
          allow: (1024n | 65536n).toString(),
          deny: denyBitmask
        })
      });
      console.log(`  🔒 Set read-only: #${ch.name}`);
      await sleep(250);
    }
  }

  // Set Overrides on #🎫︱open-a-ticket
  if (ticketChannelId && createdRoles['Admin'] && createdRoles['Moderator']) {
    const adminRoleId = createdRoles['Admin'].id;
    const modRoleId = createdRoles['Moderator'].id;

    // @everyone: view, read history, allow send in threads, deny send in root channel
    await discordFetch(`/channels/${ticketChannelId}/permissions/${guild.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        id: guild.id,
        type: 0,
        allow: (1024n | 65536n | (1n << 38n)).toString(),
        deny: (2048n | (1n << 35n)).toString()
      })
    });

    // Admin override
    await discordFetch(`/channels/${ticketChannelId}/permissions/${adminRoleId}`, {
      method: 'PUT',
      body: JSON.stringify({
        id: adminRoleId,
        type: 0,
        allow: (1024n | 2048n | 8192n | 17179869184n | 65536n | 16384n | 32768n | (1n << 38n)).toString(),
        deny: '0'
      })
    });

    // Moderator override
    await discordFetch(`/channels/${ticketChannelId}/permissions/${modRoleId}`, {
      method: 'PUT',
      body: JSON.stringify({
        id: modRoleId,
        type: 0,
        allow: (1024n | 2048n | 8192n | 65536n | 16384n | 32768n | (1n << 38n)).toString(),
        deny: '0'
      })
    });
    console.log('  🔒 Configured role overrides for #🎫︱open-a-ticket');
  }

  // 8. Configure Native Community Onboarding Prompts via API
  console.log('\n⚙️ Configuring Discord Native Onboarding Prompts...');
  try {
    const p1 = makeSnowflake(1);
    const p2 = makeSnowflake(2);
    const opt1 = makeSnowflake(10);
    const opt2 = makeSnowflake(11);
    const opt3 = makeSnowflake(12);
    const opt4 = makeSnowflake(20);
    const opt5 = makeSnowflake(21);

    await discordFetch(`/guilds/${guild.id}/onboarding`, {
      method: 'PUT',
      body: JSON.stringify({
        prompts: [
          {
            id: p1,
            title: 'What is your primary focus in AEGIS Protocol?',
            single_select: true,
            required: true,
            in_onboarding: true,
            type: 0,
            options: [
              {
                id: opt1,
                title: 'Alpha Trader',
                description: 'Delta-neutral hedging, high-frequency execution & funding arbitrage',
                role_ids: createdRoles['Alpha Trader'] ? [createdRoles['Alpha Trader'].id] : [],
                channel_ids: []
              },
              {
                id: opt2,
                title: 'Keeper Sentinel',
                description: 'Running autonomous keeper bots & monitoring liquidation invariant INV-1',
                role_ids: createdRoles['Keeper Sentinel'] ? [createdRoles['Keeper Sentinel'].id] : [],
                channel_ids: []
              },
              {
                id: opt3,
                title: 'Elysium Explorer',
                description: 'Testing smart contracts on Elysium L2 testnet & claiming faucet gas',
                role_ids: createdRoles['Elysium Explorer'] ? [createdRoles['Elysium Explorer'].id] : [],
                channel_ids: []
              }
            ]
          },
          {
            id: p2,
            title: 'Will you represent AEGIS by adopting the community tag in your nickname?',
            single_select: true,
            required: false,
            in_onboarding: true,
            type: 0,
            options: [
              {
                id: opt4,
                title: 'Yes! I will add | AEGIS to my nickname',
                description: 'Wear the tag (e.g. Satoshi | AEGIS) to support the protocol',
                role_ids: createdRoles['Verified Member'] ? [createdRoles['Verified Member'].id] : [],
                channel_ids: []
              },
              {
                id: opt5,
                title: 'Browsing for now',
                description: 'Inspect the protocol, testnet, and documentation first',
                role_ids: createdRoles['Verified Member'] ? [createdRoles['Verified Member'].id] : [],
                channel_ids: []
              }
            ]
          }
        ],
        default_channel_ids: [
          rulesChannelId,
          linksChannelId,
          startHereChannelId
        ].filter(Boolean),
        enabled: false,
        mode: 0
      })
    });
    console.log('  ✓ Saved Discord native onboarding questionnaire');
  } catch (err) {
    console.log('  ⚠️ Note on native onboarding:', err.message);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('       🎉  AEGIS DISCORD SERVER SUCCESSFULLY BUILT!           ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  if (webhookUrl) {
    console.log(`📡 Keeper Webhook Ready: ${webhookUrl}\n`);
  }
}

run().catch(err => {
  console.error('\n❌ Setup failed:', err);
  process.exit(1);
});
