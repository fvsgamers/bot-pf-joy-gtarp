const { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('registro')
    .setDescription('Abrir painel de recrutamento'),

  async execute(interaction) {

    // IDs dos cargos que PODEM usar o comando
    const cargosPermitidos = [
      '1516662107599409196',
      '1516662107599409195',
      '1516662107586953233',
      '1516662107586953232'
    ];

    const membro = interaction.member;

    // Verifica se o usuário tem algum dos cargos
    const temPermissao = membro.roles.cache.some(role => 
      cargosPermitidos.includes(role.id)
    );

    if (!temPermissao) {
      return interaction.reply({
        content: '❌ Você não tem permissão para usar este comando.',
        ephemeral: true
      });
    }

    const botoesInicio = new ActionRowBuilder().addComponents(
      
      new ButtonBuilder()
        .setCustomId('abrir_formulario')
        .setLabel('📋 Iniciar Registro')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId('abrir_transferencia')
        .setLabel('📋 Iniciar Transferência')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      content: 'Escolha uma opção abaixo:',
      components: [botoesInicio]
    });
  }
};
