module.exports = (client) => {
  // Mudado de 'ready' para 'clientReady' para atender ao Discord.js v15
  client.once('clientReady', () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
  });
};
