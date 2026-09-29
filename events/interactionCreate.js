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
// ===== 1º PASSO: CLIQUE NO BOTÃO INICIAR TRANSFERÊNCIA
// ========================================================
if (
  interaction.isButton() &&
  interaction.customId === 'abrir_transferencia'
) {
  const {
    StringSelectMenuBuilder,
    ActionRowBuilder
  } = require('discord.js');

  // Monta as opções de instituições de origem
  const opcoesOrigem = Object.entries(
    config.instituicoesOrigem || {}
  ).map(([id, nome]) => ({
    label: String(nome).slice(0, 100),
    value: String(id)
  }));

  if (opcoesOrigem.length === 0) {
    return interaction.reply({
      content: '❌ Nenhuma instituição de origem está configurada.',
      flags: 64
    });
  }

  const selectOrigem =
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('transf_select_origem')
        .setPlaceholder('Selecione sua instituição de origem')
        .addOptions(opcoesOrigem)
    );

  // Inicia a sessão temporária
  dadosTemp[interaction.user.id] = {
    tipoFlow: 'transferencia'
  };

  return interaction.reply({
    content:
      '🏢 **Para iniciar sua transferência, selecione sua instituição de origem:**',
    components: [selectOrigem],
    flags: 64
  });
}


// ========================================================
// ===== 2º PASSO: SELECIONA A INSTITUIÇÃO DE ORIGEM
// ========================================================
if (
  interaction.isStringSelectMenu() &&
  interaction.customId === 'transf_select_origem'
) {
  const {
    StringSelectMenuBuilder,
    ActionRowBuilder
  } = require('discord.js');

  const dados = dadosTemp[interaction.user.id];

  if (!dados) {
    return interaction.reply({
      content:
        '❌ Sua sessão expirou. Clique novamente em iniciar transferência.',
      flags: 64
    });
  }

  // IMPORTANTE:
  // interaction.values é ARRAY.
  // Aqui precisamos salvar somente o primeiro valor.
  dados.origemBatalhaoID = String(
    interaction.values[0]
  ).trim();

  console.log(
    '🏢 Instituição de origem selecionada:',
    dados.origemBatalhaoID
  );

  // Nome da instituição
  const nomeInstituicao =
    config.instituicoesOrigem?.[dados.origemBatalhaoID] ||
    'Instituição Desconhecida';

  // ======================================================
  // MONTA OS CARGOS DISPONÍVEIS PARA TRANSFERÊNCIA
  // ======================================================

  const cargosConfigurados =
    config.cargosTransferencia || {};

  const cargosOptionsT = Object.entries(
    cargosConfigurados
  ).map(([id, data]) => {

    const role =
      interaction.guild.roles.cache.get(String(id));

    return {
      label: String(
        role?.name ||
        data?.nome ||
        'Cargo não definido'
      ).slice(0, 100),

      value: String(id)
    };
  });

  if (cargosOptionsT.length === 0) {
    return interaction.update({
      content:
        '❌ Nenhum cargo de transferência está configurado.',
      components: []
    });
  }

  const selectCargoT =
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('transf_select_cargo')
        .setPlaceholder('Selecione o cargo desejado')
        .addOptions(cargosOptionsT)
    );

  return interaction.update({
    content:
      `🏢 **Origem selecionada:** ${nomeInstituicao}\n\n` +
      `🏷️ **Agora, selecione o Cargo Desejado:**`,
    components: [selectCargoT]
  });
}


// ========================================================
// ===== 3º PASSO: SELECIONA O CARGO E ABRE O MODAL
// ========================================================
if (
  interaction.isStringSelectMenu() &&
  interaction.customId === 'transf_select_cargo'
) {
  const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
  } = require('discord.js');

  const dados = dadosTemp[interaction.user.id];

  if (!dados) {
    return interaction.reply({
      content:
        '❌ Sua sessão expirou. Inicie a transferência novamente.',
      flags: 64
    });
  }

  // Pega somente o valor selecionado
  dados.cargoDesejado =
    String(interaction.values[0]).trim();

  console.log(
    '🏷️ Cargo desejado selecionado:',
    dados.cargoDesejado
  );

  // Confirma se o cargo existe na configuração
  const sistema =
    config.cargosTransferencia?.[dados.cargoDesejado];

  if (!sistema) {
    console.error(
      '❌ Cargo selecionado não existe em config.cargosTransferencia:',
      dados.cargoDesejado
    );

    return interaction.reply({
      content:
        `❌ O cargo selecionado não está configurado.\n\n` +
        `ID recebido: \`${dados.cargoDesejado}\``,
      flags: 64
    });
  }

  const modal =
    new ModalBuilder()
      .setCustomId('transf_modal_dados')
      .setTitle('📝 Dados do Transferido');

  modal.addComponents(

    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('nome')
        .setLabel('Nome')
        .setPlaceholder('Digite o nome')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(50)
    ),

    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('sobrenome')
        .setLabel('Sobrenome')
        .setPlaceholder('Digite o sobrenome')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(50)
    ),

    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('id')
        .setLabel('ID (somente números)')
        .setPlaceholder('Exemplo: 1234')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(10)
    ),

    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('telefone')
        .setLabel('Telefone (in-game)')
        .setPlaceholder('Digite o telefone')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(30)
    )
  );

  return interaction.showModal(modal);
}


// ========================================================
// ===== 4º PASSO: RECEBE O MODAL E CRIA O TICKET
// ========================================================
if (
  interaction.isModalSubmit() &&
  interaction.customId === 'transf_modal_dados'
) {
  const {
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ChannelType,
    PermissionsBitField
  } = require('discord.js');

  const dados =
    dadosTemp[interaction.user.id];

  if (!dados) {
    return interaction.reply({
      content:
        '❌ Os dados da transferência expiraram.',
      flags: 64
    });
  }

  // ======================================================
  // PEGA DADOS DO MODAL
  // ======================================================

  const nome =
    interaction.fields
      .getTextInputValue('nome')
      .trim();

  const sobrenome =
    interaction.fields
      .getTextInputValue('sobrenome')
      .trim();

  const id =
    interaction.fields
      .getTextInputValue('id')
      .trim();

  const telefone =
    interaction.fields
      .getTextInputValue('telefone')
      .trim();

  // ======================================================
  // VALIDA ID
  // ======================================================

  if (!/^\d+$/.test(id)) {
    return interaction.reply({
      content:
        '❌ ID inválido! Digite somente números.',
      flags: 64
    });
  }

  // ======================================================
  // VALIDA ORIGEM
  // ======================================================

  if (!dados.origemBatalhaoID) {
    return interaction.reply({
      content:
        '❌ A instituição de origem não foi identificada.',
      flags: 64
    });
  }

  // ======================================================
  // VALIDA CARGO
  // ======================================================

  if (!dados.cargoDesejado) {
    return interaction.reply({
      content:
        '❌ O cargo desejado não foi identificado.',
      flags: 64
    });
  }

  const sistema =
    config.cargosTransferencia?.[
      dados.cargoDesejado
    ];

  if (!sistema) {
    return interaction.reply({
      content:
        `❌ O cargo \`${dados.cargoDesejado}\` não está configurado.`,
      flags: 64
    });
  }

  // ======================================================
  // BUSCA O CARGO NO SERVIDOR
  // ======================================================

  const roleDesejada =
    interaction.guild.roles.cache.get(
      dados.cargoDesejado
    );

  if (!roleDesejada) {
    return interaction.reply({
      content:
        `❌ O cargo configurado não existe no servidor.\n\n` +
        `ID: \`${dados.cargoDesejado}\``,
      flags: 64
    });
  }

  // ======================================================
  // NOME DO CANAL
  // ======================================================

  let nomeCanal =
    `transf-${nome}-${sobrenome}`
      .replace(/[^a-zA-Z0-9-]/g, '')
      .toLowerCase();

  if (nomeCanal.length > 90) {
    nomeCanal =
      nomeCanal.substring(0, 90);
  }

  // ======================================================
  // CRIA TICKET
  // ======================================================

  const canal =
    await interaction.guild.channels.create({
      name: nomeCanal,

      // Guardamos o ID do usuário no tópico
      topic: interaction.user.id,

      type: ChannelType.GuildText,

      parent: config.categoriaTickets,

      permissionOverwrites: [

        {
          id: interaction.guild.id,

          deny: [
            PermissionsBitField.Flags.ViewChannel
          ]
        },

        {
          id: interaction.user.id,

          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        },

        {
          id: interaction.client.user.id,

          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        },

        ...(
          config.cargosRecrutadores || []
        ).map(cargoID => ({
          id: cargoID,

          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        }))
      ]
    });

  // ======================================================
  // MENÇÃO DA ORIGEM
  // ======================================================

  const cargoOrigemMencao =
    interaction.guild.roles.cache.has(
      dados.origemBatalhaoID
    )
      ? `<@&${dados.origemBatalhaoID}>`
      : 'Não informado';

  // ======================================================
  // EMBED
  // ======================================================

  const embed =
    new EmbedBuilder()
      .setTitle(
        '🔄 Nova Solicitação de Transferência'
      )
      .setColor(0x3498db)
      .addFields(

        {
          name: '👤 Nome',
          value: nome || 'Não informado',
          inline: true
        },

        {
          name: '👤 Sobrenome',
          value: sobrenome || 'Não informado',
          inline: true
        },

        {
          name: '🆔 ID',
          value: id || 'Não informado',
          inline: true
        },

        {
          name: '📱 Telefone',
          value: telefone || 'Não informado',
          inline: true
        },

        {
          name: '🏢 Instituição de Origem',
          value: cargoOrigemMencao,
          inline: true
        },

        {
          name: '🏢 ID da Origem',
          value: String(
            dados.origemBatalhaoID
          ),
          inline: true
        },

        {
          name: '🏷️ Cargo Desejado',
          value: roleDesejada.name,
          inline: true
        },

        {
          name: '🏷️ ID do Cargo',
          value: String(
            dados.cargoDesejado
          ),
          inline: true
        }
      )
      .setFooter({
        text:
          `Solicitação criada por ${interaction.user.tag}`
      })
      .setTimestamp();

  // ======================================================
  // BOTÕES
  // ======================================================

  const botoes =
    new ActionRowBuilder().addComponents(

      new ButtonBuilder()
        .setCustomId(
          `aprovarTransf-${dados.cargoDesejado}`
        )
        .setLabel(
          'Aprovar Transferência'
        )
        .setStyle(
          ButtonStyle.Success
        ),

      new ButtonBuilder()
        .setCustomId(
          'reprovar'
        )
        .setLabel(
          'Reprovar'
        )
        .setStyle(
          ButtonStyle.Danger
        )
    );

  // ======================================================
  // ENVIA TICKET
  // ======================================================

  await canal.send({
    embeds: [embed],
    components: [botoes]
  });

  // Apaga sessão temporária
  delete dadosTemp[interaction.user.id];

  return interaction.reply({
    content:
      `✅ **Canal de transferência criado!**\n\n` +
      `🏷️ Cargo solicitado: **${roleDesejada.name}**`,
    flags: 64
  });
}


// ========================================================
// ===== 5º PASSO: APROVAR TRANSFERÊNCIA
// ========================================================
if (
  interaction.isButton() &&
  interaction.customId.startsWith('aprovarTransf-')
) {

  const {
    EmbedBuilder
  } = require('discord.js');

  // ======================================================
  // 1. VERIFICA PERMISSÃO
  // ======================================================

  const temPermissao =
    interaction.member.roles.cache.some(
      role =>
        (config.cargosRecrutadores || [])
          .includes(role.id)
    );

  if (!temPermissao) {
    return interaction.reply({
      content:
        '❌ Você não possui permissão para aprovar transferências.',
      flags: 64
    });
  }

  // ======================================================
  // 2. PEGA O ID DO CARGO
  // ======================================================

  const cargoEscolhido =
    interaction.customId
      .replace(
        'aprovarTransf-',
        ''
      )
      .trim();

  console.log(
    '========================================'
  );

  console.log(
    '🔄 APROVAÇÃO DE TRANSFERÊNCIA'
  );

  console.log(
    'Custom ID:',
    interaction.customId
  );

  console.log(
    'Cargo escolhido:',
    cargoEscolhido
  );

  console.log(
    '========================================'
  );

  if (!/^\d+$/.test(cargoEscolhido)) {
    return interaction.reply({
      content:
        '❌ O ID do cargo recebido é inválido.',
      flags: 64
    });
  }

  // ======================================================
  // 3. BUSCA CONFIGURAÇÃO
  // ======================================================

  const sistema =
    config.cargosTransferencia?.[
      cargoEscolhido
    ];

  if (!sistema) {

    console.error(
      '❌ CARGO NÃO ENCONTRADO NO CONFIG'
    );

    console.error(
      'ID recebido:',
      cargoEscolhido
    );

    console.error(
      'Cargos configurados:',
      Object.keys(
        config.cargosTransferencia || {}
      )
    );

    return interaction.reply({
      content:
        `❌ Este cargo não está configurado no sistema.\n\n` +
        `ID recebido: \`${cargoEscolhido}\``,
      flags: 64
    });
  }

  console.log(
    '✅ Configuração encontrada:',
    sistema
  );

  // ======================================================
  // 4. BUSCA CARGO NO DISCORD
  // ======================================================

  const rolePrincipal =
    interaction.guild.roles.cache.get(
      cargoEscolhido
    );

  if (!rolePrincipal) {

    console.error(
      `❌ Cargo ${cargoEscolhido} não encontrado no servidor.`
    );

    return interaction.reply({
      content:
        `❌ O cargo não foi encontrado no servidor.\n\n` +
        `ID: \`${cargoEscolhido}\``,
      flags: 64
    });
  }

  console.log(
    `✅ Cargo encontrado: ${rolePrincipal.name}`
  );

  // ======================================================
  // 5. VERIFICA HIERARQUIA DO BOT
  // ======================================================

  const botMember =
    interaction.guild.members.me;

  if (!botMember) {
    return interaction.reply({
      content:
        '❌ Não consegui identificar o membro do bot.',
      flags: 64
    });
  }

  if (
    rolePrincipal.position >=
    botMember.roles.highest.position
  ) {

    console.error(
      '❌ HIERARQUIA INSUFICIENTE'
    );

    console.error(
      'Cargo:',
      rolePrincipal.name,
      rolePrincipal.position
    );

    console.error(
      'Cargo mais alto do bot:',
      botMember.roles.highest.name,
      botMember.roles.highest.position
    );

    return interaction.reply({
      content:
        `❌ Não posso adicionar **${rolePrincipal.name}**.\n\n` +
        `O cargo do bot precisa estar **acima** desse cargo na hierarquia do servidor.`,
      flags: 64
    });
  }

  // ======================================================
  // 6. BUSCA MEMBRO DONO DO TICKET
  // ======================================================

  const membro =
    await interaction.guild.members
      .fetch(interaction.channel.topic)
      .catch(() => null);

  if (!membro) {
    return interaction.reply({
      content:
        '❌ Não foi possível encontrar o membro dono deste ticket.',
      flags: 64
    });
  }

  console.log(
    `👤 Membro encontrado: ${membro.user.tag}`
  );

  // ======================================================
  // 7. PEGA EMBED
  // ======================================================

  const embed =
    interaction.message.embeds[0];

  if (!embed) {
    return interaction.reply({
      content:
        '❌ Não encontrei a ficha da transferência.',
      flags: 64
    });
  }

  // ======================================================
  // 8. FUNÇÃO PARA LER CAMPOS
  // ======================================================

  const getField =
    nomeCampo =>
      embed.data?.fields?.find(
        field =>
          field.name === nomeCampo
      )?.value || '';

  const id =
    getField('🆔 ID');

  const nome =
    getField('👤 Nome');

  const sobrenome =
    getField('👤 Sobrenome');

  const telefone =
    getField('📱 Telefone');

  const cargoOrigem =
    getField(
      '🏢 Instituição de Origem'
    );

  // ======================================================
  // 9. SIGLAS
  // ======================================================

  const mapaSiglas = {

    "1554288806167846952":
      "TR.PRF",

    "1554288699745771701":
      "TR.PM",

    "1554288753672065084":
      "TR.PC",

    "1554288869917065236":
      "TR.EB"
  };

  const siglaOrigem =
    mapaSiglas[cargoEscolhido] ||
    'TR';

  // ======================================================
  // 10. NICKNAME
  // ======================================================

  let nickname =
    `[${siglaOrigem}] ${nome} | ${id}`;

  if (nickname.length > 32) {
    nickname =
      nickname.substring(0, 32);
  }

  await membro
    .setNickname(nickname)
    .catch(err => {

      console.error(
        '❌ Erro ao alterar nickname:',
        err.message
      );

    });

  // ======================================================
  // 11. MONTA CARGOS
  // ======================================================

  const cargosParaAdicionar = [

    cargoEscolhido,

    ...(
      Array.isArray(sistema.extra)
        ? sistema.extra
        : []
    )
  ]
    .map(String)
    .filter(
      id =>
        /^\d+$/.test(id)
    );

  console.log(
    '🎖️ Cargos para adicionar:',
    cargosParaAdicionar
  );

  // ======================================================
  // 12. VALIDA CARGOS
  // ======================================================

  const cargosValidos =
    [];

  for (
    const cargoID
    of cargosParaAdicionar
  ) {

    const cargo =
      interaction.guild.roles.cache.get(
        cargoID
      );

    if (!cargo) {

      console.error(
        `❌ Cargo não encontrado: ${cargoID}`
      );

      continue;
    }

    // Verifica hierarquia
    if (
      cargo.position >=
      botMember.roles.highest.position
    ) {

      console.error(
        `❌ Cargo acima do bot: ${cargo.name}`
      );

      continue;
    }

    cargosValidos.push(
      cargo
    );
  }

  if (
    cargosValidos.length === 0
  ) {

    return interaction.reply({
      content:
        '❌ Nenhum dos cargos configurados pode ser adicionado pelo bot.',
      flags: 64
    });
  }

  console.log(
    '✅ Cargos válidos:',
    cargosValidos.map(
      cargo =>
        `${cargo.name} (${cargo.id})`
    )
  );

  // ======================================================
  // 13. ADICIONA CARGOS
  // ======================================================

  try {

    await membro.roles.add(
      cargosValidos
    );

    console.log(
      `✅ Cargos adicionados com sucesso para ${membro.user.tag}`
    );

  } catch (err) {

    console.error(
      '❌ ERRO AO ADICIONAR CARGOS:',
      err
    );

    return interaction.reply({
      content:
        '❌ Não consegui adicionar os cargos.\n\n' +
        'Verifique a permissão **Gerenciar Cargos** e a posição dos cargos na hierarquia.',
      flags: 64
    });
  }

  // ======================================================
  // 14. REGISTRO CENTRAL
  // ======================================================

  const canalRegistro =
    interaction.guild.channels.cache.get(
      '1554307411202805821'
    );

  if (
    canalRegistro &&
    typeof canalRegistro.send === 'function'
  ) {

    const linha =
      '------------------------------------------------';

    const mensagem =
      `🔄 **REGISTRO DE TRANSFERÊNCIA**\n\n` +

      `👤 **Nome:** ${nome} ${sobrenome}\n` +

      `🆔 **ID:** ${id}\n` +

      `📱 **Telefone:** ${telefone}\n` +

      `🏢 **Origem:** ${cargoOrigem || 'Não informada'}\n` +

      `🏷️ **Cargo Concedido:** ${rolePrincipal.name}\n` +

      `🧑‍💼 **Processado por:** ${interaction.member.displayName}\n\n` +

      `${linha}`;

    await canalRegistro
      .send(mensagem)
      .catch(err =>
        console.error(
          '❌ Erro no Registro Central:',
          err
        )
      );
  }

  // ======================================================
  // 15. LOG DE APROVAÇÃO
  // ======================================================

  const log =
    interaction.guild.channels.cache.get(
      config.logAprovacoes
    );

  if (
    log &&
    typeof log.send === 'function'
  ) {

    await log
      .send(
        `🔄 **Transferência aprovada**\n\n` +
        `👤 ${membro.user.tag}\n` +
        `🆔 ID: ${id}\n` +
        `🏷️ Cargo: ${rolePrincipal.name}\n` +
        `🧑‍💼 Processado por: ${interaction.user.tag}`
      )
      .catch(err =>
        console.error(
          '❌ Erro no log de aprovação:',
          err
        )
      );
  }

  // ======================================================
  // 16. FINALIZA TICKET
  // ======================================================

  await interaction.message.edit({

    content:
      `✅ **TRANSFERÊNCIA APROVADA!**\n\n` +

      `👤 **${nome} ${sobrenome}**\n` +

      `🆔 **ID:** ${id}\n` +

      `🏷️ **Cargo:** ${rolePrincipal.name}\n\n` +

      `Processado por: ${interaction.member.displayName}`,

    components: []
  });

  // ======================================================
  // 17. DELETA TICKET
  // ======================================================

  setTimeout(() => {

    interaction.channel
      .delete()
      .catch(() => {});

  }, 5000);
}

    } catch (err) {
      console.error('💥 ERRO DETALHADO:', err);

      if (interaction && !interaction.replied) {
        interaction.reply({ content: `❌ Erro: ${err.message}`, flags: 64 }).catch(() => {});
      }
    }
  });
};
