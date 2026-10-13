/**
 * AEGIS Protocol — Discord Live Sentinel Bot & Ticket Daemon
 * 
 * Usage:
 *   node script/discord_sentinel_bot.js <BOT_TOKEN> [GUILD_ID]
 *   Or with environment variable:
 *   DISCORD_BOT_TOKEN=your_token node script/discord_sentinel_bot.js
 * 
 * Features:
 *   1. Connects to Discord Gateway WebSocket with real-time heartbeating.
 *   2. Listens for ticket interaction events from #🎫︱open-a-ticket.
 *   3. Dispatches private ticket threads for:
 *      - 🐞 Bug Report Ticket
 *      - ⚠️ Complaint / Account Dispute Ticket
 *      - 🤝 Other Reason / Partnership Ticket
 *   4. Pings user, @AEGIS Core Team, and @Admin inside the private thread with tailored instructions.
 *   5. Supports interactive [🔒 Close Ticket] button with auto-archival.
 */

const BOT_TOKEN = process.argv[2] || process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.argv[3] || process.env.DISCORD_GUILD_ID || '1559355699140628541';

if (!BOT_TOKEN) {
  console.error('\n❌ ERROR: Missing Discord Bot Token!');
  console.log('Usage: node script/discord_sentinel_bot.js <BOT_TOKEN> [GUILD_ID]\n');
  process.exit(1);
}

const API_BASE = 'https://discord.com/api/v10';
const HEADERS = {
  'Authorization': `Bot ${BOT_TOKEN.trim()}`,
  'Content-Type': 'application/json'
};

const BRAND_COLORS = {
  VIOLET: 0x6930EA,
  TEAL: 0x07705F,
  AMBER: 0xFFBE7A,
  RED: 0xEA3943
};

async function discordFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, { headers: HEADERS, ...options });
  if (res.status === 429) {
    const data = await res.json();
    const wait = (data.retry_after || 1) * 1000;
    await new Promise(r => setTimeout(r, wait));
    return discordFetch(endpoint, options);
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Discord API ${res.status} on ${endpoint}: ${err}`);
  }
  if (res.status === 204) return null;
  return await res.json();
}

async function respondInteraction(interactionId, interactionToken, responseData) {
  return await fetch(`${API_BASE}/interactions/${interactionId}/${interactionToken}/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(responseData)
  });
}

function startGateway() {
  console.log('🔌 Connecting to Discord Gateway via WebSocket...');
  const ws = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json');

  let heartbeatInterval = null;
  let lastSeq = null;

  ws.addEventListener('open', () => {
    console.log('✓ WebSocket connected to Discord Gateway.');
  });

  ws.addEventListener('message', async (event) => {
    try {
      const payload = JSON.parse(event.data.toString());
      const { t, s, op, d } = payload;
      if (s) lastSeq = s;

      // Opcode 10: Hello
      if (op === 10) {
        const interval = d.heartbeat_interval;
        console.log(`✓ Gateway Hello received. Heartbeat interval: ${interval}ms`);
        heartbeatInterval = setInterval(() => {
          ws.send(JSON.stringify({ op: 1, d: lastSeq }));
        }, interval);

        // Send Opcode 2: Identify
        ws.send(JSON.stringify({
          op: 2,
          d: {
            token: BOT_TOKEN.trim(),
            intents: 1 | (1 << 9) | (1 << 15), // GUILDS, GUILD_MESSAGES, MESSAGE_CONTENT
            properties: {
              os: 'windows',
              browser: 'aegis-sentinel',
              device: 'aegis-sentinel'
            }
          }
        }));
      }

      // Dispatch Events
      if (t === 'READY') {
        console.log(`🤖 Sentinel Bot READY as ${d.user.username}#${d.user.discriminator} (ID: ${d.user.id})`);
        console.log(`🛡️ Monitoring Guild: ${GUILD_ID}`);
      }

      // Handle Interactions (Buttons & Select Menus)
      if (t === 'INTERACTION_CREATE') {
        await handleInteraction(d);
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.addEventListener('close', (event) => {
    console.log(`⚠️ WebSocket closed (${event.code}: ${event.reason}). Reconnecting in 5s...`);
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    setTimeout(startGateway, 5000);
  });

  ws.addEventListener('error', (err) => {
    console.error('WebSocket error:', err);
  });
}

async function handleInteraction(interaction) {
  const { id, token, data, member, channel_id } = interaction;
  const user = member?.user;
  const username = user?.username || 'member';
  const customId = data?.custom_id;
  const selectedValues = data?.values || [];

  console.log(`\n📨 Interaction from @${username}: custom_id="${customId}", values=${JSON.stringify(selectedValues)}`);

  // 1. Ticket Close Button
  if (customId === 'btn_close_ticket') {
    await respondInteraction(id, token, {
      type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
      data: {
        embeds: [{
          title: '🔒 Ticket Closed',
          description: `This ticket has been marked resolved and closed by <@${user.id}>.\nArchiving thread in 5 seconds...`,
          color: BRAND_COLORS.AMBER
        }]
      }
    });

    setTimeout(async () => {
      try {
        await discordFetch(`/channels/${channel_id}`, {
          method: 'PATCH',
          body: JSON.stringify({ archived: true, locked: true })
        });
      } catch (e) {
        console.error('Error archiving thread:', e);
      }
    }, 5000);
    return;
  }

  // 2. Ticket Creation Triggers
  let ticketType = null;
  let ticketTitle = '';
  let ticketDesc = '';
  let ticketColor = BRAND_COLORS.TEAL;

  if (customId === 'btn_ticket_bug' || (customId === 'ticket_select_category' && selectedValues.includes('ticket_bug'))) {
    ticketType = 'bug';
    ticketTitle = '🐞 Bug Report Ticket';
    ticketColor = BRAND_COLORS.RED;
    ticketDesc = `👋 Welcome <@${user.id}>!\nThank you for submitting a **Bug Report**.\n\nTo help the AEGIS Core Team diagnose and patch this quickly, please reply in this private thread with:\n• **1. Issue Description:** What happened vs what did you expect?\n• **2. Transaction Hash:** (if interacting on Elysium L2 testnet)\n• **3. Environment:** Browser & connected wallet\n• **4. Error Details:** Screenshots or console logs (F12 DevTools)\n\nAn AEGIS engineer will review your report shortly.`;
  } else if (customId === 'btn_ticket_complaint' || (customId === 'ticket_select_category' && selectedValues.includes('ticket_complaint'))) {
    ticketType = 'complaint';
    ticketTitle = '⚠️ Complaint / Account Dispute Ticket';
    ticketColor = BRAND_COLORS.AMBER;
    ticketDesc = `👋 Welcome <@${user.id}>!\nThank you for reaching out to the AEGIS Helpdesk.\n\nPlease describe your complaint or dispute in detail:\n• **1. Summary of Dispute:** What issue occurred?\n• **2. Account Information:** Connected wallet address or terminal access code (⚠️ *NEVER share private keys or seed phrases!*)\n• **3. Desired Resolution:** What outcome are you seeking?\n\nA Community Administrator will assist you shortly.`;
  } else if (customId === 'btn_ticket_other' || (customId === 'ticket_select_category' && selectedValues.includes('ticket_other'))) {
    ticketType = 'general';
    ticketTitle = '🤝 General Inquiry & Partnership Ticket';
    ticketColor = BRAND_COLORS.VIOLET;
    ticketDesc = `👋 Welcome <@${user.id}>!\nThank you for contacting AEGIS Protocol.\n\nPlease explain the nature of your inquiry:\n• **Partnership & Grants**\n• **Security Vulnerability Disclosures**\n• **General Protocol Questions**\n\nA Core Team representative will respond as soon as possible.`;
  }

  if (ticketType) {
    try {
      // Find Ticket Channel ID
      const ticketChannelId = channel_id;
      const threadName = `ticket-${ticketType}-${username}`.substring(0, 32);

      // Create Private Thread in the ticket channel
      const thread = await discordFetch(`/channels/${ticketChannelId}/threads`, {
        method: 'POST',
        body: JSON.stringify({
          name: threadName,
          type: 12, // Private Thread
          invitable: false,
          auto_archive_duration: 1440 // 24 hours
        })
      });

      console.log(`  + Created ticket thread: #${thread.name} (ID: ${thread.id})`);

      // Add user to the private thread
      await discordFetch(`/channels/${thread.id}/thread-members/${user.id}`, {
        method: 'PUT'
      });

      // Post initial ticket instruction message in the thread
      await discordFetch(`/channels/${thread.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: `<@${user.id}> <@&1559369081273057350> <@&1559369074600050708>`, // Ping user, Core Team, Admin
          embeds: [{
            title: `<:aegis:1559368274154627223> ${ticketTitle}`,
            description: ticketDesc,
            color: ticketColor,
            footer: { text: `Ticket ID: ${thread.id} | Opened by @${username}` }
          }],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 2, // Secondary
                  label: 'Close Ticket',
                  custom_id: 'btn_close_ticket',
                  emoji: { name: '🔒' }
                }
              ]
            }
          ]
        })
      });

      // Send ephemeral confirmation to user
      await respondInteraction(id, token, {
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          content: `🛡️ **Your ${ticketTitle} has been created:** <#${thread.id}>\nPlease jump into the thread to describe your request.`,
          flags: 64 // EPHEMERAL
        }
      });
      console.log(`  ✓ Dispatched ephemeral link to user for thread <#${thread.id}>`);
    } catch (err) {
      console.error('Error creating ticket thread:', err);
      await respondInteraction(id, token, {
        type: 4,
        data: {
          content: `❌ Could not create ticket thread. Please notify an administrator. (${err.message})`,
          flags: 64
        }
      });
    }
  }
}

startGateway();
