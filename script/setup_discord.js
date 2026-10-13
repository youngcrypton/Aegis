/**
 * AEGIS Protocol — Discord Server Automated Architect & Sentinel Setup
 * 
 * Usage:
 *   node script/setup_discord.js <BOT_TOKEN> [GUILD_ID]
 * 
 * Features:
 *   1. Authenticates bot and detects target server.
 *   2. Creates brand-coded roles (AEGIS Core Team, Keeper Sentinel, Alpha Trader, etc.)
 *   3. Creates full professional categories and channels with channel topics.
 *   4. Generates an automated Webhook for live keeper alerts in #sentinel-alerts.
 *   5. Dispatches official initial welcome & security embeds using AEGIS Brand Kit colors.
 *   6. Saves the live webhook URL to keeper/discord_webhook.json for keeper integration.
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
  DARK: 0x1C2238      // #1C2238
};

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
    console.error('Please invite the bot to your server first using the OAuth2 URL Generator:');
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

  // 3. Create Brand Roles
  console.log('🛠️ Creating Brand-Coded Roles...');
  const rolesToCreate = [
    { name: 'Founder', color: BRAND_COLORS.VIOLET, hoist: true, mentionable: true, permissions: '8' },
    { name: 'Admin', color: BRAND_COLORS.TEAL, hoist: true, mentionable: true, permissions: '8' },
    { name: 'Moderator', color: BRAND_COLORS.AMBER, hoist: true, mentionable: true, permissions: '1099511627776' },
    { name: 'AEGIS Core Team', color: BRAND_COLORS.VIOLET, hoist: true, mentionable: true },
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
    } else {
      const newRole = await discordFetch(`/guilds/${guild.id}/roles`, {
        method: 'POST',
        body: JSON.stringify({
          name: r.name,
          color: r.color,
          hoist: r.hoist,
          mentionable: r.mentionable
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
        { name: '🏛︱rules-and-security', type: 0, topic: 'Official AEGIS protocol guidelines, safety practices, and security disclosures.' },
        { name: '🔗︱official-links', type: 0, topic: 'Verified official contracts, live terminal, GitHub, and Elysium L2 endpoints.' },
        { name: '📢︱announcements', type: 0, topic: 'Protocol releases, testnet milestones, and keeper updates.' }
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
      
      // Save webhook to keeper configuration
      const keeperDir = path.join(__dirname, '..', 'keeper');
      const webhookFile = path.join(keeperDir, 'discord_webhook.json');
      fs.writeFileSync(webhookFile, JSON.stringify({ webhookUrl, channelId: alertChannelId }, null, 2));
      console.log(`  💾 Webhook URL saved to: ${webhookFile}`);
    }
  }

  // 6. Post Polished Starter Embeds
  console.log('\n📜 Posting Initial Welcome & Information Embeds...');
  
  // Rules Embed
  if (rulesChannelId) {
    await discordFetch(`/channels/${rulesChannelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        embeds: [{
          title: '🏛️ AEGIS Protocol — Official Server Guidelines',
          description: 'Welcome to the official **AEGIS Protocol** community! AEGIS is an autonomous, non-custodial risk sentinel built for **Elysium L2** and the **HyperCore L1 CLOB**, preventing forced liquidations via sub-second intent-lane hedging.',
          color: BRAND_COLORS.VIOLET,
          fields: [
            { name: '1. No DM Solicitation / Zero Impersonation', value: 'Team members will **NEVER** DM you first or ask for your private key, seed phrase, or funds.' },
            { name: '2. Security First', value: 'Only click links posted in <#' + linksChannelId + '>. Verify all contract addresses against official documentation.' },
            { name: '3. Technical & Product Feedback', value: 'Share issues in `#bug-reports` with tx hashes, console outputs, and browser details.' },
            { name: '4. Respect & Alpha', value: 'Constructive discussion only. FUD without math and toxic behavior will result in an immediate timeout or ban.' }
          ],
          footer: { text: 'AEGIS Protocol Invariant INV-1 — Autonomous Liquidation Defense' }
        }]
      })
    });
    console.log('  ✓ Posted rules embed to #rules-and-security');
    await sleep(400);
  }

  // Official Links Embed
  if (linksChannelId) {
    await discordFetch(`/channels/${linksChannelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        embeds: [{
          title: '🔗 AEGIS Protocol — Official Verified Links',
          description: 'Always bookmark and verify these links to protect yourself from impersonation scams.',
          color: BRAND_COLORS.TEAL,
          fields: [
            { name: '𝕏 (Official Twitter)', value: '[x.com/aegis_hedge](https://x.com/aegis_hedge?s=20)', inline: false },
            { name: '🌐 Official Website', value: '[aegis.terminall.workers.dev](https://aegis.terminall.workers.dev/)', inline: false },
            { name: '⚡ Pro-Trader Terminal', value: '[Terminal Access Gate](https://aegis.terminall.workers.dev/access)', inline: false },
            { name: '📜 Protocol Documentation', value: '[Official Technical Docs](https://aegis.terminall.workers.dev/docs/)', inline: false },
            { name: '💻 GitHub Open Source', value: '[youngcrypton/Aegis](https://github.com/youngcrypton/Aegis)', inline: false },
            { name: '💧 Elysium Testnet Faucet', value: '[Claim Testnet HYPE](https://elysium.kinetiq.xyz/testnet-faucet)', inline: false },
            { name: '🔍 Elysium L2 Explorer', value: '[Kinetiq Testnet Explorer](https://elysium.kinetiq.xyz/testnet-explorer)', inline: false }
          ],
          footer: { text: 'AEGIS Protocol Invariant INV-1 | Elysium L2 (Chain ID 99801) & HyperCore' }
        }]
      })
    });
    console.log('  ✓ Posted verified links to #official-links');
    await sleep(400);
  }

  // 7. Enforce Read-Only Channel Permissions for @everyone
  console.log('\n🔒 Enforcing Read-Only Permissions for @everyone on Information & Feeds...');
  const denyBitmask = (
    BigInt(2048) | 
    (BigInt(1) << 35n) | 
    (BigInt(1) << 36n) | 
    (BigInt(1) << 38n)
  ).toString();

  const readOnlyChannels = [
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
          allow: '0',
          deny: denyBitmask
        })
      });
      console.log(`  🔒 Set read-only: #${ch.name}`);
      await sleep(300);
    }
  }

  // Sentinel Alerts Starter Embed via Webhook
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '🛡️ AEGIS Sentinel Defense Engine — Online & Armed',
          description: 'Live testnet telemetry channel initialized. When keeper bots detect positions approaching liquidation health factor thresholds, autonomous delta-hedges will stream directly to this feed.',
          color: BRAND_COLORS.MINT,
          fields: [
            { name: 'Status', value: '🟢 Active & Monitoring', inline: true },
            { name: 'Execution Latency', value: '⚡ < 200ms', inline: true },
            { name: 'Collateral Safety', value: '🔒 Invariant INV-1 Guarded', inline: true }
          ],
          footer: { text: 'Elysium Testnet Sentinel Feed' }
        }]
      })
    });
    console.log('  ✓ Dispatched inaugural alert to #sentinel-alerts via Webhook');
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
