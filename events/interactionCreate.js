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
      // ===== 1º PASSO: CLIQUE NO BOTÃO INICIAR TRANSFERÊNCIA =====
      // ========================================================
      if (interaction.isButton() && interaction.customId === 'abrir_transferencia') {
        const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');

        // Monta as opções dinamicamente usando os IDs dos cargos configurados
        const opcoesOrigem = Object.entries(config.instituicoesOrigem).map(([id, nome]) => ({
          label: nome,
          value: String(id) // Passa o ID puro do cargo como valor
        }));

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

      // ========================================================
      // ===== 2º PASSO: APÓS SELECIONAR A ORIGEM, ESCOLHE O CARGO =====
      // ========================================================
      if (interaction.isStringSelectMenu() && interaction.customId === 'transf_select_origem') {
        const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
        
        const dados = dadosTemp[interaction.user.id];
        if (!dados) return interaction.reply({ content: '❌ Sessão expirada. Inicie novamente.', flags: 64 });

        // Guarda o ID do cargo de origem selecionado
        dados.origemBatalhaoID = interaction.values; 
        
        // Pega o nome amigável para exibir na mensagem de transição
        const nomeInstituicao = config.instituicoesOrigem[dados.origemBatalhaoID] || 'Instituição Desconhecida';

        // Monta a lista de cargos desejados
        const cargosOptions = Object.entries(config.cargosSistema).map(([id, data]) => {
          const role = interaction.guild.roles.cache.get(id);
          return {
            label: role ? role.name : data.nome,
            value: String(id)
          };
        });

        const selectCargo = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('transf_select_cargo')
            .setPlaceholder('Selecione o cargo desejado')
            .addOptions(cargosOptions)
        );

        return interaction.update({
          content: `🏢 Origem selecionada: **${nomeInstituicao}**\n\nAgora, selecione o **Cargo Desejado**:`,
          components: [selectCargo]
        });
      }


      // ========================================================
            // ========================================================
      // ===== 3º PASSO: APÓS ESCOLHER O CARGO, ABRE O MODAL DADOS =====
      // ========================================================
      if (interaction.isStringSelectMenu() && interaction.customId === 'transf_select_cargo') {
        const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

        const dados = dadosTemp[interaction.user.id];
        if (!dados) return interaction.reply({ content: '❌ Sessão expirada. Inicie novamente.', flags: 64 });

        // GARANTIA: Extrai a string pura tirando-a de dentro do Array retornado pelo select menu
        dados.cargoDesejado = String(interaction.values[0]).trim(); 

        const modal = new ModalBuilder()
          .setCustomId('transf_modal_dados')
          .setTitle('📝 Dados do Transferido');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('nome').setLabel('Nome').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('sobrenome').setLabel('Sobrenome').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('id').setLabel('ID (somente números)').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('telefone').setLabel('Telefone (in-game)').setStyle(TextInputStyle.Short).setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }

      // ========================================================
            // ========================================================
      // ===== 4º PASSO: RECEBE O MODAL E CRIA O TICKET DE TRANSF =====
      // ========================================================
      if (interaction.isModalSubmit() && interaction.customId === 'transf_modal_dados') {
        const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

        const dados = dadosTemp[interaction.user.id];
        if (!dados) return interaction.reply({ content: '❌ Dados expirados.', flags: 64 });

        const nome = interaction.fields.getTextInputValue('nome');
        const sobrenome = interaction.fields.getTextInputValue('sobrenome');
        const id = interaction.fields.getTextInputValue('id').trim(); // .trim() remove espaços invisíveis
        const telefone = interaction.fields.getTextInputValue('telefone');

        // NOVA VALIDAÇÃO BLINDADA: Se não for um número válido ou se estiver vazio
        if (isNaN(id) || id === '') {
          return interaction.reply({ content: '❌ ID inválido! Digite apenas números no campo de ID.', flags: 64 });
        }

        const nomeCanal = `transf-${nome.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
        const canal = await interaction.guild.channels.create({
          name: nomeCanal,
          topic: interaction.user.id,
          type: ChannelType.GuildText,
          parent: config.categoriaTickets,
          permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            { id: interaction.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
            ...config.cargosRecrutadores.map(c => ({ id: c, allow: [PermissionsBitField.Flags.ViewChannel] }))
          ]
        });

        const roleDesejada = interaction.guild.roles.cache.get(dados.cargoDesejado);
        const cargoOrigemMencao = dados.origemBatalhaoID ? `<@&${dados.origemBatalhaoID}>` : 'Não informado';

        const embed = new EmbedBuilder()
          .setTitle('🔄 Nova Transferência Externa')
          .setColor(0x3498db)
          .addFields(
            { name: 'Nome', value: nome },
            { name: 'Sobrenome', value: sobrenome },
            { name: 'ID', value: id },
            { name: 'Telefone', value: telefone },
            { name: '🏢 Vindo de (Origem)', value: cargoOrigemMencao },
            { name: '🏷️ Cargo Desejado', value: roleDesejada ? roleDesejada.name : dados.cargoDesejado }
          );

        const botoes = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`aprovarTransf-${dados.cargoDesejado}`)
            .setLabel('Aprovar Transferência')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('reprovar')
            .setLabel('Reprovar')
            .setStyle(ButtonStyle.Danger)
        );

        await canal.send({ embeds: [embed], components: [botoes] });
        
        delete dadosTemp[interaction.user.id];

        return interaction.reply({ content: '✅ Canal de transferência criado!', flags: 64 });
      }

           // ========================================================
      // ===== 5º PASSO: RECRUTADOR CLICA EM APROVAR TRANSFERÊNCIA =====
      // ========================================================
      if (interaction.isButton() && interaction.customId.startsWith('aprovarTransf-')) {
        const temPermissao = interaction.member.roles.cache.some(role =>
          config.cargosRecrutadores.includes(role.id)
        );

        if (!temPermissao) {
          return interaction.reply({ content: '❌ Sem permissão.', flags: 64 });
        }

        await interaction.deferUpdate();

        // BLINDAGEM 1: Extrai de forma isolada apenas os numerais do ID do cargo contidos no customId
        const idLimpoMatch = interaction.customId.match(/\d+/);
        if (!idLimpoMatch) return console.log('⚠️ Nenhum ID de cargo numérico foi encontrado no customId.');
        const cargoEscolhido = String(idLimpoMatch[0]);

        const membro = interaction.guild.members.cache.get(interaction.channel.topic);
        if (!membro) return console.log('⚠️ Membro dono do ticket não encontrado no servidor.');

        const embedOriginal = interaction.message.embeds[0];
        if (!embedOriginal) return console.log('⚠️ Nenhuma embed encontrada na mensagem.');

        const getField = (n) => embedOriginal.fields.find(f => f.name === n)?.value || '';

        const id = getField('ID');
        const nome = getField('Nome');
        const origemBatalhao = getField('🏢 Vindo de (Origem)');

        // BLINDAGEM 2: Agora que a string está tratada, fazemos a busca exata
        const sistema = config.cargosSistema[cargoEscolhido];
        if (!sistema) {
          console.log(`❌ ERRO CRÍTICO: O ID numérico puro extraído foi: "${cargoEscolhido}"`);
          console.log(`⚠️ Esse ID não corresponde a nenhuma chave configurada em config.cargosSistema.`);
          return;
        }

        // Formata o nickname
        let nickname = `[${sistema.nome}] ${nome} | ${id}`;
        if (nickname.length > 32) nickname = `[${sistema.nome}] ${nome}`.slice(0, 32);
        await membro.setNickname(nickname).catch((err) => console.error("Erro ao alterar nickname:", err.message));

        const cargos = [
          cargoEscolhido,
          ...(sistema.extra || [])
        ];
        await membro.roles.add(cargos).catch((err) => console.error("Erro ao adicionar cargos:", err.message));

        // ===== REGISTRO CENTRAL DE TRANSFERÊNCIA =====
        const canalRegistro = interaction.guild.channels.cache.get('1554307411202805821');
        if (canalRegistro && typeof canalRegistro.send === 'function') {
          const linha = `| ----------------------------------------------------------------|`;
          const mensagem = `\n🔄 **Registro de Transferência**\n\n👤 **Nome:** ${nome}\n🆔 **ID:** ${id}\n🏢 **Origem:** ${origemBatalhao}\n🏷️ **Cargo Concedido:** ${sistema.nome}\n🧑‍💼 **Processado por:** ${interaction.member.displayName}\n\n${linha}\n`;
          await canalRegistro.send(mensagem).catch(err => console.error("Erro no Registro Central:", err));
        }

        // ===== LOG DE APROVAÇÕES =====
        const log = interaction.guild.channels.cache.get(config.logAprovacoes);
        if (log && typeof log.send === 'function') {
          await log.send(`🔄 ${membro.user.tag} transferido da **${origemBatalhao}** por ${interaction.user.tag}\nCargo: ${sistema.nome}`).catch(err => console.error(err));
        }

        await interaction.message.edit({ content: '✅ Transferência Finalizada!', components: [] });
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
