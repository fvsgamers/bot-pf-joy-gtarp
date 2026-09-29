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

      // ============================================================
      // COMANDOS
      // ============================================================

      if (interaction.isChatInputCommand()) {

        const command =
          client.commands.get(
            interaction.commandName
          );

        if (command) {
          await command.execute(interaction);
        }

        return;
      }


      // ============================================================
      // ABRIR FORMULÁRIO DE REGISTRO
      // ============================================================

      if (
        interaction.isButton() &&
        interaction.customId === 'abrir_formulario'
      ) {

        const modal =
          new ModalBuilder()
            .setCustomId('formulario_registro')
            .setTitle('📋 Recrutamento');

        modal.addComponents(

          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('nome')
              .setLabel('Nome')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),

          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('sobrenome')
              .setLabel('Sobrenome')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),

          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('id')
              .setLabel('ID (somente números)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),

          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('telefone')
              .setLabel('Telefone (in-game)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }


      // ============================================================
      // MODAL DE REGISTRO
      // ============================================================

      if (
        interaction.isModalSubmit() &&
        interaction.customId === 'formulario_registro'
      ) {

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


        if (!/^\d+$/.test(id)) {

          return interaction.reply({
            content: '❌ ID inválido!',
            flags: 64
          });
        }


        await interaction.guild.members.fetch();


        // ========================================================
        // RECRUTADORES
        // ========================================================

        const recrutadores = [];

        for (
          const cargoId
          of config.cargosRecrutadores || []
        ) {

          const role =
            interaction.guild.roles.cache.get(
              cargoId
            );

          if (!role) continue;

          role.members.forEach(
            membro => recrutadores.push(membro)
          );
        }


        const unique =
          [
            ...new Map(
              recrutadores.map(
                membro => [
                  membro.id,
                  membro
                ]
              )
            ).values()
          ];


        const options =
          unique
            .slice(0, 25)
            .map(membro => ({
              label:
                membro.displayName.substring(0, 100),
              value:
                membro.id
            }));


        if (options.length === 0) {

          return interaction.reply({
            content:
              '❌ Nenhum recrutador encontrado!',
            flags: 64
          });
        }


        dadosTemp[interaction.user.id] = {
          nome,
          sobrenome,
          id,
          telefone,
          tipoFlow: 'registro'
        };


        const selectRecrutador =
          new ActionRowBuilder().addComponents(

            new StringSelectMenuBuilder()
              .setCustomId('select_recrutador')
              .setPlaceholder(
                'Selecione o recrutador'
              )
              .addOptions(options)
          );


        return interaction.reply({

          content:
            'Selecione o recrutador:',

          components:
            [selectRecrutador],

          flags: 64
        });
      }


      // ============================================================
      // SELECT MENUS
      // ============================================================

      if (interaction.isStringSelectMenu()) {

        const dados =
          dadosTemp[interaction.user.id];


        if (!dados) {

          return interaction.reply({
            content:
              '❌ Dados expiraram.',
            flags: 64
          });
        }


        // ========================================================
        // REGISTRO — SELECIONAR RECRUTADOR
        // ========================================================

        if (
          interaction.customId ===
          'select_recrutador'
        ) {

          dados.recrutador =
            interaction.values[0];


          const cargosOptions =
            Object.entries(
              config.cargosSistema || {}
            )
              .slice(0, 25)
              .map(([id, data]) => {

                const role =
                  interaction.guild.roles.cache.get(id);

                return {

                  label:
                    String(
                      role?.name ||
                      data?.nome ||
                      'Cargo'
                    ).substring(0, 100),

                  value:
                    String(id)
                };
              });


          const selectCargo =
            new ActionRowBuilder().addComponents(

              new StringSelectMenuBuilder()
                .setCustomId('select_cargo')
                .setPlaceholder(
                  'Selecione o cargo'
                )
                .addOptions(cargosOptions)
            );


          return interaction.update({

            content:
              'Agora selecione o cargo:',

            components:
              [selectCargo]
          });
        }


        // ========================================================
        // REGISTRO — SELECIONAR CARGO
        // ========================================================

        if (
          interaction.customId ===
          'select_cargo'
        ) {

          if (!dados.recrutador) {

            return interaction.reply({
              content:
                '❌ Selecione primeiro o recrutador.',
              flags: 64
            });
          }


          dados.cargo =
            interaction.values[0];


          const nomeCanal =
            `registro-${dados.nome}`
              .replace(
                /[^a-zA-Z0-9]/g,
                ''
              )
              .toLowerCase();


          const canal =
            await interaction.guild.channels.create({

              name:
                nomeCanal,

              topic:
                interaction.user.id,

              type:
                ChannelType.GuildText,

              parent:
                config.categoriaTickets,

              permissionOverwrites: [

                {
                  id:
                    interaction.guild.id,

                  deny: [
                    PermissionsBitField.Flags.ViewChannel
                  ]
                },

                {
                  id:
                    interaction.user.id,

                  allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                  ]
                },

                {
                  id:
                    interaction.client.user.id,

                  allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                  ]
                },

                ...(config.cargosRecrutadores || [])
                  .map(cargoId => ({

                    id:
                      cargoId,

                    allow: [
                      PermissionsBitField.Flags.ViewChannel,
                      PermissionsBitField.Flags.SendMessages,
                      PermissionsBitField.Flags.ReadMessageHistory
                    ]
                  }))
              ]
            });


          const role =
            interaction.guild.roles.cache.get(
              dados.cargo
            );


          const embed =
            new EmbedBuilder()

              .setTitle(
                '📋 Novo Registro'
              )

              .addFields(

                {
                  name: 'Nome',
                  value: dados.nome
                },

                {
                  name: 'Sobrenome',
                  value: dados.sobrenome
                },

                {
                  name: 'ID',
                  value: dados.id
                },

                {
                  name: 'Telefone',
                  value: dados.telefone
                },

                {
                  name: 'Recrutador',
                  value:
                    `<@${dados.recrutador}>`
                },

                {
                  name: 'Cargo',
                  value:
                    role
                      ? role.name
                      : dados.cargo
                }
              );


          const botoes =
            new ActionRowBuilder().addComponents(

              new ButtonBuilder()
                .setCustomId(
                  `aprovar_${dados.cargo}`
                )
                .setLabel('Aprovar')
                .setStyle(
                  ButtonStyle.Success
                ),

              new ButtonBuilder()
                .setCustomId(
                  'reprovar'
                )
                .setLabel('Reprovar')
                .setStyle(
                  ButtonStyle.Danger
                )
            );


          await canal.send({

            embeds:
              [embed],

            components:
              [botoes]
          });


          delete dadosTemp[
            interaction.user.id
          ];


          return interaction.reply({

            content:
              '✅ Ticket criado!',

            flags:
              64
          });
        }


        // ========================================================
        // TRANSFERÊNCIA — ORIGEM
        // ========================================================

        if (
          interaction.customId ===
          'transf_select_origem'
        ) {

          const origemID =
            String(
              interaction.values[0]
            ).trim();


          dados.tipoFlow =
            'transferencia';

          dados.origemBatalhaoID =
            origemID;


          const origemConfig =
            config.instituicoesOrigem?.[
              origemID
            ];


          const nomeInstituicao =
            typeof origemConfig === 'object'
              ? origemConfig.nome
              : origemConfig;


          console.log('');
          console.log(
            '========================================'
          );
          console.log(
            '🏢 ORIGEM DA TRANSFERÊNCIA'
          );
          console.log(
            'ID:',
            origemID
          );
          console.log(
            'Nome:',
            nomeInstituicao ||
            'Instituição Desconhecida'
          );
          console.log(
            '========================================'
          );


          // ======================================================
          // CARGOS DE TRANSFERÊNCIA
          // ======================================================

          const cargosTransferencia =
            config.cargosTransferencia || {};


          const opcoesCargo =
            Object.entries(
              cargosTransferencia
            )
              .slice(0, 25)
              .map(([id, data]) => {

                const role =
                  interaction.guild.roles.cache.get(id);


                return {

                  label:
                    String(
                      role?.name ||
                      data?.nome ||
                      'Cargo não definido'
                    ).substring(0, 100),

                  value:
                    String(id)
                };
              });


          if (
            opcoesCargo.length === 0
          ) {

            return interaction.update({

              content:
                '❌ Nenhum cargo de transferência está configurado.',

              components:
                []
            });
          }


          const selectCargoT =
            new ActionRowBuilder().addComponents(

              new StringSelectMenuBuilder()

                .setCustomId(
                  'transf_select_cargo'
                )

                .setPlaceholder(
                  'Selecione o cargo desejado'
                )

                .addOptions(
                  opcoesCargo
                )
            );


          return interaction.update({

            content:

              `🏢 **Instituição de origem:** ${
                nomeInstituicao ||
                'Desconhecida'
              }\n\n` +

              `🏷️ **Selecione agora o cargo desejado:**`,

            components:
              [selectCargoT]
          });
        }


        // ========================================================
        // TRANSFERÊNCIA — CARGO
        // ========================================================

        if (
          interaction.customId ===
          'transf_select_cargo'
        ) {

          const cargoID =
            String(
              interaction.values[0]
            ).trim();


          dados.cargoDesejado =
            cargoID;


          console.log('');
          console.log(
            '========================================'
          );
          console.log(
            '🏷️ CARGO DESEJADO'
          );
          console.log(
            'ID:',
            cargoID
          );


          const cargoConfig =
            config.cargosTransferencia?.[
              cargoID
            ];


          console.log(
            'Config:',
            cargoConfig
          );


          console.log(
            '========================================'
          );


          if (!cargoConfig) {

            console.error(
              '❌ CARGO NÃO EXISTE EM cargosTransferencia'
            );


            return interaction.reply({

              content:

                `❌ O cargo selecionado não está configurado.\n\n` +

                `ID recebido: \`${cargoID}\``,

              flags:
                64
            });
          }


          const role =
            interaction.guild.roles.cache.get(
              cargoID
            );


          console.log(
            'Cargo encontrado no Discord:',
            role
              ? `${role.name} (${role.id})`
              : 'NÃO ENCONTRADO'
          );


          if (!role) {

            return interaction.reply({

              content:

                `❌ O cargo está no config.json, mas não existe neste servidor.\n\n` +

                `ID: \`${cargoID}\`\n` +

                `Configuração: **${cargoConfig.nome}**`,

              flags:
                64
            });
          }


          // ======================================================
          // MODAL TRANSFERÊNCIA
          // ======================================================

          const modal =
            new ModalBuilder()

              .setCustomId(
                'transf_modal_dados'
              )

              .setTitle(
                '📝 Dados do Transferido'
              );


          modal.addComponents(

            new ActionRowBuilder().addComponents(

              new TextInputBuilder()

                .setCustomId(
                  'nome'
                )

                .setLabel(
                  'Nome'
                )

                .setStyle(
                  TextInputStyle.Short
                )

                .setRequired(true)
            ),


            new ActionRowBuilder().addComponents(

              new TextInputBuilder()

                .setCustomId(
                  'sobrenome'
                )

                .setLabel(
                  'Sobrenome'
                )

                .setStyle(
                  TextInputStyle.Short
                )

                .setRequired(true)
            ),


            new ActionRowBuilder().addComponents(

              new TextInputBuilder()

                .setCustomId(
                  'id'
                )

                .setLabel(
                  'ID (somente números)'
                )

                .setStyle(
                  TextInputStyle.Short
                )

                .setRequired(true)
            ),


            new ActionRowBuilder().addComponents(

              new TextInputBuilder()

                .setCustomId(
                  'telefone'
                )

                .setLabel(
                  'Telefone (in-game)'
                )

                .setStyle(
                  TextInputStyle.Short
                )

                .setRequired(true
                )
            )
          );


          return interaction.showModal(
            modal
          );
        }
      }


      // ============================================================
      // MODAL — TRANSFERÊNCIA
      // ============================================================

      if (
        interaction.isModalSubmit() &&
        interaction.customId ===
          'transf_modal_dados'
      ) {

        const dados =
          dadosTemp[
            interaction.user.id
          ];


        if (!dados) {

          return interaction.reply({

            content:
              '❌ Dados expirados. Inicie novamente.',

            flags:
              64
          });
        }


        const nome =
          interaction.fields
            .getTextInputValue(
              'nome'
            )
            .trim();


        const sobrenome =
          interaction.fields
            .getTextInputValue(
              'sobrenome'
            )
            .trim();


        const id =
          interaction.fields
            .getTextInputValue(
              'id'
            )
            .trim();


        const telefone =
          interaction.fields
            .getTextInputValue(
              'telefone'
            )
            .trim();


        if (
          !/^\d+$/.test(id)
        ) {

          return interaction.reply({

            content:
              '❌ ID inválido! Digite somente números.',

            flags:
              64
          });
        }


        // ========================================================
        // CARGO
        // ========================================================

        const cargoConfig =
          config.cargosTransferencia?.[
            dados.cargoDesejado
          ];


        if (!cargoConfig) {

          return interaction.reply({

            content:

              `❌ Cargo de transferência não configurado.\n\n` +

              `ID: \`${dados.cargoDesejado}\``,

            flags:
              64
          });
        }


        const roleDesejada =
          interaction.guild.roles.cache.get(
            dados.cargoDesejado
          );


        if (!roleDesejada) {

          return interaction.reply({

            content:

              `❌ O cargo não existe no servidor.\n\n` +

              `ID: \`${dados.cargoDesejado}\`\n` +

              `Configuração: **${cargoConfig.nome}**`,

            flags:
              64
          });
        }


        // ========================================================
        // ORIGEM
        // ========================================================

        const origemConfig =
          config.instituicoesOrigem?.[
            dados.origemBatalhaoID
          ];


        const nomeOrigem =
          typeof origemConfig === 'object'
            ? origemConfig.nome
            : origemConfig;


        const prefixoOrigem =
          typeof origemConfig === 'object'
            ? origemConfig.prefixo
            : null;


        // Compatibilidade com config antiga
        const mapaSiglas = {

          '1554288806167846952':
            'TR.PRF',

          '1554288699745771701':
            'TR.PM',

          '1554288753672065084':
            'TR.PC',

          '1554288869917065236':
            'TR.EB'
        };


        const prefixo =
          prefixoOrigem ||
          mapaSiglas[
            dados.origemBatalhaoID
          ] ||
          'TR';


        // ========================================================
        // CANAL
        // ========================================================

        let nomeCanal =
          `transf-${nome}-${sobrenome}`
            .replace(
              /[^a-zA-Z0-9-]/g,
              ''
            )
            .toLowerCase();


        if (
          nomeCanal.length > 90
        ) {

          nomeCanal =
            nomeCanal.substring(
              0,
              90
            );
        }


        const canal =
          await interaction.guild.channels.create({

            name:
              nomeCanal,

            topic:
              interaction.user.id,

            type:
              ChannelType.GuildText,

            parent:
              config.categoriaTickets,

            permissionOverwrites: [

              {
                id:
                  interaction.guild.id,

                deny: [
                  PermissionsBitField.Flags.ViewChannel
                ]
              },

              {
                id:
                  interaction.user.id,

                allow: [

                  PermissionsBitField.Flags.ViewChannel,

                  PermissionsBitField.Flags.SendMessages,

                  PermissionsBitField.Flags.ReadMessageHistory
                ]
              },

              {
                id:
                  interaction.client.user.id,

                allow: [

                  PermissionsBitField.Flags.ViewChannel,

                  PermissionsBitField.Flags.SendMessages,

                  PermissionsBitField.Flags.ReadMessageHistory
                ]
              },

              ...(config.cargosRecrutadores || [])
                .map(cargoID => ({

                  id:
                    cargoID,

                  allow: [

                    PermissionsBitField.Flags.ViewChannel,

                    PermissionsBitField.Flags.SendMessages,

                    PermissionsBitField.Flags.ReadMessageHistory
                  ]
                }))
            ]
          });


        // ========================================================
        // EMBED
        // ========================================================

        const embed =
          new EmbedBuilder()

            .setTitle(
              '🔄 Nova Solicitação de Transferência'
            )

            .setColor(
              0x3498db
            )

            .addFields(

              {
                name:
                  '👤 Nome',

                value:
                  nome
              },

              {
                name:
                  '👤 Sobrenome',

                value:
                  sobrenome
              },

              {
                name:
                  '🆔 ID',

                value:
                  id
              },

              {
                name:
                  '📱 Telefone',

                value:
                  telefone
              },

              {
                name:
                  '🏢 Instituição de Origem',

                value:
                  `<@&${dados.origemBatalhaoID}>`
              },

              {
                name:
                  '🏢 ID Origem',

                value:
                  dados.origemBatalhaoID
              },

              {
                name:
                  '🏷️ Cargo Desejado',

                value:
                  roleDesejada.name
              },

              {
                name:
                  '🏷️ ID Cargo',

                value:
                  dados.cargoDesejado
              }
            )

            .setFooter({

              text:
                `Origem: ${
                  nomeOrigem ||
                  'Desconhecida'
                }`
            })

            .setTimestamp();


        // ========================================================
        // BOTÕES DA TRANSFERÊNCIA
        // ========================================================

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
                'reprovarTransf'
              )

              .setLabel(
                'Reprovar'
              )

              .setStyle(
                ButtonStyle.Danger
              )
          );


        await canal.send({

          embeds:
            [embed],

          components:
            [botoes]
        });


        delete dadosTemp[
          interaction.user.id
        ];


        return interaction.reply({

          content:

            `✅ Canal de transferência criado!\n\n` +

            `🏢 Origem: **${
              nomeOrigem ||
              'Desconhecida'
            }**\n` +

            `🏷️ Cargo: **${
              roleDesejada.name
            }**`,

          flags:
            64
        });
      }


      // ============================================================
      // APROVAR REGISTRO NORMAL
      // ============================================================
      //
      // IMPORTANTE:
      // Usamos startsWith('aprovar_')
      // e NÃO startsWith('aprovar')
      //
      // Isso impede que o botão:
      // aprovarTransf-XXXXXXXX
      //
      // entre neste bloco.
      // ============================================================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          'aprovar_'
        )
      ) {

        const temPermissao =
          interaction.member.roles.cache.some(
            role =>
              (
                config.cargosRecrutadores ||
                []
              ).includes(
                role.id
              )
          );


        if (!temPermissao) {

          return interaction.reply({

            content:
              '❌ Sem permissão.',

            flags:
              64
          });
        }


        const cargoEscolhido =
          interaction.customId
            .replace(
              'aprovar_',
              ''
            )
            .trim();


        const membro =
          await interaction.guild.members
            .fetch(
              interaction.channel.topic
            )
            .catch(
              () => null
            );


        if (!membro) {

          return interaction.reply({

            content:
              '❌ Membro do ticket não encontrado.',

            flags:
              64
          });
        }


        const embed =
          interaction.message.embeds[0];


        if (!embed) {

          return interaction.reply({

            content:
              '❌ Ficha de registro não encontrada.',

            flags:
              64
          });
        }


        const getField =
          nomeCampo =>
            embed.data?.fields?.find(
              field =>
                field.name ===
                nomeCampo
            )?.value || '';


        const id =
          getField('ID');

        const nome =
          getField('Nome');

        const sobrenome =
          getField('Sobrenome');

        const telefone =
          getField('Telefone');


        const sistema =
          config.cargosSistema?.[
            cargoEscolhido
          ];


        if (!sistema) {

          return interaction.reply({

            content:
              `❌ Cargo não configurado.\n\nID: \`${cargoEscolhido}\``,

            flags:
              64
          });
        }


        const rolePrincipal =
          interaction.guild.roles.cache.get(
            cargoEscolhido
          );


        if (!rolePrincipal) {

          return interaction.reply({

            content:
              `❌ Cargo não encontrado no servidor.\n\nID: \`${cargoEscolhido}\``,

            flags:
              64
          });
        }


        let nickname =
          `[${sistema.nome}] ${nome} | ${id}`;


        if (
          nickname.length > 32
        ) {

          nickname =
            nickname.substring(
              0,
              32
            );
        }


        await membro
          .setNickname(
            nickname
          )
          .catch(
            err =>
              console.error(
                '❌ Erro no nickname:',
                err.message
              )
          );


        const cargos = [

          cargoEscolhido,

          ...(Array.isArray(
            sistema.extra
          )
            ? sistema.extra
            : [])
        ];


        try {

          await membro.roles.add(
            cargos
          );

        } catch (erro) {

          console.error(
            '❌ Erro ao adicionar cargos:',
            erro
          );


          return interaction.reply({

            content:
              '❌ Não foi possível adicionar os cargos. Verifique a hierarquia do bot.',

            flags:
              64
          });
        }


        // ========================================================
        // REGISTRO CENTRAL
        // ========================================================

        const canalRegistro =
          interaction.guild.channels.cache.get(
            '1554307411202805821'
          );


        if (
          canalRegistro &&
          typeof canalRegistro.send ===
            'function'
        ) {

          await canalRegistro.send(

            `📜 **Registro**\n\n` +

            `👤 **Nome:** ${nome}\n` +

            `🆔 **Sobrenome:** ${sobrenome}\n` +

            `🆔 **ID:** ${id}\n` +

            `📞 **Telefone:** ${telefone}\n` +

            `🏷️ **Cargo:** ${sistema.nome}\n` +

            `🧑‍💼 **Aprovado por:** ${interaction.member.displayName}\n\n` +

            `| ----------------------------------------------------------------|`
          );
        }


        // ========================================================
        // LOG
        // ========================================================

        const log =
          interaction.guild.channels.cache.get(
            config.logAprovacoes
          );


        if (
          log &&
          typeof log.send ===
            'function'
        ) {

          await log.send(

            `✅ ${membro.user.tag} aprovado por ${interaction.user.tag}\n` +

            `Cargo: ${sistema.nome}\n` +

            `Apelido: ${nickname}`
          );
        }


        await interaction.update({

          content:
            '✅ Aprovado!',

          components:
            []
        });


        setTimeout(
          () =>
            interaction.channel
              .delete()
              .catch(
                () => {}
              ),
          5000
        );


        return;
      }


      // ============================================================
      // REPROVAR REGISTRO NORMAL
      // ============================================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          'reprovar'
      ) {

        const temPermissao =
          interaction.member.roles.cache.some(
            role =>
              (
                config.cargosRecrutadores ||
                []
              ).includes(
                role.id
              )
          );


        if (!temPermissao) {

          return interaction.reply({

            content:
              '❌ Sem permissão.',

            flags:
              64
          });
        }


        await interaction.update({

          content:
            '❌ Reprovado!',

          components:
            []
        });


        setTimeout(
          () =>
            interaction.channel
              .delete()
              .catch(
                () => {}
              ),
          5000
        );


        return;
      }


      // ============================================================
   // ============================================================
// APROVAR TRANSFERÊNCIA
// ============================================================

if (
  interaction.isButton() &&
  interaction.customId.startsWith('aprovarTransf-')
) {

  // ============================================================
  // RECONHECER A INTERAÇÃO IMEDIATAMENTE
  // ============================================================

  await interaction.deferUpdate();

  try {

    console.log('');
    console.log('==========================================');
    console.log('🔄 APROVAÇÃO DE TRANSFERÊNCIA');
    console.log('==========================================');

    // ============================================================
    // PERMISSÃO
    // ============================================================

    const temPermissao =
      interaction.member.roles.cache.some(
        role =>
          (config.cargosRecrutadores || []).includes(
            role.id
          )
      );

    console.log(
      '👮 Permissão:',
      temPermissao ? 'OK' : 'NEGADA'
    );

    if (!temPermissao) {

      return interaction.followUp({
        content:
          '❌ Você não possui permissão para aprovar transferências.',
        flags: 64
      });

    }

    // ============================================================
    // ID DO CARGO
    // ============================================================

    const cargoId =
      interaction.customId
        .replace('aprovarTransf-', '')
        .trim();

    console.log(
      '🔘 CustomID:',
      interaction.customId
    );

    console.log(
      '🎖️ Cargo recebido:',
      cargoId
    );

    // ============================================================
    // CONFIGURAÇÃO DO CARGO
    // ============================================================

    const sistemaT =
      config.cargosTransferencia?.[cargoId];

    console.log(
      '⚙️ Configuração encontrada:',
      sistemaT
    );

    if (!sistemaT) {

      console.error(
        '❌ Cargo não configurado:',
        cargoId
      );

      console.error(
        'IDs disponíveis:',
        Object.keys(
          config.cargosTransferencia || {}
        )
      );

      return interaction.followUp({
        content:
          `❌ **Cargo de transferência não configurado.**\n\n` +
          `ID recebido:\n` +
          `\`${cargoId}\``,
        flags: 64
      });

    }

    // ============================================================
    // ROLE DO DISCORD
    // ============================================================

    const rolePrincipal =
      interaction.guild.roles.cache.get(
        cargoId
      );

    console.log(
      '🎖️ Cargo encontrado no Discord:',
      rolePrincipal
        ? `${rolePrincipal.name} (${rolePrincipal.id})`
        : 'NÃO ENCONTRADO'
    );

    if (!rolePrincipal) {

      return interaction.followUp({
        content:
          `❌ O cargo está configurado, mas não existe no servidor.\n\n` +
          `ID: \`${cargoId}\`\n` +
          `Configuração: **${sistemaT.nome}**`,
        flags: 64
      });

    }

    // ============================================================
    // MEMBRO DONO DO TICKET
    // ============================================================

    const memberId =
      interaction.channel.topic?.trim();

    console.log(
      '🆔 ID encontrado no topic:',
      memberId
    );

    if (!memberId) {

      return interaction.followUp({
        content:
          '❌ O ticket não possui o ID do membro no topic.',
        flags: 64
      });

    }

    let membro = null;

    try {

      membro =
        await interaction.guild.members.fetch(
          memberId
        );

    } catch (erro) {

      console.error(
        '❌ Erro ao buscar membro:',
        erro
      );

      return interaction.followUp({
        content:
          '❌ Membro dono do ticket não encontrado no servidor.',
        flags: 64
      });

    }

    console.log(
      '👤 Membro encontrado:',
      membro.user.tag,
      `(${membro.id})`
    );

    // ============================================================
    // EMBED DA TRANSFERÊNCIA
    // ============================================================

    const embed =
      interaction.message.embeds?.[0];

    if (!embed) {

      return interaction.followUp({
        content:
          '❌ Ficha de transferência não encontrada.',
        flags: 64
      });

    }

    // ============================================================
    // FUNÇÃO PARA PEGAR CAMPO
    // ============================================================

    const getField =
      nomeCampo => {

        const field =
          embed.data?.fields?.find(
            field =>
              field.name === nomeCampo
          );

        return field?.value || '';

      };

    // ============================================================
    // DADOS DA TRANSFERÊNCIA
    // ============================================================

    const nome =
      getField('👤 Nome');

    const sobrenome =
      getField('👤 Sobrenome');

    const id =
      getField('🆔 ID');

    const telefone =
      getField('📱 Telefone');

    const origemID =
      getField('🏢 ID Origem');

    console.log('');
    console.log('========== DADOS DA TRANSFERÊNCIA ==========');
    console.log('👤 Nome:', nome);
    console.log('👤 Sobrenome:', sobrenome);
    console.log('🆔 ID:', id);
    console.log('📱 Telefone:', telefone);
    console.log('🏢 Origem ID:', origemID);
    console.log('============================================');

    // ============================================================
    // ORIGEM
    // ============================================================

    const origemConfig =
      config.instituicoesOrigem?.[
        String(origemID).trim()
      ];

    let origemNome =
      'Desconhecida';

    if (
      typeof origemConfig === 'string'
    ) {

      origemNome =
        origemConfig;

    } else if (
      origemConfig &&
      typeof origemConfig === 'object'
    ) {

      origemNome =
        origemConfig.nome ||
        'Desconhecida';

    }

    // ============================================================
    // SIGLA DA ORIGEM
    // ============================================================

    const mapaSiglas = {

      '1554288806167846952':
        'TR.PRF',

      '1554288699745771701':
        'TR.PM',

      '1554288753672065084':
        'TR.PC',

      '1554288869917065236':
        'TR.EB'

    };

    let sigla =
      mapaSiglas[
        String(origemID).trim()
      ];

    if (
      !sigla &&
      origemConfig &&
      typeof origemConfig === 'object'
    ) {

      sigla =
        origemConfig.prefixo ||
        origemConfig.sigla;

    }

    if (!sigla) {

      sigla =
        'TR';

    }

    console.log(
      '🏢 Origem:',
      origemNome
    );

    console.log(
      '🏷️ Prefixo:',
      sigla
    );

    // ============================================================
    // NICKNAME
    // ============================================================

    let nickname =
      `[${sigla}] ${sobrenome} | ${id}`;

    // Discord permite no máximo 32 caracteres
    if (
      nickname.length > 32
    ) {

      nickname =
        nickname.substring(
          0,
          32
        );

    }

    console.log(
      '👤 Novo apelido:',
      nickname
    );

    // ============================================================
    // CARGOS
    // ============================================================

    const cargosIDs = [
      cargoId,
      ...(Array.isArray(sistemaT.extra)
        ? sistemaT.extra
        : [])
    ];

    console.log(
      '🎖️ CARGOS A ADICIONAR:',
      cargosIDs
    );

    // ============================================================
    // VALIDAR CARGOS
    // ============================================================

    const cargosValidos = [];

    for (
      const cargoID of cargosIDs
    ) {

      const cargo =
        interaction.guild.roles.cache.get(
          String(cargoID)
        );

      if (!cargo) {

        console.error(
          `❌ Cargo não encontrado: ${cargoID}`
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

      return interaction.followUp({
        content:
          '❌ Nenhum cargo válido foi encontrado para esta transferência.',
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

    // ============================================================
    // MEMBRO DO BOT
    // ============================================================

    let botMember =
      interaction.guild.members.me;

    if (!botMember) {

      try {

        botMember =
          await interaction.guild.members.fetchMe();

      } catch (erro) {

        console.error(
          '❌ Não foi possível obter o membro do bot:',
          erro
        );

        return interaction.followUp({
          content:
            '❌ Não consegui identificar o bot no servidor.',
          flags: 64
        });

      }

    }

    // ============================================================
    // HIERARQUIA
    // ============================================================

    const cargosBloqueados =
      cargosValidos.filter(
        cargo =>
          cargo.position >=
          botMember.roles.highest.position
      );

    if (
      cargosBloqueados.length > 0
    ) {

      console.error(
        '❌ Cargos bloqueados pela hierarquia:',
        cargosBloqueados.map(
          cargo =>
            `${cargo.name} (${cargo.id})`
        )
      );

      return interaction.followUp({
        content:

          `❌ Não consigo adicionar os seguintes cargos porque estão acima ou no mesmo nível do meu cargo:\n\n` +

          cargosBloqueados
            .map(
              cargo =>
                `• ${cargo.name}`
            )
            .join('\n'),

        flags: 64
      });

    }

    // ============================================================
    // ADICIONAR CARGOS
    // ============================================================

    try {

      console.log(
        '🔄 Adicionando cargos ao membro...'
      );

      await membro.roles.add(
        cargosValidos,
        'Transferência aprovada'
      );

      console.log(
        '✅ TODOS OS CARGOS FORAM ADICIONADOS!'
      );

    } catch (erro) {

      console.error(
        '❌ ERRO AO ADICIONAR CARGOS:',
        erro
      );

      return interaction.followUp({
        content:

          `❌ O Discord recusou a adição dos cargos.\n\n` +

          `Verifique:\n` +
          `• Permissão **Gerenciar Cargos**\n` +
          `• Hierarquia do bot\n` +
          `• Se os cargos estão abaixo do cargo mais alto do bot\n\n` +
          `Erro: \`${erro.message}\``,

        flags: 64
      });

    }

    // ============================================================
    // ALTERAR NICKNAME
    // ============================================================

    try {

      await membro.setNickname(
        nickname,
        'Transferência aprovada'
      );

      console.log(
        '✅ Apelido alterado!'
      );

    } catch (erro) {

      console.error(
        '⚠️ Erro ao alterar apelido:',
        erro.message
      );

      // Não interrompe a transferência.
      // Os cargos já foram aplicados.

    }

    // ============================================================
    // REGISTRO CENTRAL
    // ============================================================

    const canalRegistro =
      interaction.guild.channels.cache.get(
        '1554307411202805821'
      );

    if (
      canalRegistro &&
      typeof canalRegistro.send === 'function'
    ) {

      try {

        await canalRegistro.send(

          `🔄 **Registro de Transferência**\n\n` +

          `👤 **Nome:** ${nome} ${sobrenome}\n` +

          `🆔 **ID:** ${id}\n` +

          `📱 **Telefone:** ${telefone}\n` +

          `🏢 **Origem:** ${origemNome}\n` +

          `🏷️ **Cargo Concedido:** ${rolePrincipal.name}\n` +

          `🏷️ **Identificação:** ${sistemaT.nome}\n` +

          `🧑‍💼 **Processado por:** ${interaction.member.displayName}`

        );

        console.log(
          '✅ Registro central enviado.'
        );

      } catch (erro) {

        console.error(
          '⚠️ Erro ao enviar registro central:',
          erro
        );

      }

    } else {

      console.warn(
        '⚠️ Canal de registro central não encontrado.'
      );

    }

    // ============================================================
    // LOG DE APROVAÇÃO
    // ============================================================

    const log =
      config.logAprovacoes
        ? interaction.guild.channels.cache.get(
            config.logAprovacoes
          )
        : null;

    if (
      log &&
      typeof log.send === 'function'
    ) {

      try {

        await log.send(

          `🔄 **Transferência aprovada**\n\n` +

          `👤 ${membro.user.tag}\n` +

          `🆔 ID: ${id}\n` +

          `🏢 Origem: ${origemNome}\n` +

          `🏷️ Cargo: ${rolePrincipal.name}\n` +

          `🏷️ Identificação: ${sistemaT.nome}\n` +

          `👤 Apelido: ${nickname}\n` +

          `🧑‍💼 Processado por: ${interaction.user.tag}`

        );

        console.log(
          '✅ Log de aprovação enviado.'
        );

      } catch (erro) {

        console.error(
          '⚠️ Erro ao enviar log:',
          erro
        );

      }

    }

    // ============================================================
    // FINALIZAR TICKET
    // ============================================================

    // ATENÇÃO:
    // Como usamos deferUpdate() no começo,
    // NÃO usamos interaction.update() aqui.
    // Editamos diretamente a mensagem.

    await interaction.message.edit({

      content:

        `✅ **TRANSFERÊNCIA APROVADA!**\n\n` +

        `👤 **${nome} ${sobrenome}**\n` +

        `🆔 **ID:** ${id}\n` +

        `🏢 **Origem:** ${origemNome}\n` +

        `🏷️ **Cargo:** ${rolePrincipal.name}\n` +

        `👤 **Apelido:** ${nickname}`,

      components: []

    });

    console.log(
      '✅ Mensagem de aprovação atualizada.'
    );

    console.log(
      '=========================================='
    );

    console.log(
      '✅ TRANSFERÊNCIA CONCLUÍDA COM SUCESSO'
    );

    console.log(
      '=========================================='
    );

    // ============================================================
    // APAGAR TICKET
    // ============================================================

    setTimeout(
      () => {

        interaction.channel
          .delete()
          .catch(
            erro =>
              console.error(
                '⚠️ Erro ao deletar ticket:',
                erro
              )
          );

      },
      5000
    );

    return;

  } catch (err) {

    console.error('');
    console.error(
      '=========================================='
    );
    console.error(
      '💥 ERRO DETALHADO NA TRANSFERÊNCIA'
    );
    console.error(
      '=========================================='
    );
    console.error(err);
    console.error(
      '=========================================='
    );

    // Como o deferUpdate() já foi executado,
    // NÃO podemos usar interaction.reply().
    await interaction.followUp({
      content:
        `❌ **Erro ao processar a transferência.**\n\n` +
        `\`${err.message || err}\``,
      flags: 64
    }).catch(
      () => {}
    );

  }

  return;
}


// ============================================================
// REPROVAR TRANSFERÊNCIA
// ============================================================

if (
  interaction.isButton() &&
  interaction.customId === 'reprovarTransf'
) {

  try {

    console.log('');
    console.log(
      '=========================================='
    );
    console.log(
      '❌ REPROVAÇÃO DE TRANSFERÊNCIA'
    );
    console.log(
      '=========================================='
    );

    // ============================================================
    // PERMISSÃO
    // ============================================================

    const temPermissao =
      interaction.member.roles.cache.some(
        role =>
          (config.cargosRecrutadores || [])
            .includes(role.id)
      );

    if (!temPermissao) {

      return interaction.reply({
        content:
          '❌ Você não possui permissão para reprovar transferências.',
        flags: 64
      });

    }

    // ============================================================
    // ATUALIZAR MENSAGEM
    // ============================================================

    await interaction.update({

      content:
        '❌ **TRANSFERÊNCIA REPROVADA!**',

      components: []

    });

    console.log(
      '✅ Transferência reprovada.'
    );

    // ============================================================
    // APAGAR TICKET
    // ============================================================

    setTimeout(
      () => {

        interaction.channel
          .delete()
          .catch(
            () => {}
          );

      },
      5000
    );

    return;

  } catch (err) {

    console.error(
      '❌ Erro ao reprovar transferência:',
      err
    );

    if (
      !interaction.replied &&
      !interaction.deferred
    ) {

      await interaction.reply({
        content:
          `❌ Erro ao reprovar transferência: ${err.message}`,
        flags: 64
      }).catch(
        () => {}
      );

    }

    return;

  }

}
