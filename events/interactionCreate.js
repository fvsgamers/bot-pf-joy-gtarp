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
           // parent: config.categoriaTickets,
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

        let nickname = `[${sistema.nome}] ${id} | ${sobrenome}`;
        if (nickname.length > 32) nickname = `[${sistema.nome}] ${sobrenome}`.slice(0, 32);

        await membro.setNickname(nickname).catch(() => {});

        const cargos = [
          cargoEscolhido,
          //config.cargoAprovado,
          ...(sistema.extra || [])
        ];

        await membro.roles.add(cargos);
        //await membro.roles.remove(config.cargoRemover);

        // ===== REGISTRO CENTRAL =====
        const canalRegistro = interaction.guild.channels.cache.get('1554300382954659951');

        // Adicionada a trava de segurança para garantir que .send() exista
        if (canalRegistro && typeof canalRegistro.send === 'function') {
          const linha = `| ----------------------------------------------------------------|`;

          const mensagem = `\n📜 **Registro**\n\n👤 **Nome:** ${nome}\n🆔 **Sobrenome:** ${sobrenome}\n🆔 **ID:** ${id}\n📞 **Telefone:** ${telefone}\n🏷️ **Cargo:** ${sistema.nome}\n🧑‍💼 **Aprovado por:** ${interaction.member.displayName}\n\n${linha}\n`;

          await canalRegistro.send(mensagem).catch(err => console.error("Erro ao enviar no Registro Central:", err));
        } else {
          console.warn("⚠️ O canal '1554300382954659951' não foi encontrado no cache ou não aceita mensagens (pode ser uma categoria). Pulando para não travar a finalização.");
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

    } catch (err) {
      console.error('💥 ERRO DETALHADO:', err);

      if (interaction && !interaction.replied) {
        interaction.reply({ content: `❌ Erro: ${err.message}`, flags: 64 }).catch(() => {});
      }
    }
  });
};

