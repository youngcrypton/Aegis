/**
 * AEGIS Protocol — Discord Live Sentinel & Verification Bot Daemon
 * 
 * Usage:
 *   node script/discord_sentinel_bot.js [BOT_TOKEN] [GUILD_ID]
 *   Or with environment variables:
 *   npm run discord:bot
 * 
 * Features:
 *   1. Anti-Bot Verification Gate in #👋︱start-here:
 *      - Interactive modal challenge (randomized arithmetic e.g. "What is 2 + 2?")
 *      - Automatic assignment of "👤 Verified Member" role on correct answer
 *      - Ephemeral pass/fail feedback dialogs
 *      - Real-time verification status check button
 *   2. Support Helpdesk & Private Ticket Dispatcher (#🎫︱open-a-ticket):
 *      - 🐞 Bug Report Ticket
 *      - ⚠️ Complaint / Account Dispute Ticket
 *      - 🤝 General Inquiry / Partnership Ticket
 *      - Auto-ping Core Team & Admin, 1-click thread close & archival
 *   3. Always-Online Gateway Daemon:
 *      - Persistent WebSocket with auto-heartbeat and automatic exponential-backoff reconnect
 *      - Rich Presence: "Watching Invariant INV-1 | #start-here"
 *      - Uncaught exception shielding to guarantee continuous 24/7 uptime
 */

const fs = require('fs');
const path = require('path');

// Auto-load .env if available
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
} catch (e) {
  // Silent fallback
}

const BOT_TOKEN = process.argv[2] || process.env.DISCORD_BOT_TOKEN || '';
const GUILD_ID = process.argv[3] || process.env.DISCORD_GUILD_ID || '';

if (!BOT_TOKEN) {
  console.error('\n❌ ERROR: Missing Discord Bot Token!');
  console.log('Usage: node script/discord_sentinel_bot.js [BOT_TOKEN] [GUILD_ID]\n');
  process.exit(1);
}

const API_BASE = 'https://discord.com/api/v10';
const HEADERS = {
  'Authorization': `Bot ${BOT_TOKEN.trim()}`,
  'Content-Type': 'application/json'
};

// Target IDs
const START_HERE_CHANNEL_ID = '1559372117844168735';
const TICKET_CHANNEL_ID = '1559372121057140786';
const VERIFIED_ROLE_ID = '1559358277094084638';
const CORE_TEAM_ROLE_ID = '1559369081273057350';
const ADMIN_ROLE_ID = '1559369074600050708';

const BRAND_COLORS = {
  VIOLET: 0x6930EA,
  TEAL: 0x07705F,
  AMBER: 0xFFBE7A,
  RED: 0xEA3943,
  MINT: 0x5FD9BE
};

const AEGIS_EMOJI = '<:aegis:1559368274154627223>';

// Global Crash Guards — Keep bot online always
process.on('uncaughtException', (err) => {
  console.error('[FATAL CAUGHT] Uncaught Exception:', err.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[PROMISE REJECTION] Unhandled Rejection:', reason);
});

async function discordFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, { headers: HEADERS, ...options });
  if (res.status === 429) {
    const data = await res.json();
    const wait = (data.retry_after || 1) * 1000;
    console.log(` ⏳ Rate limit reached. Waiting ${wait}ms...`);
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
  const url = `${API_BASE}/interactions/${interactionId}/${interactionToken}/callback`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(responseData)
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`❌ respondInteraction failed (${res.status}) on ${interactionId}:`, errText);
  }
  return res;
}

const WORD_TO_NUMBER = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
  'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
  'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
  'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
  'eighteen': 18, 'nineteen': 19, 'twenty': 20,
  'twenty-one': 21, 'twenty-two': 22, 'twenty-three': 23, 'twenty-four': 24,
  'twenty-five': 25, 'twenty-six': 26, 'twenty-seven': 27, 'twenty-eight': 28,
  'twenty-nine': 29, 'thirty': 30
};

// Generate randomized human verification questions
function generateAntiBotChallenge() {
  const operations = ['+', '+', '-', 'x'];
  const op = operations[Math.floor(Math.random() * operations.length)];
  let a, b, answer;

  if (op === '+') {
    if (Math.random() < 0.25) {
      a = 2;
      b = 2; // "What is 2 + 2?"
    } else {
      a = Math.floor(Math.random() * 10) + 2;
      b = Math.floor(Math.random() * 10) + 2;
    }
    answer = a + b;
  } else if (op === '-') {
    b = Math.floor(Math.random() * 8) + 2;
    a = b + Math.floor(Math.random() * 8) + 1; // Guarantees positive answer
    answer = a - b;
  } else {
    a = Math.floor(Math.random() * 5) + 2;
    b = Math.floor(Math.random() * 4) + 2;
    answer = a * b;
  }

  const symbol = op === 'x' ? '×' : op;
  const question = `What is ${a} ${symbol} ${b}?`;
  return { question, answer: String(answer) };
}

// Ensure official Verification Gate card exists in #start-here
async function ensureVerificationPanel() {
  try {
    const messages = await discordFetch(`/channels/${START_HERE_CHANNEL_ID}/messages?limit=10`);
    const existingGate = messages && messages.find(m => 
      m.embeds?.some(e => e.title && e.title.includes('Human Verification Gate')) ||
      m.components?.some(row => row.components?.some(btn => btn.custom_id === 'btn_start_verification'))
    );

    if (existingGate) {
      console.log(`✓ Verification Gate panel is active in #start-here (Message ID: ${existingGate.id})`);
      return;
    }

    console.log('📌 Verification Gate panel not found in #start-here. Deploying official gate card...');
    const payload = {
      embeds: [
        {
          title: `${AEGIS_EMOJI} AEGIS Protocol — Human Verification Gate`,
          description: `Welcome to **AEGIS Protocol** — Autonomous Risk Sentinel on Elysium L2.\n\nTo safeguard our community against sybil bots, automated scrapers, and malicious spam, all incoming members must complete a quick anti-bot verification challenge to unlock server channels.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n### 🛡️ How to Verify:\n1️⃣ Click the **\`🛡️ Verify Humanity\`** button below.\n2️⃣ Solve the security arithmetic prompt (e.g. *What is 2 + 2?*).\n3️⃣ Enter your numeric answer and click **Submit**.\n\nUpon passing, the **\`👤 Verified Member\`** role will be granted instantly, unlocking all discussion lounges, live keeper feeds, and alpha channels.\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          color: BRAND_COLORS.VIOLET,
          fields: [
            {
              name: '🔒 Anti-Bot Protection',
              value: 'Random arithmetic challenge generated per-user. Zero cookies or external trackers required.',
              inline: true
            },
            {
              name: '⚡ Instant Access',
              value: 'Full member permissions granted immediately upon correct submission.',
              inline: true
            }
          ],
          footer: {
            text: 'AEGIS Protocol Invariant INV-1 • Autonomous Liquidation Defense'
          }
        }
      ],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 3, // Success / Green
              label: 'Verify Humanity',
              custom_id: 'btn_start_verification',
              emoji: { name: '🛡️' }
            },
            {
              type: 2,
              style: 2, // Secondary / Grey
              label: 'Check Status',
              custom_id: 'btn_verification_status',
              emoji: { name: 'ℹ️' }
            },
            {
              type: 2,
              style: 5, // Link
              label: 'Helpdesk Ticket',
              url: `https://discord.com/channels/${GUILD_ID}/${TICKET_CHANNEL_ID}`,
              emoji: { name: '🎫' }
            }
          ]
        }
      ]
    };

    const newMsg = await discordFetch(`/channels/${START_HERE_CHANNEL_ID}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    console.log(`✓ Verification Gate panel successfully deployed (Message ID: ${newMsg.id})`);
  } catch (err) {
    console.error('Error ensuring verification panel:', err.message);
  }
}

// Persistent Discord Gateway Connection
let reconnectAttempts = 0;

function startGateway() {
  console.log('🔌 Connecting to Discord Gateway via WebSocket...');
  const ws = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json');

  let heartbeatInterval = null;
  let lastSeq = null;

  ws.addEventListener('open', () => {
    console.log('✓ WebSocket connected to Discord Gateway.');
    reconnectAttempts = 0;
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
          try {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ op: 1, d: lastSeq }));
            }
          } catch (e) {
            console.error('Error sending heartbeat:', e.message);
          }
        }, interval);

        // Send Opcode 2: Identify with Rich Presence
        ws.send(JSON.stringify({
          op: 2,
          d: {
            token: BOT_TOKEN.trim(),
            intents: 1 | (1 << 9) | (1 << 15), // GUILDS, GUILD_MESSAGES, MESSAGE_CONTENT
            properties: {
              os: 'windows',
              browser: 'aegis-sentinel',
              device: 'aegis-sentinel'
            },
            presence: {
              activities: [{
                name: 'Invariant INV-1 | #start-here verify',
                type: 3 // Watching
              }],
              status: 'online',
              afk: false
            }
          }
        }));
      }

      // Dispatch Events
      if (t === 'READY') {
        console.log(`\n======================================================`);
        console.log(`🤖 Aegis Sentinel Bot ONLINE as ${d.user.username}#${d.user.discriminator} (ID: ${d.user.id})`);
        console.log(`🛡️ Monitoring Guild: ${GUILD_ID}`);
        console.log(`🔐 Verification Channel: #${START_HERE_CHANNEL_ID}`);
        console.log(`🎫 Ticket Helpdesk Channel: #${TICKET_CHANNEL_ID}`);
        console.log(`======================================================\n`);

        // Check & ensure verification panel
        await ensureVerificationPanel();
      }

      // Handle Interactions (Buttons, Select Menus, Modals)
      if (t === 'INTERACTION_CREATE') {
        await handleInteraction(d);
      }

      // Handle Fallback Chat Messages (!verify, !help)
      if (t === 'MESSAGE_CREATE') {
        await handleMessage(d);
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.addEventListener('close', (event) => {
    reconnectAttempts++;
    const delay = Math.min(30000, 2000 * Math.pow(1.5, reconnectAttempts));
    console.log(`⚠️ WebSocket closed (${event.code}: ${event.reason || 'Network drop'}). Reconnecting in ${(delay / 1000).toFixed(1)}s (Attempt #${reconnectAttempts})...`);
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    setTimeout(startGateway, delay);
  });

  ws.addEventListener('error', (err) => {
    console.error('WebSocket error:', err.message || err);
  });
}

// Fallback command handler for text messages
async function handleMessage(msg) {
  if (msg.author?.bot) return;
  const content = (msg.content || '').trim().toLowerCase();

  if (content === '!verify' || content === '!start') {
    try {
      await discordFetch(`/channels/${msg.channel_id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: `👋 Hello <@${msg.author.id}>! To verify your account and unlock the server, please visit the verification gate in <#${START_HERE_CHANNEL_ID}> and click **🛡️ Verify Humanity**.`,
          message_reference: { message_id: msg.id }
        })
      });
    } catch (e) {
      console.error('Error replying to !verify:', e.message);
    }
  }
}

// Main Interaction Router
async function handleInteraction(interaction) {
  const { id, token, type, data, member, channel_id } = interaction;
  const user = member?.user;
  const username = user?.username || 'member';
  const customId = data?.custom_id || '';
  const selectedValues = data?.values || [];

  console.log(`📨 Interaction [type=${type}] from @${username}: custom_id="${customId}"`);

  // =========================================================================
  // SECTION 1: ANTI-BOT VERIFICATION INTERACTIONS
  // =========================================================================

  // 1A. Click "Verify Humanity" Button (Matches button component interaction)
  if (customId === 'btn_start_verification') {
    // Generate random anti-bot math problem
    const challenge = generateAntiBotChallenge();
    const modalCustomId = `vm:${challenge.answer}:${Date.now()}`;

    // Pop up Discord Modal (Type 9: MODAL)
    await respondInteraction(id, token, {
      type: 9,
      data: {
        title: 'AEGIS Anti-Bot Verification',
        custom_id: modalCustomId,
        components: [
          {
            type: 1, // Action Row
            components: [
              {
                type: 4, // Text Input
                custom_id: 'math_answer_input',
                style: 1, // Short
                label: `Anti-Bot: ${challenge.question}`,
                placeholder: 'Type the numeric answer (e.g. 4)',
                min_length: 1,
                max_length: 15,
                required: true
              }
            ]
          }
        ]
      }
    });

    console.log(`  ↳ [VERIFY PROMPT] Sent challenge "${challenge.question}" (ans: ${challenge.answer}) to @${username}`);
    return;
  }

  // 1B. Click "Check Status" Button
  if (customId === 'btn_verification_status') {
    const isVerified = member?.roles?.includes(VERIFIED_ROLE_ID);
    await respondInteraction(id, token, {
      type: 4,
      data: {
        embeds: [{
          title: `${AEGIS_EMOJI} Verification Status`,
          description: isVerified
            ? `✅ **Status: Verified Member**\nYour account has passed human verification and holds full server permissions.`
            : `⚠️ **Status: Unverified**\nYou have not passed human verification yet.\nClick **🛡️ Verify Humanity** in <#${START_HERE_CHANNEL_ID}> to unlock all channels.`,
          color: isVerified ? BRAND_COLORS.TEAL : BRAND_COLORS.AMBER,
          footer: { text: `User ID: ${user.id}` }
        }],
        flags: 64
      }
    });
    return;
  }

  // 1C. Submit Verification Modal (Type 5: MODAL_SUBMIT or custom_id starts with vm:)
  if (customId.startsWith('vm:') || type === 5) {
    if (!customId.startsWith('vm:')) return;

    const parts = customId.split(':');
    const expectedAnswer = parts[1];
    const timestamp = parseInt(parts[2], 10);
    const now = Date.now();

    // Check challenge expiration (5 minutes)
    if (now - timestamp > 300000) {
      await respondInteraction(id, token, {
        type: 4,
        data: {
          embeds: [{
            title: '⚠️ Challenge Timed Out',
            description: `This verification challenge expired. Please click **Verify Humanity** again in <#${START_HERE_CHANNEL_ID}> to generate a fresh question.`,
            color: BRAND_COLORS.AMBER
          }],
          flags: 64
        }
      });
      return;
    }

    // Safely extract user input across any ActionRow components
    let userInput = '';
    if (data?.components) {
      for (const row of data.components) {
        if (row.components) {
          for (const comp of row.components) {
            if (comp.custom_id === 'math_answer_input' || comp.type === 4) {
              userInput = comp.value;
              break;
            }
          }
        }
      }
    }

    const cleaned = (userInput || '').toLowerCase().trim();
    const target = parseInt(expectedAnswer, 10);
    const parsedInt = parseInt(cleaned, 10);
    const wordNum = WORD_TO_NUMBER[cleaned];

    const isCorrect = (cleaned === expectedAnswer.toLowerCase()) ||
      (!isNaN(parsedInt) && parsedInt === target) ||
      (wordNum !== undefined && wordNum === target);

    if (isCorrect) {
      try {
        const isAlreadyVerified = member?.roles?.includes(VERIFIED_ROLE_ID);

        // Assign "Verified Member" role if not already assigned
        if (!isAlreadyVerified) {
          await discordFetch(`/guilds/${GUILD_ID}/members/${user.id}/roles/${VERIFIED_ROLE_ID}`, {
            method: 'PUT'
          });
        }

        console.log(`  ✓ [VERIFY PASS] @${username} (${user.id}) answered correctly ("${userInput}"). Verified Member role confirmed!`);

        await respondInteraction(id, token, {
          type: 4,
          data: {
            embeds: [{
              title: '✅ Human Verification Passed! Welcome to AEGIS',
              description: `Congratulations <@${user.id}>! You answered correctly (\`${userInput}\`).\n\n🛡️ The **Verified Member** role is confirmed for your account.\nYou now have full access to all protocol discussion channels, live telemetry feeds, and alpha strategies.\n\nEnjoy your stay and remember: **AEGIS Core Team will never DM you first.**`,
              color: BRAND_COLORS.TEAL,
              footer: { text: 'AEGIS Protocol Risk Sentinel • Security Verified' }
            }],
            flags: 64
          }
        });
      } catch (err) {
        console.error('Error assigning Verified Member role:', err);
        await respondInteraction(id, token, {
          type: 4,
          data: {
            content: `❌ Verification succeeded, but failed to assign role: ${err.message}. Please notify an administrator in <#${TICKET_CHANNEL_ID}>.`,
            flags: 64
          }
        });
      }
    } else {
      console.log(`  ✗ [VERIFY FAIL] @${username} entered "${userInput}", expected "${expectedAnswer}"`);
      await respondInteraction(id, token, {
        type: 4,
        data: {
          embeds: [{
            title: '❌ Verification Failed',
            description: `The answer you entered (\`${userInput}\`) was incorrect.\n\nPlease click **Verify Humanity** in <#${START_HERE_CHANNEL_ID}> to generate a new question and try again.`,
            color: BRAND_COLORS.RED
          }],
          flags: 64
        }
      });
    }
    return;
  }

  // =========================================================================
  // SECTION 2: TICKET HELPDESK INTERACTIONS
  // =========================================================================

  // 2A. Close Ticket Button
  if (customId === 'btn_close_ticket') {
    await respondInteraction(id, token, {
      type: 4,
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

  // 2B. Ticket Creation Triggers
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
          content: `<@${user.id}> <@&${CORE_TEAM_ROLE_ID}> <@&${ADMIN_ROLE_ID}>`,
          embeds: [{
            title: `${AEGIS_EMOJI} ${ticketTitle}`,
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
                  style: 2,
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
        type: 4,
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

// Start Gateway Daemon
startGateway();
