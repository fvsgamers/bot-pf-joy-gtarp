const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');

const config = require('../config.json');

const dadosTemp = {};

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    try {

      // ===== COMANDOS =====
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (command) await command.execute(interaction);
        return;
      }

     // ===== ABRIR FORM =====
      if (interaction.isButton() && interaction.customId === 'abrir_formulario') {

        const modal = new ModalBuilder()
          .setCustomId('formulario_registro')
          .setTitle('📋 Recrutamento');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('nome')
              .setLabel('Nome')
              .setStyle(TextInputStyle.Short)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('sobrenome')
              .setLabel('Sobrenome')
              .setStyle(TextInputStyle.Short)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('id')
              .setLabel('ID (somente números)')
              .setStyle(TextInputStyle.Short)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('telefone')
              .setLabel('Telefone (in-game)')
              .setStyle(TextInputStyle.Short)
          )
        );

        return interaction.showModal(modal);
      }

      // ===== MODAL =====
      if (interaction.isModalSubmit() && interaction.customId === 'formulario_registro') {

        const nome = interaction.fields.getTextInputValue('nome');
        const sobrenome = interaction.fields.getTextInputValue('sobrenome');
        const id = interaction.fields.getTextInputValue('id');
        const telefone = interaction.fields.getTextInputValue('telefone');
        

        if (!/^\d+$/.test(id)) {
          return interaction.reply({ content: '❌ ID inválido!', flags: 64 });
        }

        await interaction.guild.members.fetch();

        const recrutadores = [];

        for (const cargoId of config.cargosRecrutadores) {
          const role = interaction.guild.roles.cache.get(cargoId);
          if (!role) continue;
          role.members.forEach(m => recrutadores.push(m));
        }

        const unique = [...new Map(recrutadores.map(m => [m.id, m])).values()];

        const options = unique.slice(0, 25).map(m => ({
          label: m.displayName,
          value: m.id
        }));

        if (options.length === 0) {
          return interaction.reply({ content: '❌ Nenhum recrutador encontrado!', flags: 64 });
        }

        dadosTemp[interaction.user.id] = { nome, sobrenome, id, telefone };

        const selectRecrutador = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('select_recrutador')
            .setPlaceholder('Selecione o recrutador')
            .addOptions(options)
        );

        const cargosOptions = Object.entries(config.cargosSistema)
          .map(([id, data]) => {
            const role = interaction.guild.roles.cache.get(id);
            return {
              label: role ? role.name : data.nome,
              value: id
            };
          });

        const selectCargo = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('select_cargo')
            .setPlaceholder('Selecione o cargo')
            .addOptions(cargosOptions)
        );
          return interaction.reply({
          content: 'Selecione o recrutador:',
          components: [selectRecrutador],
          flags: 64
        });
        /*return interaction.reply({
          content: 'Selecione recrutador e cargo:',
          components: [selectRecrutador, selectCargo],
          flags: 64
        });*/
        
      }

      // ===== SELECT =====
        if (interaction.isStringSelectMenu()) {
  
          const dados = dadosTemp[interaction.user.id];
          if (!dados) {
            return interaction.reply({ content: '❌ Dados expiraram.', flags: 64 });
          }
  
        if (interaction.customId === 'select_recrutador') {

          dados.recrutador = interaction.values[0];
      
          const cargosOptions = Object.entries(config.cargosSistema)
            .map(([id, data]) => {
              const role = interaction.guild.roles.cache.get(id);
      
              return {
                label: role ? role.name : data.nome,
                value: id
              };
            });
      
          const selectCargo = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('select_cargo')
              .setPlaceholder('Selecione o cargo')
              .addOptions(cargosOptions)
          );
      
          return interaction.update({
            content: 'Agora selecione o cargo:',
            components: [selectCargo]
          });
        }          
        /*if (interaction.customId === 'select_recrutador') {
          dados.recrutador = interaction.values[0];
          return interaction.reply({ content: '✅ Recrutador selecionado!', flags: 64 });
        }*/

        if (interaction.customId === 'select_cargo') {

          if (!dados.recrutador) {
          return interaction.reply({
              content: '❌ Selecione primeiro o recrutador.',
              flags: 64
              });
          }
          
          dados.cargo = interaction.values[0];

          const nomeCanal = `registro-${dados.nome.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;

          const canal = await interaction.guild.channels.create({
            name: nomeCanal,
            topic: interaction.user.id,
            type: ChannelType.GuildText,
            parent: config.categoriaTickets,
            permissionOverwrites: [
              { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
              { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
              { id: interaction.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
              ...config.cargosRecrutadores.map(c => ({
                id: c,
                allow: [PermissionsBitField.Flags.ViewChannel]
              }))
            ]
          });

          const role = interaction.guild.roles.cache.get(dados.cargo);

          const embed = new EmbedBuilder()
            .setTitle('📋 Novo Registro')
            .addFields(
              { name: 'Nome', value: dados.nome },
              { name: 'Sobrenome', value: dados.sobrenome },
              { name: 'ID', value: dados.id },
              { name: 'Telefone', value: dados.telefone },
              { name: 'Recrutador', value: `<@${dados.recrutador}>`},
              //{ name: 'Recrutador', value: dados.recrutador},
              { name: 'Cargo', value: role ? role.name : dados.cargo }
            );

          const botoes = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`aprovar_${dados.cargo}`)
              .setLabel('Aprovar')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('reprovar')
              .setLabel('Reprovar')
              .setStyle(ButtonStyle.Danger)
          );

          await canal.send({ embeds: [embed], components: [botoes] });

          delete dadosTemp[interaction.user.id];

          return interaction.reply({ content: '✅ Ticket criado!', flags: 64 });
        }
      }

// ===== APROVAR =====
      if (interaction.isButton() && interaction.customId.startsWith('aprovar')) {

        const temPermissao = interaction.member.roles.cache.some(role =>
          config.cargosRecrutadores.includes(role.id)
        );

        if (!temPermissao) {
          return interaction.reply({ content: '❌ Sem permissão.', flags: 64 });
        }

        await interaction.deferUpdate();

        const cargoEscolhido = interaction.customId.split('_')[1];
        const membro = interaction.guild.members.cache.get(interaction.channel.topic);

        if (!membro) return;

        const embed = interaction.message.embeds[0];
        const getField = (n) => embed.data.fields.find(f => f.name === n)?.value || '';

        const id = getField('ID');
        const nome = getField('Nome');
        const sobrenome = getField('Sobrenome');
        const telefone = getField('Telefone');

        const sistema = config.cargosSistema[cargoEscolhido];
        if (!sistema) return console.log('⚠️ Cargo não configurado');

        let nickname = `[${sistema.nome}] ${nome} | ${id}`;
        if (nickname.length > 32) nickname = `[${sistema.nome}] ${nome}`.slice(0, 32);

        await membro.setNickname(nickname).catch(() => {});

        const cargos = [
          cargoEscolhido,
          //config.cargoAprovado,
          ...(sistema.extra || [])
        ];

        await membro.roles.add(cargos);
        //await membro.roles.remove(config.cargoRemover);

        // ===== REGISTRO CENTRAL =====
        const canalRegistro = interaction.guild.channels.cache.get('1554307411202805821');

        // Adicionada a trava de segurança para garantir que .send() exista
        if (canalRegistro && typeof canalRegistro.send === 'function') {
          const linha = `| ----------------------------------------------------------------|`;

          const mensagem = `\n📜 **Registro**\n\n👤 **Nome:** ${nome}\n🆔 **Sobrenome:** ${sobrenome}\n🆔 **ID:** ${id}\n📞 **Telefone:** ${telefone}\n🏷️ **Cargo:** ${sistema.nome}\n🧑‍💼 **Aprovado por:** ${interaction.member.displayName}\n\n${linha}\n`;

          await canalRegistro.send(mensagem).catch(err => console.error("Erro ao enviar no Registro Central:", err));
        } else {
          console.warn("⚠️ O canal '1554307411202805821' não foi encontrado no cache ou não aceita mensagens (pode ser uma categoria). Pulando para não travar a finalização.");
        }

        // ===== LOG DE APROVAÇÕES =====
        const log = interaction.guild.channels.cache.get(config.logAprovacoes);
        if (log && typeof log.send === 'function') {
          await log.send(`✅ ${membro.user.tag} aprovado por ${interaction.user.tag}\nCargo: ${sistema.nome}\nApelido: ${nickname}`).catch(err => console.error("Erro ao enviar no Log:", err));
        }

        // ===== FINALIZAÇÃO (Agora vai rodar sem travar!) =====
        await interaction.message.edit({ content: '✅ Aprovado!', components: [] });

        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
      }

      // ===== REPROVAR =====
      if (interaction.isButton() && interaction.customId === 'reprovar') {

        const temPermissao = interaction.member.roles.cache.some(role =>
          config.cargosRecrutadores.includes(role.id)
        );

        if (!temPermissao) {
          return interaction.reply({ content: '❌ Sem permissão.', flags: 64 });
        }

        await interaction.update({ content: '❌ Reprovado!', components: [] });

        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
      }

      // ====================== Lógica da Transferência ========================== //
            
      // ========================================================
// ========================================================
// ===== LÓGICA DA TRANSFERÊNCIA
// ========================================================
// ===== 1º PASSO: BOTÃO INICIAR TRANSFERÊNCIA =====
if (interaction.isButton() && interaction.customId === 'abrir_transferencia') {
const opcoesOrigem = Object.entries(config.instituicoesOrigem || {}).map(([id, nome]) => ({
label: String(nome).slice(0, 100),
value: String(id)
}));
if (opcoesOrigem.length === 0) {
return interaction.reply({ content: '❌ Nenhuma instituição de origem está configurada.', flags: 64 });
}
const selectOrigem = new ActionRowBuilder().addComponents(
new StringSelectMenuBuilder()
.setCustomId('transf_select_origem')
.setPlaceholder('Selecione sua instituição de origem')
.addOptions(opcoesOrigem)
);
dadosTemp[interaction.user.id] = { tipoFlow: 'transferencia' };
return interaction.reply({
content: '🏢 Para iniciar sua transferência, selecione sua instituição de origem:',
components: [selectOrigem],
flags: 64
});
}
// ===== 2º PASSO: SELECIONA A INSTITUIÇÃO DE ORIGEM =====
if (interaction.isStringSelectMenu() && interaction.customId === 'transf_select_origem') {
const dados = dadosTemp[interaction.user.id];
if (!dados) return interaction.reply({ content: '❌ Sessão expirada. Inicie novamente.', flags: 64 });
const origemID = String(interaction.values[0]).trim();
dados.origemBatalhaoID = origemID;
const nomeInstituicao = config.instituicoesOrigem?.[origemID] || 'Instituição Desconhecida';
const cargosTransferencia = config.cargosTransferencia || {};
const opcoesCargo = Object.entries(cargosTransferencia).map(([id, data]) => {
const role = interaction.guild.roles.cache.get(id);
return {
label: String(role?.name || data?.nome || 'Cargo não definido').substring(0, 100),
value: String(id)
};
});
if (opcoesCargo.length === 0) {
return interaction.update({ content: '❌ Nenhum cargo de transferência está configurado.', components: [] });
}
const selectCargoT = new ActionRowBuilder().addComponents(
new StringSelectMenuBuilder()
.setCustomId('transf_select_cargo')
.setPlaceholder('Selecione o cargo desejado')
.addOptions(opcoesCargo)
);
return interaction.update({
content: 🏢 **Instituição de origem:** ${nomeInstituicao}\n\n🏷️ **Selecione agora o cargo desejado:**,
components: [selectCargoT]
});
}
// ===== 3º PASSO: SELECIONA CARGO DESEJADO =====
if (interaction.isStringSelectMenu() && interaction.customId === 'transf_select_cargo') {
const dados = dadosTemp[interaction.user.id];
if (!dados) return interaction.reply({ content: '❌ Sessão expirada. Inicie novamente.', flags: 64 });
const cargoID = String(interaction.values[0]).trim();
dados.cargoDesejado = cargoID;
const cargoConfig = config.cargosTransferencia?.[cargoID];
if (!cargoConfig) {
return interaction.reply({ content: ❌ O cargo selecionado não está configurado. ID: \${cargoID}``, flags: 64 });
}
const role = interaction.guild.roles.cache.get(cargoID);
if (!role) {
return interaction.reply({ content: ❌ O cargo existe no config.json, mas não no Discord. ID: \${cargoID}``, flags: 64 });
}
const modal = new ModalBuilder()
.setCustomId('transf_modal_dados')
.setTitle('📝 Dados do Transferido');
modal.addComponents(
new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nome').setStyle(TextInputStyle.Short).setRequired(true)),
new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('sobrenome').setLabel('Sobrenome').setStyle(TextInputStyle.Short).setRequired(true)),
new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id').setLabel('ID (somente números)').setStyle(TextInputStyle.Short).setRequired(true)),
new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('telefone').setLabel('Telefone (in-game)').setStyle(TextInputStyle.Short).setRequired(true))
);
return interaction.showModal(modal);
}
// ===== 4º PASSO: RECEBE MODAL E CRIA TICKET =====
if (interaction.isModalSubmit() && interaction.customId === 'transf_modal_dados') {
const dados = dadosTemp[interaction.user.id];
if (!dados) return interaction.reply({ content: '❌ Dados expirados. Inicie novamente.', flags: 64 });
const nome = interaction.fields.getTextInputValue('nome').trim();
const sobrenome = interaction.fields.getTextInputValue('sobrenome').trim();
const id = interaction.fields.getTextInputValue('id').trim();
const telefone = interaction.fields.getTextInputValue('telefone').trim();
if (!/^\d+$/.test(id)) {
return interaction.reply({ content: '❌ ID inválido! Digite somente números.', flags: 64 });
}
const cargoConfig = config.cargosTransferencia?.[dados.cargoDesejado];
const roleDesejada = interaction.guild.roles.cache.get(dados.cargoDesejado);
if (!cargoConfig || !roleDesejada) {
return interaction.reply({ content: ❌ Cargo inválido ou não encontrado no servidor. ID: \${dados.cargoDesejado}``, flags: 64 });
}
const nomeOrigem = config.instituicoesOrigem?.[dados.origemBatalhaoID] || 'Instituição Desconhecida';
let nomeCanal = transf-${nome}-${sobrenome}.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase().substring(0, 90);
const canal = await interaction.guild.channels.create({
name: nomeCanal,
topic: interaction.user.id,
type: ChannelType.GuildText,
parent: config.categoriaTickets,
permissionOverwrites: [
{ id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
{ id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
{ id: interaction.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
...(config.cargosRecrutadores || []).map(cargoID => ({
id: cargoID,
allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
}))
]
});
const embed = new EmbedBuilder()
.setTitle('🔄 Nova Solicitação de Transferência')
.setColor(0x3498db)
.addFields(
{ name: '👤 Nome', value: nome },
{ name: '👤 Sobrenome', value: sobrenome },
{ name: '🆔 ID', value: id },
{ name: '📱 Telefone', value: telefone },
{ name: '🏢 Instituição de Origem', value: nomeOrigem },
{ name: '🏢 ID Origem', value: dados.origemBatalhaoID },
{ name: '🏷️ Cargo Desejado', value: roleDesejada.name },
{ name: '🏷️ ID Cargo', value: dados.cargoDesejado }
)
.setTimestamp();
const botoes = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId(aprovarTransf-${dados.cargoDesejado}).setLabel('Aprovar Transferência').setStyle(ButtonStyle.Success),
new ButtonBuilder().setCustomId('reprovar').setLabel('Reprovar').setStyle(ButtonStyle.Danger)
);
await canal.send({ embeds: [embed], components: [botoes] });
delete dadosTemp[interaction.user.id];
return interaction.reply({ content: ✅ Canal de transferência criado!\n🏢 Origem: **${nomeOrigem}**\n🏷️ Cargo: **${roleDesejada.name}**, flags: 64 });
}
// ===== 5º PASSO: APROVAR TRANSFERÊNCIA =====
if (interaction.isButton() && interaction.customId.startsWith('aprovarTransf-')) {
const temPermissao = interaction.member.roles.cache.some(role =>
config.cargosRecrutadores.includes(role.id)
);
if (!temPermissao) {
return interaction.reply({ content: '❌ Você não possui permissão para aprovar transferências.', flags: 64 });
}
await interaction.deferUpdate();
const cargoEscolhido = interaction.customId.replace('aprovarTransf-', '').trim();
const sistemaT = config.cargosTransferencia?.[cargoEscolhido];
if (!sistemaT) {
return interaction.followUp({ content: ❌ **Cargo de transferência não configurado no config.json.** ID: \${cargoEscolhido}``, flags: 64 });
}
const rolePrincipal = interaction.guild.roles.cache.get(cargoEscolhido);
if (!rolePrincipal) {
return interaction.followUp({ content: ❌ O cargo configurado não existe no Discord. ID: \${cargoEscolhido}``, flags: 64 });
}
const membro = await interaction.guild.members.fetch(interaction.channel.topic).catch(() => null);
if (!membro) return interaction.followUp({ content: '❌ Membro dono do ticket não encontrado.', flags: 64 });
const embed = interaction.message.embeds[0];
if (!embed) return interaction.followUp({ content: '❌ Ficha de transferência não encontrada.', flags: 64 });
const getField = (n) => embed.data?.fields?.find(f => f.name === n)?.value || '';
const nome = getField('👤 Nome');
const sobrenome = getField('👤 Sobrenome');
const id = getField('🆔 ID');
const telefone = getField('📱 Telefone');
const origemID = getField('🏢 ID Origem');
const origemNome = getField('🏢 Instituição de Origem');
// ===== MAPA DE SIGLAS (Mapeia o ID ou Nome da Origem para a Sigla desejada) =====
const mapaSiglas = {
"1554288806167846952": "TR.PRF",
"1554288699745771701": "TR.PM",
"1554288753672065084": "TR.PC",
"1554288869917065236": "TR.EB"
};
// Fallback dinâmico caso a config traga nomes textuais conhecidos
let sigla = mapaSiglas[origemID] || "TR";
if (sigla === "TR") {
if (origemNome.toUpperCase().includes("PRF")) sigla = "TR.PRF";
else if (origemNome.toUpperCase().includes("PM")) sigla = "TR.PM";
else if (origemNome.toUpperCase().includes("PC")) sigla = "TR.PC";
else if (origemNome.toUpperCase().includes("EB")) sigla = "TR.EB";
}
// ===== DEFINIÇÃO DO NICKNAME =====
let nickname = [${sigla}] ${nome} | ${id};
if (nickname.length > 32) nickname = [${sigla}] ${nome}.substring(0, 32);
await membro.setNickname(nickname).catch(err => console.error('❌ Erro no nickname:', err.message));
// ===== ADIÇÃO DOS CARGOS =====
const cargosIDs = [cargoEscolhido, ...(Array.isArray(sistemaT.extra) ? sistemaT.extra : [])];
const cargosValidos = [];
for (const cid of cargosIDs) {
const cargo = interaction.guild.roles.cache.get(String(cid));
if (cargo) cargosValidos.push(cargo);
}
const botMember = interaction.guild.members.me;
const cargosBloqueados = cargosValidos.filter(cargo => cargo.position >= botMember.roles.highest.position);
if (cargosBloqueados.length > 0) {
return interaction.followUp({
content: ❌ Não consigo adicionar os cargos pois estão acima da minha hierarquia:\n${cargosBloqueados.map(c => • ${c.name}).join('\n')},
flags: 64
});
}
await membro.roles.add(cargosValidos).catch(async (erro) => {
console.error('❌ Erro ao adicionar cargos:', erro);
return interaction.followUp({ content: '❌ O Discord recusou a adição dos cargos. Verifique a hierarquia do bot.', flags: 64 });
});
// ===== REGISTRO CENTRAL DE TRANSFERÊNCIA =====
const canalRegistro = interaction.guild.channels.cache.get('1554307411202805821');
if (canalRegistro && typeof canalRegistro.send === 'function') {
const linha = | ----------------------------------------------------------------|;
const mensagem = \n📜 **Registro de Transferência**\n\n👤 **Nome:** ${nome}\n🆔 **Sobrenome:** ${sobrenome}\n🆔 **ID:** ${id}\n📞 **Telefone:** ${telefone}\n🏷️ **Cargo:** ${sistemaT.nome || rolePrincipal.name}\n🏢 **Origem:** ${origemNome}\n🧑‍💼 **Aprovado por:** ${interaction.member.displayName}\n\n${linha}\n;
await canalRegistro.send(mensagem).catch(err => console.error("Erro ao enviar no Registro Central:", err));
}
// ===== LOG DE APROVAÇÕES =====
const log = interaction.guild.channels.cache.get(config.logAprovacoes);
if (log && typeof log.send === 'function') {
await log.send(🔄 **Transferência Aprovada**\n👤 ${membro.user.tag} aprovado por ${interaction.user.tag}\nCargo: ${sistemaT.nome || rolePrincipal.name}\nApelido: ${nickname}).catch(err => console.error("Erro ao enviar no Log:", err));
}
// ===== FINALIZAÇÃO DO PROCESSO =====
await interaction.message.edit({
content: ✅ **TRANSFERÊNCIA APROVADA!**\n\n👤 **${nome} ${sobrenome}**\n🆔 **ID:** ${id}\n🏢 **Origem:** ${origemNome}\n🏷️ **Cargo:** ${rolePrincipal.name},
components: []
});
setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
}
    } catch (err) {
      console.error('💥 ERRO DETALHADO:', err);

      if (interaction && !interaction.replied) {
        interaction.reply({ content: `❌ Erro: ${err.message}`, flags: 64 }).catch(() => {});
      }
    }
  });
};
