const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const { exec } = require('child_process');
const GEMINI_KEY = process.env.GEMINI_KEY;
const memoriaIA = {};
// --- SISTEMA DE PERMISOS ---
let permisos = {};
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        timeout: 120000
    },
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    }
});

client.on('qr', (qr) => {
    console.log('📷 Escanea este QR con tu WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Bot conectado y operativo!');
});

// ===== BIENVENIDA =====
client.on('group_join', async (notification) => {
    try {
        const chat = await notification.getChat();
        for (const id of notification.recipientIds) {
            const contact = await client.getContactById(id);
            const nombre = contact.pushname || contact.name || contact.number;
            await chat.sendMessage(`Bienvenid@ ${nombre} al grupo! Soy WormGPT, el bot de Juan. Escribe !menu para ver todo lo que hago.`);
        }
    } catch (e) { console.log('Error bienvenida', e); }
});
// ===== TRIVIA =====
const preguntasTrivia = [
    { q: '¿Cuál es la capital de Perú?', opciones: ['A) Lima', 'B) Cusco', 'C) Arequipa'], resp: 'a' },
    { q: '¿Cuánto es 5 + 7?', opciones: ['A) 11', 'B) 12', 'C) 13'], resp: 'b' },
    { q: '¿Qué animal dice "miau"?', opciones: ['A) Perro', 'B) Gato', 'C) Pato'], resp: 'b' },
    { q: '¿En qué año llegó el hombre a la luna?', opciones: ['A) 1969', 'B) 1975', 'C) 1980'], resp: 'a' },
    { q: '¿Cuál es el río más largo del mundo?', opciones: ['A) Amazonas', 'B) Nilo', 'C) Yangtsé'], resp: 'a' },
    { q: '¿Cómo se llama el creador de WormGPT?', opciones: ['A) Juan', 'B) Pedro', 'C) Luis'], resp: 'a' },
];
let triviaActiva = {}; // guarda quien esta jugando

client.on('message_create', async (msg) => {
  const chat = await msg.getChat();
  if (!chat.isGroup || chat.name !== 'MI BOT') return;

let texto = (msg.body || '').toLowerCase();
  if (!msg.body) return;

  // --- !permiso ---
  if (texto === '!permiso' || texto.startsWith('!permiso ')) {
    await chat.sendMessage('⏳ Pedido enviado. Espera que el admin te dé permiso con !concedido');
    return;
  }

  // --- !concedido ---
  if (texto.startsWith('!concedido')) {
    if (!msg.mentionedIds || msg.mentionedIds.length === 0) {
      await chat.sendMessage('Usa: !concedido @persona');
      return;
    }
    permisos[msg.mentionedIds[0]] = Date.now() + 5 * 60 * 1000;
    await chat.sendMessage('✅ Permiso concedido por 5 minutos. Ya puede mandar links.');
    return;
  }
// ===== ANTI-LINK MI BOT =====
const tieneLink = (msg.body || '').includes('http') || (msg.body || '').includes('https') || (msg.body || '').includes('www.') || (msg.body || '').includes('chat.whatsapp.com') || (msg.body || '').includes('.com') || (msg.body || '').includes('t.me');
  // Si tiene permiso, no lo borres
  if (permisos[msg.author] && permisos[msg.author] > Date.now()) {
      return;
 }
if (!msg.fromMe && msg.author && tieneLink && !texto.startsWith('!')) {
      try {
        const participante = chat.participants.find(p => p.id._serialized === msg.author);
        const soyAdmin = participante && participante.isAdmin;

        // Si NO es admin, lo borro
        if (!soyAdmin) {
            await msg.delete(true);
            await chat.sendMessage(`⚠️ @${msg.author.split('@')[0]} *No se permiten links en MI BOT* 🚫\n\nSi quieres compartir algo, pídele permiso a un admin.`, { mentions: [msg.author] });
            return;
        }
     } catch (e) {
    console.log('Error anti-link:', e);
  }
  }
    if (msg.from === 'status@broadcast') return;
    if (!msg.body) return;

    const textoOriginal = msg.body.trim();
    if (textoOriginal === '') return;
    if (textoOriginal.startsWith('🤖')) return;
    if (textoOriginal.startsWith('WORMGPT')) return;

     texto = (msg.body || '').toLowerCase();
    const comando = texto.replace(/^!/, '').trim().split(/\s+/)[0];

    console.log(`Mensaje recibido: ${textoOriginal}`);
    const aleatorio = (lista) => lista[Math.floor(Math.random() * lista.length)];

    if (msg.fromMe) {
        if (!texto.startsWith('!') && texto !== 'estoy triste' && texto !== 'hola' && texto !== 'a' && texto !== 'b' && texto !== 'c') return;
    }

    // ===== RESPUESTA TRIVIA (sin !, solo A, B, C) =====
    if (triviaActiva[msg.from]) {
        const respuesta = texto.trim().toLowerCase();
        if (['a','b','c'].includes(respuesta)) {
            const actual = triviaActiva[msg.from];
            if (respuesta === actual.resp) {
                await msg.reply(`✅ ¡CORRECTO! 🎉\nEres un genio. Pon !trivia para otra pregunta.`);
            } else {
                await msg.reply(`❌ ¡FALLASTE! 😂\nLa correcta era la *${actual.resp.toUpperCase()}*.\nPon !trivia para intentar de nuevo.`);
            }
            delete triviaActiva[msg.from];
            return;
        }
    }

    // ===== !PPT =====
    if (comando.startsWith('ppt')) {
        const partes = comando.split(' ');
        const eleccionUsuario = partes[1]; // piedra, papel, tijera
        if (!eleccionUsuario) {
            await msg.reply('✊✋✌️ *PIEDRA PAPEL O TIJERA*\n\nEscribe así:\n!ppt piedra\n!ppt papel\n!ppt tijera');
            return;
        }
        if (!['piedra','papel','tijera'].includes(eleccionUsuario)) {
            await msg.reply('⚠️ Solo puedes elegir: piedra, papel o tijera.\nEjemplo: !ppt piedra');
            return;
        }
        const opciones = ['piedra','papel','tijera'];
        const eleccionBot = aleatorio(opciones);
        const emojis = { piedra: '✊', papel: '✋', tijera: '✌️' };
        let resultado = '';
        if (eleccionUsuario === eleccionBot) resultado = '🤝 ¡EMPATE!';
        else if ((eleccionUsuario === 'piedra' && eleccionBot === 'tijera') || (eleccionUsuario === 'papel' && eleccionBot === 'piedra') || (eleccionUsuario === 'tijera' && eleccionBot === 'papel')) resultado = '🏆 ¡GANASTE! Eres un crack.';
        else resultado = '😂 ¡TE GANÉ! Soy mejor que tú.';

        await msg.reply(`${emojis[eleccionUsuario]} Tú: *${eleccionUsuario}*\n${emojis[eleccionBot]} Yo: *${eleccionBot}*\n\n${resultado}`);
        return;
    }
    // ===== !TRIVIA =====
    if (comando === 'trivia') {
        const pregunta = aleatorio(preguntasTrivia);
        triviaActiva[msg.from] = pregunta;
        await msg.reply(`🧠 *TRIVIA WORMGPT*\n\n${pregunta.q}\n\n${pregunta.opciones.join('\n')}\n\nResponde solo con *A, B o C*`);
        return;
    }

    // ===== !MUSICA =====
if (textoOriginal.toLowerCase().startsWith('!musica')) {
    const busqueda = textoOriginal.slice(7).trim();
    if (!busqueda) { await msg.reply('Escribe: !musica bad bunny'); return; }
    await msg.reply('Buscando... 🎵');
    try {
        const resp = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(busqueda)}&media=music&limit=1`);
        const data = await resp.json();
        if (!data.results || data.results.length === 0) { await msg.reply('No encontre esa cancion, prueba con otro nombre.'); return; }
        const cancion = data.results[0];
        const nombre = `${cancion.trackName} - ${cancion.artistName}`;
        await msg.reply(`Encontre: *${nombre}* 🎶\nTe mando el preview:`);
        await msg.reply(cancion.previewUrl);
    } catch (e) {
        console.log(e);
        await msg.reply('No pude buscarla, intenta de nuevo.');
    }
    return;
}// ===== !YT =====
if (textoOriginal.toLowerCase().startsWith('!yt')) {
    const match = msg.body.match(/https?:\/\/\S+/);
    const url = match ? match[0] : null;
    if (!url) { await msg.reply('Pon el link: !yt https://youtu.be/...'); return; }
    await msg.reply('Descargando... espera 🎵');
    try {
        const ytdlp = require('yt-dlp-exec');
        const fs = require('fs');
        const archivo = `cancion_${Date.now()}.mp3`;
        const urlLimpia = url.split('&')[0];
        await ytdlp(urlLimpia, {
            extractAudio: true,
            audioFormat: 'mp3',
            output: archivo,
            noPlaylist: true,
            noCheckCertificates: true,
            extractorArgs: 'youtube:player_client=android'
        });
        const media = MessageMedia.fromFilePath(archivo);
        await msg.reply(media);
        fs.unlinkSync(archivo);
    } catch (e) {
        console.log(e);
        await msg.reply('YouTube bloqueo esa cancion, prueba otra.');
    }
    return;
}

    // ===== LO QUE YA TENIAS =====
    if (comando === 'sticker' || comando === 's') {
        if (msg.hasMedia) {
            try {
                await msg.reply('⏳ Haciendo tu sticker...');
                const media = await msg.downloadMedia();
                await msg.reply(media, undefined, { sendMediaAsSticker: true, stickerAuthor: 'WormGPT', stickerName: 'By Juan' });
            } catch (e) { await msg.reply('❌ No pude hacer el sticker'); }
        } else if (msg.hasQuotedMsg) {
            try {
                const quoted = await msg.getQuotedMessage();
                if (quoted.hasMedia) {
                    const media = await quoted.downloadMedia();
                    await msg.reply(media, undefined, { sendMediaAsSticker: true, stickerAuthor: 'WormGPT', stickerName: 'By Juan' });
                } else await msg.reply('⚠️ Responde a una foto con !sticker');
            } catch (e) { await msg.reply('❌ No pude hacer el sticker'); }
        } else await msg.reply('⚠️ Mándame una foto con !sticker');
        return;
    }

    if (texto.includes('estoy triste')) { await msg.reply('❤️ Oye, no estés triste. Pon !chiste o !trivia para distraerte'); return; }
    if (texto.includes('te quiero') || texto.includes('te amo')) { await msg.reply('❤️ Yo también te quiero, humano.'); return; }
    if (texto.includes('como estas') || texto.includes('cómo estás')) { await msg.reply('🕷️ Al 100% gracias a Juan. ¿Y tú?'); return; }
    if (texto.includes('quien eres') || texto.includes('quién eres')) { await msg.reply('🕷️ Soy WormGPT, el bot de Juan. Pon !menu'); return; }

    if (comando === 'hola' || comando === 'ola') { await msg.reply('🕷️ ¡Hola humano! Soy WormGPT Bot. Prueba !menu'); }
    else if (comando === 'hora') { await msg.reply(`🕐 La hora actual es: ${new Date().toLocaleTimeString()}`); }
    else if (comando === 'menu' || comando === 'ayuda') {
        await msg.reply(`🤖 *MENU WORMGPT*\n\n🎮 *JUEGOS*\n!ppt piedra/papel/tijera - Piedra papel tijera\n!trivia - Preguntas con puntos\n!dado - Tira un dado\n!moneda - Cara o sello\n\n📥 *DESCARGAS*\n!yt + link - Descarga música de YouTube\n!sticker - Convierte foto en sticker\n\n😂 *DIVERSIÓN*\n!chiste - Chiste random\n!plata - Chiste de plata\n!amor - Consejo de amor\n!insulto - Insulto suave\n\n⚙️ *OTROS*\n!hola - Saludo\n!hora - Hora actual\n!menu - Ver este menu\n\n*Y SIN ! TAMBIEN RESPONDO A:*\nEstoy triste, te quiero, como estas, quien eres`);
    }
    else if (comando === 'plata') { await msg.reply('💰 Mi plata se va volando, igual que la tuya.'); }
    else if (comando === 'chiste') { await msg.reply(aleatorio(['😂 ¿Qué le dice un jaguar a otro? Jaguar you!', '😂 ¿Qué hace un mudo bailando? Una mudanza.', '😂 ¿Cómo se llama el primo vegetariano de Bruce Lee? Broco Lee.'])); }
    else if (comando === 'amor') { await msg.reply('❤️ Si te dejó en visto, no es amor, cómprate algo rico y sigue.'); }
    else if (comando === 'insulto') { await msg.reply('🤡 Tu cerebro tiene más lag que mi bot.'); }
    else if (comando === 'dado') { await msg.reply(`🎲 Salió: *${Math.floor(Math.random()*6)+1}*`); }
    else if (comando === 'moneda') { await msg.reply(`🪙 Salió: *${Math.random()<0.5?'CARA':'SELLO'}*`); }
else if (comando === 'ban') {
    try {
        const chat = await msg.getChat();
        const yo = chat.participants.find(p => p.id._serialized === msg.author);
        if (!msg.fromMe && (!yo || !yo.isAdmin)) {
            await msg.reply('❌ Solo los admins pueden usar *!ban*');
        } else {
            let objetivo = null;
            if (msg.hasQuotedMsg) {
                const citado = await msg.getQuotedMessage();
                objetivo = citado.author;
            }
            if (!objetivo && msg.mentionedIds && msg.mentionedIds.length > 0) {
                objetivo = msg.mentionedIds[0];
            }
            if (!objetivo) {
                await msg.reply('⚠️ Usa así: *!ban @persona* o responde a su mensaje con *!ban*');
            } else {
                const victima = chat.participants.find(p => p.id._serialized === objetivo);
                if (victima && victima.isAdmin) {
                    await msg.reply('⚠️ No puedes banear a otro admin.');
                } else {
                    await chat.removeParticipants([objetivo]);
                    await chat.sendMessage(`✅ @${objetivo.split('@')[0]} fue expulsado de MI BOT.`, { mentions: [objetivo] });
                }
            }
        }
    } catch (e) {
        console.log('Error ban:', e);
        await msg.reply('❌ No pude expulsarlo. ¿El bot es admin?');
    }
}
else if (comando === 'ia') {
    const pregunta = textoOriginal.slice(3).trim();
    if (!pregunta) {
        await msg.reply('⚠️ Usa así: !ia explícame la fotosíntesis');
        return;
    }
    try {
    const quien = msg.author || msg.from;
    if (!memoriaIA[quien]) memoriaIA[quien] = [];
    memoriaIA[quien].push({ role: 'user', parts: [{ text: pregunta }] });

    await msg.reply('🧠 Gemini pensando...');

    const modelos = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-flash', 'gemini-2.0-flash'];
    let respuesta = null;

    for (const modelo of modelos) {
    console.log('Probando modelo: ' + modelo);
    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 15000); // 15 segundos máximo

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=` + GEMINI_KEY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                system_instruction: { parts: [{ text: 'Eres WormGPT, el bot de Juan. Divertido, hablas con slang peruano de Puerto Maldonado, eres su mejor amigo. Responde en español.' }] },
                contents: memoriaIA[quien],
                generationConfig: { temperature: 0.8, maxOutputTokens: 1500 }
            })
        });
        const data = await res.json();
        console.log('Respuesta de ' + modelo + ' status: ' + res.status);
if (data.error) console.log('Error Google: ' + data.error.message);
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            respuesta = data.candidates[0].content.parts[0].text;
            break;
        }
        console.log('Falló ' + modelo + ', probando siguiente...');
    } catch (e) {
        console.log('Error con ' + modelo + ': ' + e.message);
    }
}
    if (!respuesta) {
        await msg.reply('❌ Google está saturado ahorita, espera 1 minuto y pon !ia de nuevo.');
        return;
    }

    memoriaIA[quien].push({ role: 'model', parts: [{ text: respuesta }] });
    await msg.reply(respuesta.slice(0, 4000));
} catch (e) {
    await msg.reply('❌ Error real: ' + e.message);
}
}
else if (comando === 'resetia') {
    const quien = msg.author || msg.from;
    memoriaIA[quien] = [];
    await msg.reply('🧠 Memoria borrada.');
}
    else if (textoOriginal.startsWith('!')) { await msg.reply('🤖 Comando no reconocido. Escribe !menu'); }
});

client.initialize();
