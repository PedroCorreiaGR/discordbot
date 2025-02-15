require("dotenv").config();
const express = require("express");
const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  Partials,
  ActivityType,
} = require("discord.js");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const port = process.env.PORT || 3000;

/* ============================================================
   REPORT BAN SYSTEM
   Database: banned_ids.db
   ============================================================ */

// Connect to the SQLite database for reports
const dbReports = new sqlite3.Database("./banned_ids.db", (err) => {
  if (err)
    console.error("❌ Error connecting to Reports database:", err.message);
  else console.log("✅ Connected to Reports database (banned_ids.db)!");
});

// Create table if it doesn't exist (without level field)
dbReports.run(
  "CREATE TABLE IF NOT EXISTS banned_ids (id TEXT PRIMARY KEY)",
  (err) => {
    if (err) console.error("❌ Error creating Reports table:", err.message);
  },
);

// Function to load banned IDs (reports)
function loadBannedIDs(callback) {
  dbReports.all("SELECT id FROM banned_ids", (err, rows) => {
    if (err) {
      console.error("❌ Error loading banned IDs:", err.message);
      return callback([]);
    }
    callback(rows.map((row) => row.id));
  });
}

// Function to add an ID to the reports blacklist
function addBannedID(robloxId, callback) {
  dbReports.run("INSERT INTO banned_ids (id) VALUES (?)", [robloxId], (err) => {
    if (err) return callback(false);
    callback(true);
  });
}

// Function to remove an ID from the reports blacklist
function removeBannedID(robloxId, callback) {
  dbReports.run("DELETE FROM banned_ids WHERE id = ?", [robloxId], (err) => {
    if (err) return callback(false);
    callback(true);
  });
}

/* ============================================================
   PERSON BAN SYSTEM
   Database: banned_persons.db
   (Includes the 'level' field to define the type of ban)
   ============================================================ */

// Connect to the SQLite database for person bans
const dbPersons = new sqlite3.Database("./banned_persons.db", (err) => {
  if (err)
    console.error("❌ Error connecting to Persons database:", err.message);
  else console.log("✅ Connected to Persons database (banned_persons.db)!");
});

// Create table if it doesn't exist (with level field)
dbPersons.run(
  "CREATE TABLE IF NOT EXISTS banned_persons (id TEXT PRIMARY KEY, level INTEGER)",
  (err) => {
    if (err) console.error("❌ Error creating Persons table:", err.message);
  },
);

// Function to load banned persons
function loadBannedPersons(callback) {
  dbPersons.all("SELECT id, level FROM banned_persons", (err, rows) => {
    if (err) {
      console.error("❌ Error loading banned persons:", err.message);
      return callback([]);
    }
    callback(rows);
  });
}

// Function to add an ID to the persons blacklist
function addBannedPerson(robloxId, level, callback) {
  dbPersons.run(
    "INSERT INTO banned_persons (id, level) VALUES (?, ?)",
    [robloxId, level],
    (err) => {
      if (err) return callback(false);
      callback(true);
    },
  );
}

// Function to remove an ID from the persons blacklist
function removeBannedPerson(robloxId, callback) {
  dbPersons.run(
    "DELETE FROM banned_persons WHERE id = ?",
    [robloxId],
    (err) => {
      if (err) return callback(false);
      callback(true);
    },
  );
}

/* ============================================================
   EXPRESS ENDPOINTS
   ============================================================ */
app.get("/bannedIDs", (req, res) => {
  loadBannedIDs((bannedIDs) => res.json(bannedIDs));
});

app.get("/bannedPersons", (req, res) => {
  loadBannedPersons((bannedPersons) => res.json(bannedPersons));
});

app.get("/", (req, res) => res.send("The Darkness Awaits..."));

app.listen(port, () => console.log(`🚀 Server is running on port ${port}`));

/* ============================================================
   DISCORD BOT CONFIGURATION
   ============================================================ */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
  presence: {
    status: "dnd",
    activities: [
      {
        name: "the Screams of the Damned",
        type: ActivityType.Listening,
      },
    ],
  },
});

client.once("ready", () =>
  console.log(`🩸 Bot online as ${client.user.tag} - Ready to Feast on Souls`),
);

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Se alguém enviar exatamente "uwu", enviar apenas a imagem designada
  if (message.content.trim().toLowerCase() === "uwu") {
    return message.channel.send({
      files: [
        {
          attachment:
            "https://cdn.discordapp.com/emojis/1337169044742078565.png",
          name: "cursed_image.png",
        },
      ],
      content: "**🩸 The Dark Ones Whisper...**",
    });
  }

  const args = message.content.split(" ");
  const command = args.shift().toLowerCase();

  // Carregar os IDs banidos dos reports
  loadBannedIDs(async (bannedIDs) => {
    // Verificar se a mensagem contém algum ID banido (reports) dentro de colchetes
    const matches = message.content.match(/\[(\d+)\]/g);
    if (matches) {
      const idsInMessage = matches.map((match) => match.replace(/[\[\]]/g, ""));
      if (idsInMessage.some((id) => bannedIDs.includes(id))) {
        await message.delete();
        return message.channel.send(
          `${message.author}, your message has been obliterated for containing a cursed ID.`,
        );
      }
    }

    /* ============================
       Comandos para Report Ban
       ============================ */
    if (command === "!banreport") {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply(
          "❌ You must be an administrator to cast this spell!",
        );
      }
      const robloxId = args[0]?.trim();
      if (!robloxId || isNaN(robloxId)) {
        return message.reply("❌ Invalid ID, mortal!");
      }
      if (bannedIDs.includes(robloxId)) {
        return message.reply(
          "❌ This accursed ID is already banished from our realm!",
        );
      }
      addBannedID(robloxId, (success) => {
        if (success)
          message.reply({
            content: `
**🔮 THE DARK RITUAL IS COMPLETE**
\`\`\`diff
- ID ${robloxId} has been sacrificed to The Void
+ Eternal Torment: Activated
\`\`\`
🩸 *The shadows claim another soul...*
          `,
          });
      });
    }

    if (command === "!unbanreport") {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply(
          "❌ You must be an administrator to reverse the curse!",
        );
      }
      const robloxId = args[0]?.trim();
      if (!robloxId) {
        return message.reply("❌ You must provide a valid ID, mortal!");
      }
      if (!bannedIDs.includes(robloxId)) {
        return message.reply(
          "❌ This accursed ID was not found in the forbidden records!",
        );
      }
      removeBannedID(robloxId, (success) => {
        if (success)
          message.reply({
            content: `
**🕳️ THE SEAL IS BROKEN**
\`\`\`diff
+ ID ${robloxId} emerges from The Abyss
- Chains of Damnation: Shattered
\`\`\`
💀 *A soul escapes... but for how long?*
          `,
          });
      });
    }

    if (command === "!checkbanreport") {
      const robloxId = args[0]?.trim();
      if (!robloxId) {
        return message.reply("❌ You must provide a valid ID, mortal!");
      }
      if (bannedIDs.includes(robloxId)) {
        return message.reply(
          `❌ The ID ${robloxId} remains banished from this realm!`,
        );
      } else {
        return message.reply(`✅ The ID ${robloxId} is free... for now.`);
      }
    }

    if (command === "!listbanreport") {
      if (bannedIDs.length === 0) {
        return message.reply(
          "ℹ️ There are no cursed IDs in our records... yet.",
        );
      }
      return message.reply(`📋 Cursed IDs: ${bannedIDs.join(", ")}`);
    }

    /* ============================
       Comando de Ajuda (para ambos os sistemas)
       ============================ */
    if (command === "!help") {
      const embed = {
        title: "🩸 **Henry Infinity Commands** 🩸",
        color: 0x000000, // Preto para o tema sombrio
        thumbnail: {
          url: "https://cdn.discordapp.com/emojis/1337169044742078565.png", // Imagem de uma vela temática
        },
        fields: [
          {
            name: "🔮 **REPORT SYSTEM**",
            value: `
    \`!banreport <ID>\` » Admin only
    \`!unbanreport <ID>\` » Admin only
    \`!checkbanreport <ID>\` 
    \`!listbanreport\` 
            `,
            inline: false,
          },
          {
            name: "💀 **PERSON SYSTEM**",
            value: `
    \`!ban <ID> [level]\` » Admin only
    \`!unban <ID>\` » Admin only
    \`!checkban <ID>\` 
    \`!listban\` 
            `,
            inline: false,
          },
          {
            name: "📌 **USAGE EXAMPLES**",
            value: `
    
    \`!ban 123456789 2\`
    \`!unbanreport 987654321\`
    
            `,
            inline: false,
          },
        ],
        footer: {
          text: "Gray System V3.5",
        },
      };

      return message.reply({
        embeds: [embed],
        allowedMentions: { repliedUser: false },
      });
    }

    /* =====================================
       Comandos para Person Ban (nova base)
       ===================================== */
    loadBannedPersons((bannedPersons) => {
      if (command === "!ban") {
        if (
          !message.member.permissions.has(PermissionFlagsBits.Administrator)
        ) {
          return message.reply(
            "❌ You must be an administrator to invoke this ritual!",
          );
        }
        const robloxId = args[0]?.trim();
        // Nível padrão é 1 (ban normal)
        const level = args[1] ? parseInt(args[1]) : 1;
        if (!robloxId || isNaN(robloxId)) {
          return message.reply("❌ Invalid ID, mortal!");
        }
        if (level !== 1 && level !== 2) {
          return message.reply(
            "❌ Invalid level! Use 1 for a standard ban or 2 for banishing Roblox friends.",
          );
        }
        if (bannedPersons.some((person) => person.id === robloxId)) {
          return message.reply(
            "❌ This accursed ID is already banished from our realm!",
          );
        }
        addBannedPerson(robloxId, level, (success) => {
          if (success)
            message.reply(
              `✅ The ID ${robloxId} has been banished with level ${level}!`,
            );
        });
      }

      if (command === "!unban") {
        if (
          !message.member.permissions.has(PermissionFlagsBits.Administrator)
        ) {
          return message.reply(
            "❌ You must be an administrator to reverse this curse!",
          );
        }
        const robloxId = args[0]?.trim();
        if (!robloxId) {
          return message.reply("❌ You must provide a valid ID, mortal!");
        }
        if (!bannedPersons.some((person) => person.id === robloxId)) {
          return message.reply(
            "❌ This accursed ID was not found in the forbidden records!",
          );
        }
        removeBannedPerson(robloxId, (success) => {
          if (success)
            message.reply(
              `✅ The ID ${robloxId} has been released from its curse!`,
            );
        });
      }

      if (command === "!checkban") {
        const robloxId = args[0]?.trim();
        if (!robloxId) {
          return message.reply("❌ You must provide a valid ID, mortal!");
        }
        const person = bannedPersons.find((person) => person.id === robloxId);
        if (person) {
          return message.reply(
            `❌ The ID ${robloxId} remains banished with level ${person.level}!`,
          );
        } else {
          return message.reply(`✅ The ID ${robloxId} is free... for now.`);
        }
      }

      if (command === "!listban") {
        if (bannedPersons.length === 0) {
          return message.reply(
            "ℹ️ There are no banished persons in our records... yet.",
          );
        }
        return message.reply(
          `📋 Banished Persons: ${bannedPersons.map((person) => `${person.id} (Level ${person.level})`).join(", ")}`,
        );
      }
    });
  });
});

client.login(process.env.BOT_TOKEN);
